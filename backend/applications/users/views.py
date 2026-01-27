"""
User Views for API
"""
import pyotp
import qrcode
import base64
from io import BytesIO
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from .models import User, UserActivity
from .serializers import UserSerializer, UserCreateSerializer, UserActivitySerializer


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for User management"""
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'register']:
            return UserCreateSerializer
        return UserSerializer

    def get_permissions(self):
        if self.action == 'register':
            return [permissions.AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny])
    def register(self, request):
        """Public user registration endpoint"""
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'message': 'Registration successful'
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def get_queryset(self):
        queryset = User.objects.all()
        role = self.request.query_params.get('role')
        department = self.request.query_params.get('department')
        is_available = self.request.query_params.get('is_available')

        if role:
            queryset = queryset.filter(role=role)
        if department:
            queryset = queryset.filter(department__icontains=department)
        if is_available is not None:
            queryset = queryset.filter(is_available=is_available.lower() == 'true')

        return queryset

    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get current user profile"""
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Update current user's profile"""
        serializer = UserSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def change_password(self, request):
        """Change current user's password"""
        user = request.user
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')

        if not current_password or not new_password:
            return Response(
                {'error': 'Both current_password and new_password are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(current_password):
            return Response(
                {'error': 'Current password is incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if len(new_password) < 8:
            return Response(
                {'error': 'New password must be at least 8 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(new_password)
        user.save()
        return Response({'message': 'Password changed successfully'})

    @action(detail=False, methods=['get'])
    def available_underwriters(self, request):
        """Get list of available underwriters for assignment"""
        underwriters = User.objects.filter(
            role__in=[User.Role.SENIOR_UNDERWRITER, User.Role.UNDERWRITER],
            is_available=True,
            is_active=True
        )
        serializer = UserSerializer(underwriters, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_availability(self, request, pk=None):
        """Toggle user availability status"""
        user = self.get_object()
        user.is_available = not user.is_available
        user.save()
        return Response({'is_available': user.is_available})

    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload_profile_picture(self, request):
        """Upload profile picture for current user"""
        user = request.user
        if 'profile_picture' not in request.FILES:
            return Response(
                {'error': 'No image file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file = request.FILES['profile_picture']

        # Validate file size (5MB max)
        if file.size > 5 * 1024 * 1024:
            return Response(
                {'error': 'File size must be less than 5MB'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if file.content_type not in allowed_types:
            return Response(
                {'error': 'File must be an image (JPEG, PNG, GIF, or WebP)'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Delete old profile picture if exists
        if user.profile_picture:
            user.profile_picture.delete(save=False)

        user.profile_picture = file
        user.save()

        serializer = UserSerializer(user, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def setup_mfa(self, request):
        """Generate MFA secret and QR code for setup"""
        user = request.user

        # Generate new secret
        secret = pyotp.random_base32()
        user.mfa_secret = secret
        user.save()

        # Create TOTP object
        totp = pyotp.TOTP(secret)

        # Generate provisioning URI for authenticator apps
        provisioning_uri = totp.provisioning_uri(
            name=user.email or user.username,
            issuer_name="Mortgage Underwriter"
        )

        # Generate QR code
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(provisioning_uri)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")

        # Convert to base64
        buffer = BytesIO()
        img.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()

        return Response({
            'secret': secret,
            'qr_code': f'data:image/png;base64,{qr_base64}',
            'provisioning_uri': provisioning_uri
        })

    @action(detail=False, methods=['post'])
    def verify_mfa(self, request):
        """Verify MFA code and enable 2FA"""
        user = request.user
        code = request.data.get('code')

        if not code:
            return Response(
                {'error': 'Verification code is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.mfa_secret:
            return Response(
                {'error': 'MFA not set up. Please call setup_mfa first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        totp = pyotp.TOTP(user.mfa_secret)
        if totp.verify(code):
            user.mfa_enabled = True
            user.save()
            return Response({'message': 'MFA enabled successfully', 'mfa_enabled': True})
        else:
            return Response(
                {'error': 'Invalid verification code'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def disable_mfa(self, request):
        """Disable MFA for current user"""
        user = request.user
        password = request.data.get('password')

        if not password:
            return Response(
                {'error': 'Password is required to disable MFA'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user.check_password(password):
            return Response(
                {'error': 'Invalid password'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user.mfa_enabled = False
        user.mfa_secret = None
        user.save()
        return Response({'message': 'MFA disabled successfully', 'mfa_enabled': False})

    @action(detail=False, methods=['post'])
    def save_notification_preferences(self, request):
        """Save user notification preferences"""
        user = request.user
        preferences = request.data.get('preferences', {})

        user.notification_preferences = preferences
        user.save()

        return Response({
            'message': 'Notification preferences saved',
            'notification_preferences': user.notification_preferences
        })


class UserActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing user activities"""
    queryset = UserActivity.objects.all()
    serializer_class = UserActivitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['user', 'action', 'resource_type']

    def get_queryset(self):
        queryset = UserActivity.objects.all()

        # Filter by user if specified
        user_id = self.request.query_params.get('user_id')
        if user_id:
            queryset = queryset.filter(user_id=user_id)

        # Filter by date range
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')
        if start_date:
            queryset = queryset.filter(timestamp__gte=start_date)
        if end_date:
            queryset = queryset.filter(timestamp__lte=end_date)

        return queryset

    @action(detail=False, methods=['get'])
    def my_activity(self, request):
        """Get current user's activity"""
        activities = UserActivity.objects.filter(user=request.user)[:100]
        serializer = UserActivitySerializer(activities, many=True)
        return Response(serializer.data)

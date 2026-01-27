"""
User Views for API
"""
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.utils import timezone
from .models import User, UserActivity
from .serializers import UserSerializer, UserCreateSerializer, UserActivitySerializer


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for User management"""
    queryset = User.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        return UserSerializer

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

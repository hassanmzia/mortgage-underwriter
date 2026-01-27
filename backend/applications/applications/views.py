"""
Loan Application Views
"""
from decimal import Decimal
from django.db.models import Sum, Avg, Count, F
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter

from .models import (
    LoanApplication, Borrower, CreditProfile, Employment,
    Asset, Liability, Property, LargeDeposit, Document
)
from .serializers import (
    LoanApplicationListSerializer, LoanApplicationDetailSerializer,
    LoanApplicationCreateSerializer, BorrowerSerializer, BorrowerCreateSerializer,
    CreditProfileSerializer, EmploymentSerializer, AssetSerializer,
    LiabilitySerializer, PropertySerializer, LargeDepositSerializer,
    DocumentSerializer, DTICalculationSerializer, LTVCalculationSerializer,
    ApplicationSummarySerializer
)


class LoanApplicationViewSet(viewsets.ModelViewSet):
    """ViewSet for Loan Applications"""
    queryset = LoanApplication.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['status', 'loan_type', 'loan_purpose', 'assigned_underwriter']
    search_fields = ['case_id', 'borrowers__first_name', 'borrowers__last_name']
    ordering_fields = ['created_at', 'loan_amount', 'status', 'ai_risk_score']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'list':
            return LoanApplicationListSerializer
        elif self.action == 'create':
            return LoanApplicationCreateSerializer
        return LoanApplicationDetailSerializer

    def get_queryset(self):
        queryset = LoanApplication.objects.select_related(
            'assigned_underwriter', 'processor', 'property'
        ).prefetch_related('borrowers', 'documents')

        # Filter by status groups
        status_group = self.request.query_params.get('status_group')
        if status_group == 'pending':
            queryset = queryset.filter(
                status__in=['submitted', 'in_review', 'processing', 'underwriting']
            )
        elif status_group == 'completed':
            queryset = queryset.filter(
                status__in=['approved', 'denied', 'conditional', 'closed']
            )

        # Filter by requires human review
        needs_review = self.request.query_params.get('needs_review')
        if needs_review == 'true':
            queryset = queryset.filter(
                requires_human_review=True,
                human_review_completed=False
            )

        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        application = serializer.save()

        # Log activity
        from applications.users.models import UserActivity
        UserActivity.objects.create(
            user=request.user,
            action=UserActivity.ActionType.EDIT_APPLICATION,
            resource_type='LoanApplication',
            resource_id=application.id,
            details={'action': 'created'}
        )

        # Return detailed response with id
        response_serializer = LoanApplicationDetailSerializer(application)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)

    def destroy(self, request, *args, **kwargs):
        application = self.get_object()
        if application.status not in ('draft', 'withdrawn'):
            return Response(
                {'error': 'Only draft or withdrawn applications can be deleted'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Log activity
        from applications.users.models import UserActivity
        UserActivity.objects.create(
            user=request.user,
            action=UserActivity.ActionType.EDIT_APPLICATION,
            resource_type='LoanApplication',
            resource_id=application.id,
            details={'action': 'deleted', 'case_id': application.case_id}
        )

        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get dashboard summary statistics"""
        queryset = self.get_queryset()

        summary_data = {
            'total_applications': queryset.count(),
            'pending_review': queryset.filter(
                status__in=['submitted', 'in_review', 'processing', 'underwriting']
            ).count(),
            'approved': queryset.filter(status='approved').count(),
            'denied': queryset.filter(status='denied').count(),
            'conditional': queryset.filter(status='conditional').count(),
            'total_loan_volume': queryset.aggregate(
                total=Sum('loan_amount')
            )['total'] or Decimal('0'),
            'average_processing_time': 0  # Calculate based on timestamps
        }

        serializer = ApplicationSummarySerializer(summary_data)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        """Submit application for underwriting"""
        application = self.get_object()
        if application.status != 'draft':
            return Response(
                {'error': 'Application has already been submitted'},
                status=status.HTTP_400_BAD_REQUEST
            )

        application.status = LoanApplication.Status.SUBMITTED
        application.submitted_at = timezone.now()
        application.save()

        # Trigger underwriting workflow
        from applications.underwriting.tasks import start_underwriting_workflow
        start_underwriting_workflow.delay(str(application.id))

        return Response({'status': 'Application submitted for underwriting'})

    @action(detail=True, methods=['post'])
    def assign_underwriter(self, request, pk=None):
        """Assign underwriter to application"""
        application = self.get_object()
        underwriter_id = request.data.get('underwriter_id')

        if not underwriter_id:
            return Response(
                {'error': 'underwriter_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from applications.users.models import User
        try:
            underwriter = User.objects.get(id=underwriter_id)
        except User.DoesNotExist:
            return Response(
                {'error': 'Underwriter not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        application.assigned_underwriter = underwriter
        application.save()

        return Response({'status': f'Assigned to {underwriter.get_full_name()}'})

    @action(detail=True, methods=['post'])
    def human_review(self, request, pk=None):
        """Submit human review decision"""
        application = self.get_object()

        decision = request.data.get('decision')
        comments = request.data.get('comments', '')

        if decision not in ['approve', 'deny', 'condition', 'defer']:
            return Response(
                {'error': 'Invalid decision'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update application based on decision
        if decision == 'approve':
            application.status = LoanApplication.Status.APPROVED
        elif decision == 'deny':
            application.status = LoanApplication.Status.DENIED
        elif decision == 'condition':
            application.status = LoanApplication.Status.CONDITIONAL

        application.human_review_completed = True
        application.decision_at = timezone.now()
        application.notes = comments
        application.save()

        # Log activity
        from applications.users.models import UserActivity
        UserActivity.objects.create(
            user=request.user,
            action=UserActivity.ActionType.OVERRIDE,
            resource_type='LoanApplication',
            resource_id=application.id,
            details={
                'decision': decision,
                'comments': comments,
                'ai_recommendation': application.ai_recommendation
            }
        )

        return Response({
            'status': f'Application {decision}ed',
            'final_status': application.status
        })

    @action(detail=False, methods=['post'])
    def calculate_dti(self, request):
        """Calculate DTI ratio"""
        serializer = DTICalculationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        total_debt = data['monthly_debts'] + data['proposed_payment']
        dti = (total_debt / data['monthly_income']) * 100

        return Response({
            'dti_ratio': round(float(dti), 2),
            'status': 'Excellent' if dti <= 36 else 'Good' if dti <= 43 else 'Acceptable' if dti <= 50 else 'High'
        })

    @action(detail=False, methods=['post'])
    def calculate_ltv(self, request):
        """Calculate LTV ratio"""
        serializer = LTVCalculationSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        ltv = (data['loan_amount'] / data['property_value']) * 100

        return Response({
            'ltv_ratio': round(float(ltv), 2),
            'status': 'Excellent' if ltv <= 80 else 'Good' if ltv <= 90 else 'Acceptable' if ltv <= 97 else 'High'
        })


class BorrowerViewSet(viewsets.ModelViewSet):
    """ViewSet for Borrowers"""
    queryset = Borrower.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['application', 'borrower_type']

    def get_serializer_class(self):
        if self.action == 'create':
            return BorrowerCreateSerializer
        return BorrowerSerializer


class CreditProfileViewSet(viewsets.ModelViewSet):
    """ViewSet for Credit Profiles"""
    queryset = CreditProfile.objects.all()
    serializer_class = CreditProfileSerializer
    permission_classes = [permissions.IsAuthenticated]


class EmploymentViewSet(viewsets.ModelViewSet):
    """ViewSet for Employments"""
    queryset = Employment.objects.all()
    serializer_class = EmploymentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['borrower', 'is_current', 'employment_type']


class AssetViewSet(viewsets.ModelViewSet):
    """ViewSet for Assets"""
    queryset = Asset.objects.all()
    serializer_class = AssetSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['borrower', 'asset_type', 'verified']


class LiabilityViewSet(viewsets.ModelViewSet):
    """ViewSet for Liabilities"""
    queryset = Liability.objects.all()
    serializer_class = LiabilitySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['borrower', 'liability_type', 'included_in_dti']


class PropertyViewSet(viewsets.ModelViewSet):
    """ViewSet for Properties"""
    queryset = Property.objects.all()
    serializer_class = PropertySerializer
    permission_classes = [permissions.IsAuthenticated]


class DocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for Documents"""
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['application', 'document_type', 'status']

    @action(detail=True, methods=['post'])
    def review(self, request, pk=None):
        """Review a document"""
        document = self.get_object()
        action = request.data.get('action')
        notes = request.data.get('notes', '')

        if action not in ['approve', 'reject']:
            return Response(
                {'error': 'Invalid action'},
                status=status.HTTP_400_BAD_REQUEST
            )

        document.status = Document.DocumentStatus.APPROVED if action == 'approve' else Document.DocumentStatus.REJECTED
        document.review_notes = notes
        document.reviewed_by = request.user
        document.reviewed_at = timezone.now()
        document.save()

        return Response({'status': f'Document {action}d'})

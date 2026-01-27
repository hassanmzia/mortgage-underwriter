"""
Compliance Views
"""
from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import BiasFlag, PIISanitizationLog, ComplianceCheck, FairLendingReport
from .serializers import (
    BiasFlagSerializer, PIISanitizationLogSerializer,
    ComplianceCheckSerializer, FairLendingReportSerializer,
    BiasResolutionSerializer, ComplianceSummarySerializer
)


class BiasFlagViewSet(viewsets.ModelViewSet):
    """ViewSet for Bias Flags"""
    queryset = BiasFlag.objects.all()
    serializer_class = BiasFlagSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['application', 'category', 'severity', 'resolved']

    def get_queryset(self):
        queryset = BiasFlag.objects.select_related('application', 'resolved_by')

        # Filter by unresolved only
        unresolved = self.request.query_params.get('unresolved')
        if unresolved == 'true':
            queryset = queryset.filter(resolved=False)

        # Filter by severity
        min_severity = self.request.query_params.get('min_severity')
        if min_severity:
            severity_order = ['low', 'medium', 'high', 'critical']
            if min_severity in severity_order:
                allowed = severity_order[severity_order.index(min_severity):]
                queryset = queryset.filter(severity__in=allowed)

        return queryset

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a bias flag"""
        flag = self.get_object()
        serializer = BiasResolutionSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        flag.resolved = True
        flag.resolved_by = request.user
        flag.resolution_notes = serializer.validated_data['resolution_notes']
        flag.resolved_at = timezone.now()
        flag.save()

        return Response({'status': 'Bias flag resolved'})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get bias flag summary"""
        flags = BiasFlag.objects.all()

        summary = {
            'total_bias_flags': flags.count(),
            'unresolved_flags': flags.filter(resolved=False).count(),
            'critical_flags': flags.filter(severity='critical', resolved=False).count(),
            'by_category': {},
            'by_severity': {}
        }

        # Group by category
        for category in BiasFlag.BiasCategory.values:
            summary['by_category'][category] = flags.filter(category=category).count()

        # Group by severity
        for severity in BiasFlag.Severity.values:
            summary['by_severity'][severity] = flags.filter(severity=severity).count()

        return Response(summary)


class PIISanitizationLogViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for PII Sanitization Logs"""
    queryset = PIISanitizationLog.objects.all()
    serializer_class = PIISanitizationLogSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['application', 'pii_type']


class ComplianceCheckViewSet(viewsets.ModelViewSet):
    """ViewSet for Compliance Checks"""
    queryset = ComplianceCheck.objects.all()
    serializer_class = ComplianceCheckSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['application', 'check_type', 'status']

    @action(detail=False, methods=['post'])
    def run_checks(self, request):
        """Run compliance checks for an application"""
        from applications.applications.models import LoanApplication

        application_id = request.data.get('application_id')
        if not application_id:
            return Response(
                {'error': 'application_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            application = LoanApplication.objects.get(id=application_id)
        except LoanApplication.DoesNotExist:
            return Response(
                {'error': 'Application not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Run compliance checks
        from .tasks import run_compliance_checks
        run_compliance_checks.delay(str(application.id))

        return Response({'status': 'Compliance checks started'})

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get compliance check summary"""
        checks = ComplianceCheck.objects.all()

        summary = {
            'compliance_checks_passed': checks.filter(status='passed').count(),
            'compliance_checks_failed': checks.filter(status='failed').count(),
            'compliance_checks_warning': checks.filter(status='warning').count(),
            'compliance_checks_review': checks.filter(status='review').count(),
            'by_type': {}
        }

        for check_type in ComplianceCheck.CheckType.values:
            type_checks = checks.filter(check_type=check_type)
            summary['by_type'][check_type] = {
                'passed': type_checks.filter(status='passed').count(),
                'failed': type_checks.filter(status='failed').count()
            }

        return Response(summary)


class FairLendingReportViewSet(viewsets.ModelViewSet):
    """ViewSet for Fair Lending Reports"""
    queryset = FairLendingReport.objects.all()
    serializer_class = FairLendingReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['report_type']

    @action(detail=False, methods=['post'])
    def generate(self, request):
        """Generate a new fair lending report"""
        report_type = request.data.get('report_type', 'ad_hoc')
        period_start = request.data.get('period_start')
        period_end = request.data.get('period_end')

        if not period_start or not period_end:
            return Response(
                {'error': 'period_start and period_end are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from .tasks import generate_fair_lending_report
        task = generate_fair_lending_report.delay(
            report_type,
            period_start,
            period_end,
            str(request.user.id)
        )

        return Response({
            'status': 'Report generation started',
            'task_id': task.id
        })


class ComplianceDashboardView(viewsets.ViewSet):
    """Dashboard view for compliance overview"""
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request):
        """Get compliance dashboard data"""
        from applications.applications.models import LoanApplication

        # Bias flags
        bias_flags = BiasFlag.objects.all()
        unresolved_bias = bias_flags.filter(resolved=False)

        # Compliance checks
        compliance_checks = ComplianceCheck.objects.all()

        # Applications with issues
        apps_with_flags = LoanApplication.objects.filter(
            bias_flags__resolved=False
        ).distinct().count()

        summary = {
            'total_bias_flags': bias_flags.count(),
            'unresolved_flags': unresolved_bias.count(),
            'critical_flags': unresolved_bias.filter(severity='critical').count(),
            'high_flags': unresolved_bias.filter(severity='high').count(),
            'compliance_checks_passed': compliance_checks.filter(status='passed').count(),
            'compliance_checks_failed': compliance_checks.filter(status='failed').count(),
            'applications_with_flags': apps_with_flags,
            'recent_flags': BiasFlagSerializer(
                unresolved_bias.order_by('-created_at')[:10],
                many=True
            ).data
        }

        return Response(summary)

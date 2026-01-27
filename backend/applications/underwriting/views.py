"""
Underwriting Views
"""
import logging
from django.db.models import Avg, Count, Q
from django.utils import timezone
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import (
    UnderwritingWorkflow, AgentAnalysis, UnderwritingDecision,
    RiskFactor, Condition, AuditTrail
)
from .serializers import (
    UnderwritingWorkflowListSerializer, UnderwritingWorkflowDetailSerializer,
    AgentAnalysisSerializer, UnderwritingDecisionSerializer,
    RiskFactorSerializer, ConditionSerializer, AuditTrailSerializer,
    WorkflowStatusUpdateSerializer, HumanReviewSerializer,
    WorkflowMetricsSerializer
)

logger = logging.getLogger(__name__)


class UnderwritingWorkflowViewSet(viewsets.ModelViewSet):
    """ViewSet for Underwriting Workflows"""
    queryset = UnderwritingWorkflow.objects.all()
    permission_classes = [permissions.IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'list':
            return UnderwritingWorkflowListSerializer
        return UnderwritingWorkflowDetailSerializer

    def get_queryset(self):
        queryset = UnderwritingWorkflow.objects.select_related(
            'application'
        ).prefetch_related(
            'analyses', 'risk_factors', 'audit_trail'
        )

        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        return queryset

    @action(detail=True, methods=['post'], permission_classes=[permissions.AllowAny],
            authentication_classes=[])
    def callback(self, request, pk=None):
        """Handle callbacks from MCP agent service (internal API)"""
        workflow = self.get_object()
        event_type = request.data.get('event_type')
        data = request.data.get('data', {})

        logger.info(f"Callback received for workflow {workflow.id}: {event_type}")

        if event_type == 'workflow_started':
            workflow.status = data.get('status', 'initializing')
            workflow.save()

        elif event_type == 'agent_analysis':
            from .tasks import save_agent_analysis
            save_agent_analysis.delay(str(workflow.id), data)

        elif event_type == 'decision_made':
            from .tasks import save_underwriting_decision
            save_underwriting_decision.delay(str(workflow.id), data)

        elif event_type == 'workflow_failed':
            workflow.status = UnderwritingWorkflow.WorkflowStatus.FAILED
            workflow.error_message = data.get('error', 'Unknown error')
            workflow.completed_at = timezone.now()
            workflow.save()

            # Update application status back to submitted
            application = workflow.application
            application.status = 'submitted'
            application.save()

            AuditTrail.objects.create(
                workflow=workflow,
                event_type=AuditTrail.EventType.ERROR,
                description=f"Workflow failed: {workflow.error_message}",
                details=data
            )

        return Response({'status': 'ok'})

    @action(detail=True, methods=['post'])
    def start(self, request, pk=None):
        """Start or restart the underwriting workflow"""
        workflow = self.get_object()

        if workflow.status not in ['pending', 'failed']:
            return Response(
                {'error': 'Workflow cannot be started in current state'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Trigger the workflow via Celery
        from .tasks import start_underwriting_workflow
        start_underwriting_workflow.delay(str(workflow.application.id))

        workflow.status = UnderwritingWorkflow.WorkflowStatus.INITIALIZING
        workflow.started_at = timezone.now()
        workflow.save()

        return Response({'status': 'Workflow started'})

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel the workflow"""
        workflow = self.get_object()

        if workflow.status in ['completed', 'cancelled']:
            return Response(
                {'error': 'Workflow cannot be cancelled'},
                status=status.HTTP_400_BAD_REQUEST
            )

        workflow.status = UnderwritingWorkflow.WorkflowStatus.CANCELLED
        workflow.completed_at = timezone.now()
        workflow.save()

        # Log cancellation
        AuditTrail.objects.create(
            workflow=workflow,
            event_type=AuditTrail.EventType.ERROR,
            description='Workflow cancelled by user',
            user=request.user,
            details={'cancelled_at_status': workflow.status}
        )

        return Response({'status': 'Workflow cancelled'})

    @action(detail=True, methods=['post'])
    def human_review(self, request, pk=None):
        """Submit human review for the workflow"""
        workflow = self.get_object()
        serializer = HumanReviewSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Get or create decision
        try:
            decision = workflow.decision
        except UnderwritingDecision.DoesNotExist:
            return Response(
                {'error': 'No AI decision exists to review'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Update decision with human review
        decision.human_override = True
        decision.human_decision = data['decision']
        decision.human_reviewer = request.user
        decision.human_notes = data.get('notes', '')
        decision.human_review_at = timezone.now()
        decision.save()

        # Add conditions if provided
        for condition_data in data.get('conditions', []):
            Condition.objects.create(
                decision=decision,
                condition_type=condition_data.get('type', 'prior_to_funding'),
                description=condition_data.get('description', ''),
                added_by=request.user
            )

        # Update workflow status
        workflow.status = UnderwritingWorkflow.WorkflowStatus.COMPLETED
        workflow.completed_at = timezone.now()
        workflow.save()

        # Update application status
        application = workflow.application
        status_map = {
            'approved': 'approved',
            'denied': 'denied',
            'conditional': 'conditional',
            'refer': 'in_review'
        }
        application.status = status_map.get(data['decision'], 'in_review')
        application.human_review_completed = True
        application.decision_at = timezone.now()
        application.save()

        # Log audit trail
        AuditTrail.objects.create(
            workflow=workflow,
            event_type=AuditTrail.EventType.HUMAN_REVIEW,
            description=f"Human review completed: {data['decision']}",
            user=request.user,
            details={
                'ai_decision': decision.ai_decision,
                'human_decision': data['decision'],
                'notes': data.get('notes', '')
            }
        )

        return Response({
            'status': 'Human review submitted',
            'final_decision': decision.final_decision
        })

    @action(detail=False, methods=['get'])
    def metrics(self, request):
        """Get workflow metrics"""
        workflows = UnderwritingWorkflow.objects.all()

        total = workflows.count()
        completed = workflows.filter(status='completed').count()
        in_progress = workflows.filter(
            status__in=['initializing', 'credit_analysis', 'income_analysis',
                       'asset_analysis', 'collateral_analysis', 'critic_review',
                       'decision', 'human_review']
        ).count()
        failed = workflows.filter(status='failed').count()

        # Calculate average duration
        completed_workflows = workflows.filter(
            status='completed',
            total_duration_seconds__isnull=False
        )
        avg_duration = completed_workflows.aggregate(
            avg=Avg('total_duration_seconds')
        )['avg'] or 0

        # Calculate approval rate
        decisions = UnderwritingDecision.objects.all()
        total_decisions = decisions.count()
        approved = decisions.filter(
            final_decision__in=['approved', 'conditional']
        ).count()
        approval_rate = (approved / total_decisions * 100) if total_decisions > 0 else 0

        # Calculate human override rate
        overrides = decisions.filter(human_override=True).count()
        override_rate = (overrides / total_decisions * 100) if total_decisions > 0 else 0

        metrics_data = {
            'total_workflows': total,
            'completed': completed,
            'in_progress': in_progress,
            'failed': failed,
            'average_duration_seconds': avg_duration,
            'approval_rate': approval_rate,
            'human_override_rate': override_rate
        }

        serializer = WorkflowMetricsSerializer(metrics_data)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def reasoning_chain(self, request, pk=None):
        """Get the complete reasoning chain for the workflow"""
        workflow = self.get_object()

        reasoning = []
        for entry in workflow.audit_trail.all():
            reasoning.append({
                'timestamp': entry.timestamp.isoformat(),
                'event': entry.event_type,
                'agent': entry.agent_name,
                'description': entry.description,
                'details': entry.details
            })

        return Response({'reasoning_chain': reasoning})


class AgentAnalysisViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing Agent Analyses"""
    queryset = AgentAnalysis.objects.all()
    serializer_class = AgentAnalysisSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['workflow', 'agent_type']


class UnderwritingDecisionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing Underwriting Decisions"""
    queryset = UnderwritingDecision.objects.all()
    serializer_class = UnderwritingDecisionSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def override(self, request, pk=None):
        """Override the AI decision"""
        decision = self.get_object()
        new_decision = request.data.get('decision')
        notes = request.data.get('notes', '')

        if new_decision not in dict(UnderwritingDecision.DecisionType.choices):
            return Response(
                {'error': 'Invalid decision type'},
                status=status.HTTP_400_BAD_REQUEST
            )

        decision.human_override = True
        decision.human_decision = new_decision
        decision.human_reviewer = request.user
        decision.human_notes = notes
        decision.human_review_at = timezone.now()
        decision.save()

        # Log override
        AuditTrail.objects.create(
            workflow=decision.workflow,
            event_type=AuditTrail.EventType.OVERRIDE,
            description=f"Decision overridden from {decision.ai_decision} to {new_decision}",
            user=request.user,
            details={
                'original_decision': decision.ai_decision,
                'new_decision': new_decision,
                'notes': notes
            }
        )

        return Response({
            'status': 'Decision overridden',
            'final_decision': decision.final_decision
        })


class ConditionViewSet(viewsets.ModelViewSet):
    """ViewSet for managing Conditions"""
    queryset = Condition.objects.all()
    serializer_class = ConditionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['decision', 'condition_type', 'status']

    @action(detail=True, methods=['post'])
    def satisfy(self, request, pk=None):
        """Mark condition as satisfied"""
        condition = self.get_object()
        notes = request.data.get('notes', '')

        condition.status = Condition.ConditionStatus.SATISFIED
        condition.cleared_by = request.user
        condition.cleared_at = timezone.now()
        condition.notes = notes
        condition.save()

        return Response({'status': 'Condition satisfied'})

    @action(detail=True, methods=['post'])
    def waive(self, request, pk=None):
        """Waive the condition"""
        condition = self.get_object()
        notes = request.data.get('notes', '')

        if not notes:
            return Response(
                {'error': 'Notes required for waiving condition'},
                status=status.HTTP_400_BAD_REQUEST
            )

        condition.status = Condition.ConditionStatus.WAIVED
        condition.cleared_by = request.user
        condition.cleared_at = timezone.now()
        condition.notes = notes
        condition.save()

        return Response({'status': 'Condition waived'})


class AuditTrailViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing Audit Trail"""
    queryset = AuditTrail.objects.all()
    serializer_class = AuditTrailSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['workflow', 'event_type', 'agent_name']

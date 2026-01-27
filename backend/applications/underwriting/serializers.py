"""
Underwriting Serializers
"""
from rest_framework import serializers
from .models import (
    UnderwritingWorkflow, AgentAnalysis, UnderwritingDecision,
    RiskFactor, Condition, AuditTrail
)


class AgentAnalysisSerializer(serializers.ModelSerializer):
    """Serializer for Agent Analysis"""

    class Meta:
        model = AgentAnalysis
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class RiskFactorSerializer(serializers.ModelSerializer):
    """Serializer for Risk Factor"""

    class Meta:
        model = RiskFactor
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class ConditionSerializer(serializers.ModelSerializer):
    """Serializer for Condition"""
    added_by_name = serializers.CharField(
        source='added_by.get_full_name',
        read_only=True
    )
    cleared_by_name = serializers.CharField(
        source='cleared_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = Condition
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class UnderwritingDecisionSerializer(serializers.ModelSerializer):
    """Serializer for Underwriting Decision"""
    decision_conditions = ConditionSerializer(many=True, read_only=True)
    human_reviewer_name = serializers.CharField(
        source='human_reviewer.get_full_name',
        read_only=True
    )

    class Meta:
        model = UnderwritingDecision
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'final_decision']


class AuditTrailSerializer(serializers.ModelSerializer):
    """Serializer for Audit Trail"""
    user_name = serializers.CharField(
        source='user.get_full_name',
        read_only=True
    )

    class Meta:
        model = AuditTrail
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']


class UnderwritingWorkflowListSerializer(serializers.ModelSerializer):
    """List serializer for Workflow"""
    application_case_id = serializers.CharField(
        source='application.case_id',
        read_only=True
    )

    class Meta:
        model = UnderwritingWorkflow
        fields = [
            'id', 'application', 'application_case_id', 'status',
            'current_agent', 'progress_percent', 'started_at',
            'completed_at', 'created_at'
        ]


class UnderwritingWorkflowDetailSerializer(serializers.ModelSerializer):
    """Detail serializer for Workflow with nested data"""
    analyses = AgentAnalysisSerializer(many=True, read_only=True)
    decision = UnderwritingDecisionSerializer(read_only=True)
    risk_factors = RiskFactorSerializer(many=True, read_only=True)
    audit_trail = AuditTrailSerializer(many=True, read_only=True)
    application_case_id = serializers.CharField(
        source='application.case_id',
        read_only=True
    )

    class Meta:
        model = UnderwritingWorkflow
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class WorkflowStatusUpdateSerializer(serializers.Serializer):
    """Serializer for workflow status updates"""
    status = serializers.ChoiceField(
        choices=UnderwritingWorkflow.WorkflowStatus.choices
    )
    current_agent = serializers.CharField(required=False, allow_blank=True)
    progress_percent = serializers.IntegerField(
        min_value=0, max_value=100,
        required=False
    )
    state_data = serializers.JSONField(required=False)


class HumanReviewSerializer(serializers.Serializer):
    """Serializer for human review submission"""
    decision = serializers.ChoiceField(
        choices=UnderwritingDecision.DecisionType.choices
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    conditions = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )


class WorkflowMetricsSerializer(serializers.Serializer):
    """Serializer for workflow metrics"""
    total_workflows = serializers.IntegerField()
    completed = serializers.IntegerField()
    in_progress = serializers.IntegerField()
    failed = serializers.IntegerField()
    average_duration_seconds = serializers.FloatField()
    approval_rate = serializers.FloatField()
    human_override_rate = serializers.FloatField()

"""
Underwriting Models - Tracks underwriting workflow and decisions
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from applications.applications.models import LoanApplication
from applications.users.models import User


class UnderwritingWorkflow(models.Model):
    """Tracks the multi-agent underwriting workflow"""

    class WorkflowStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        INITIALIZING = 'initializing', 'Initializing'
        CREDIT_ANALYSIS = 'credit_analysis', 'Credit Analysis'
        INCOME_ANALYSIS = 'income_analysis', 'Income Analysis'
        ASSET_ANALYSIS = 'asset_analysis', 'Asset Analysis'
        COLLATERAL_ANALYSIS = 'collateral_analysis', 'Collateral Analysis'
        CRITIC_REVIEW = 'critic_review', 'Critic Review'
        DECISION = 'decision', 'Decision Making'
        HUMAN_REVIEW = 'human_review', 'Human Review'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.OneToOneField(
        LoanApplication,
        on_delete=models.CASCADE,
        related_name='underwriting_workflow'
    )

    status = models.CharField(
        max_length=25,
        choices=WorkflowStatus.choices,
        default=WorkflowStatus.PENDING
    )
    current_agent = models.CharField(max_length=50, blank=True)
    progress_percent = models.IntegerField(default=0)

    # State data (JSON blob for LangGraph state)
    state_data = models.JSONField(default=dict)

    # Timing
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    total_duration_seconds = models.IntegerField(null=True, blank=True)

    # Error handling
    error_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'underwriting_workflows'
        verbose_name = 'Underwriting Workflow'
        verbose_name_plural = 'Underwriting Workflows'

    def __str__(self):
        return f"Workflow for {self.application.case_id} - {self.status}"


class AgentAnalysis(models.Model):
    """Stores individual agent analyses"""

    class AgentType(models.TextChoices):
        CREDIT = 'credit', 'Credit Analyst'
        INCOME = 'income', 'Income Analyst'
        ASSET = 'asset', 'Asset Analyst'
        COLLATERAL = 'collateral', 'Collateral Analyst'
        CRITIC = 'critic', 'Critic Agent'
        DECISION = 'decision', 'Decision Agent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        UnderwritingWorkflow,
        on_delete=models.CASCADE,
        related_name='analyses'
    )

    agent_type = models.CharField(max_length=20, choices=AgentType.choices)
    analysis_text = models.TextField()
    structured_data = models.JSONField(default=dict)

    # Recommendations
    recommendation = models.CharField(max_length=50, blank=True)
    risk_factors = models.JSONField(default=list)
    conditions = models.JSONField(default=list)

    # Metrics
    confidence_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True
    )
    processing_time_ms = models.IntegerField(null=True, blank=True)
    tokens_used = models.IntegerField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'agent_analyses'
        verbose_name = 'Agent Analysis'
        verbose_name_plural = 'Agent Analyses'
        ordering = ['created_at']

    def __str__(self):
        return f"{self.agent_type} analysis for {self.workflow.application.case_id}"


class UnderwritingDecision(models.Model):
    """Final underwriting decision record"""

    class DecisionType(models.TextChoices):
        APPROVED = 'approved', 'Approved'
        DENIED = 'denied', 'Denied'
        CONDITIONAL = 'conditional', 'Conditional Approval'
        SUSPENDED = 'suspended', 'Suspended'
        REFER = 'refer', 'Refer to Human'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.OneToOneField(
        UnderwritingWorkflow,
        on_delete=models.CASCADE,
        related_name='decision'
    )

    # AI Decision
    ai_decision = models.CharField(max_length=20, choices=DecisionType.choices)
    ai_risk_score = models.IntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    ai_confidence = models.DecimalField(max_digits=5, decimal_places=2)
    decision_memo = models.TextField()
    executive_summary = models.TextField(blank=True)

    # Conditions (for conditional approval)
    conditions = models.JSONField(default=list)

    # Human Override
    human_override = models.BooleanField(default=False)
    human_decision = models.CharField(
        max_length=20,
        choices=DecisionType.choices,
        blank=True
    )
    human_reviewer = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='underwriting_decisions'
    )
    human_notes = models.TextField(blank=True)
    human_review_at = models.DateTimeField(null=True, blank=True)

    # Final decision
    final_decision = models.CharField(
        max_length=20,
        choices=DecisionType.choices
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'underwriting_decisions'
        verbose_name = 'Underwriting Decision'
        verbose_name_plural = 'Underwriting Decisions'

    def __str__(self):
        return f"Decision for {self.workflow.application.case_id}: {self.final_decision}"

    def save(self, *args, **kwargs):
        # Set final decision based on human override
        if self.human_override and self.human_decision:
            self.final_decision = self.human_decision
        else:
            self.final_decision = self.ai_decision
        super().save(*args, **kwargs)


class RiskFactor(models.Model):
    """Individual risk factors identified during underwriting"""

    class Severity(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    class Category(models.TextChoices):
        CREDIT = 'credit', 'Credit'
        INCOME = 'income', 'Income'
        ASSET = 'asset', 'Asset'
        COLLATERAL = 'collateral', 'Collateral'
        COMPLIANCE = 'compliance', 'Compliance'
        FRAUD = 'fraud', 'Fraud'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        UnderwritingWorkflow,
        on_delete=models.CASCADE,
        related_name='risk_factors'
    )

    category = models.CharField(max_length=20, choices=Category.choices)
    severity = models.CharField(max_length=10, choices=Severity.choices)
    description = models.TextField()
    mitigation = models.TextField(blank=True)
    identified_by = models.CharField(max_length=50)  # Agent name

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'risk_factors'
        verbose_name = 'Risk Factor'
        verbose_name_plural = 'Risk Factors'

    def __str__(self):
        return f"{self.severity} {self.category}: {self.description[:50]}"


class Condition(models.Model):
    """Conditions for conditional approval"""

    class ConditionType(models.TextChoices):
        PRIOR_TO_DOCS = 'prior_to_docs', 'Prior to Documents'
        PRIOR_TO_FUNDING = 'prior_to_funding', 'Prior to Funding'
        PRIOR_TO_CLOSING = 'prior_to_closing', 'Prior to Closing'

    class ConditionStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RECEIVED = 'received', 'Received'
        REVIEWED = 'reviewed', 'Under Review'
        SATISFIED = 'satisfied', 'Satisfied'
        WAIVED = 'waived', 'Waived'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    decision = models.ForeignKey(
        UnderwritingDecision,
        on_delete=models.CASCADE,
        related_name='decision_conditions'
    )

    condition_type = models.CharField(max_length=20, choices=ConditionType.choices)
    status = models.CharField(
        max_length=20,
        choices=ConditionStatus.choices,
        default=ConditionStatus.PENDING
    )
    description = models.TextField()
    required_document_type = models.CharField(max_length=50, blank=True)

    added_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='conditions_added'
    )
    cleared_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='conditions_cleared'
    )
    cleared_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'conditions'
        verbose_name = 'Condition'
        verbose_name_plural = 'Conditions'

    def __str__(self):
        return f"{self.condition_type}: {self.description[:50]}"


class AuditTrail(models.Model):
    """Audit trail for underwriting decisions"""

    class EventType(models.TextChoices):
        WORKFLOW_STARTED = 'workflow_started', 'Workflow Started'
        AGENT_STARTED = 'agent_started', 'Agent Started'
        AGENT_COMPLETED = 'agent_completed', 'Agent Completed'
        POLICY_RETRIEVED = 'policy_retrieved', 'Policy Retrieved'
        TOOL_INVOKED = 'tool_invoked', 'Tool Invoked'
        DECISION_MADE = 'decision_made', 'Decision Made'
        HUMAN_REVIEW = 'human_review', 'Human Review'
        OVERRIDE = 'override', 'Decision Override'
        ERROR = 'error', 'Error Occurred'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow = models.ForeignKey(
        UnderwritingWorkflow,
        on_delete=models.CASCADE,
        related_name='audit_trail'
    )

    event_type = models.CharField(max_length=25, choices=EventType.choices)
    agent_name = models.CharField(max_length=50, blank=True)
    description = models.TextField()
    details = models.JSONField(default=dict)

    # For human actions
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'audit_trail'
        verbose_name = 'Audit Trail Entry'
        verbose_name_plural = 'Audit Trail'
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['workflow', 'timestamp']),
            models.Index(fields=['event_type', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.event_type}: {self.description[:50]}"

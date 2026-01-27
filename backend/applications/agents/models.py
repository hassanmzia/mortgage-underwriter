"""
Agent Models - Configuration and metrics for AI agents
"""
import uuid
from django.db import models


class AgentConfiguration(models.Model):
    """Configuration for AI agents"""

    class AgentType(models.TextChoices):
        CREDIT_ANALYST = 'credit_analyst', 'Credit Analyst'
        INCOME_ANALYST = 'income_analyst', 'Income Analyst'
        ASSET_ANALYST = 'asset_analyst', 'Asset Analyst'
        COLLATERAL_ANALYST = 'collateral_analyst', 'Collateral Analyst'
        CRITIC = 'critic', 'Critic Agent'
        DECISION = 'decision', 'Decision Agent'
        SUPERVISOR = 'supervisor', 'Supervisor Agent'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent_type = models.CharField(
        max_length=25,
        choices=AgentType.choices,
        unique=True
    )
    name = models.CharField(max_length=100)
    description = models.TextField()

    # LLM Configuration
    model_name = models.CharField(max_length=50, default='gpt-4o-mini')
    temperature = models.DecimalField(
        max_digits=3, decimal_places=2,
        default=0.0
    )
    max_tokens = models.IntegerField(default=4096)

    # System prompt
    system_prompt = models.TextField()
    user_prompt_template = models.TextField()

    # Tools available to this agent
    available_tools = models.JSONField(default=list)

    # RAG configuration
    use_rag = models.BooleanField(default=True)
    rag_query_template = models.TextField(blank=True)
    rag_top_k = models.IntegerField(default=5)

    # Metrics thresholds
    confidence_threshold = models.DecimalField(
        max_digits=3, decimal_places=2,
        default=0.75
    )
    timeout_seconds = models.IntegerField(default=60)

    is_active = models.BooleanField(default=True)
    version = models.CharField(max_length=20, default='1.0.0')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'agent_configurations'
        verbose_name = 'Agent Configuration'
        verbose_name_plural = 'Agent Configurations'

    def __str__(self):
        return f"{self.name} ({self.agent_type})"


class AgentMetrics(models.Model):
    """Aggregated metrics for agent performance"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    agent_config = models.ForeignKey(
        AgentConfiguration,
        on_delete=models.CASCADE,
        related_name='metrics'
    )

    # Time period
    period_start = models.DateTimeField()
    period_end = models.DateTimeField()

    # Execution metrics
    total_executions = models.IntegerField(default=0)
    successful_executions = models.IntegerField(default=0)
    failed_executions = models.IntegerField(default=0)

    # Timing
    avg_execution_time_ms = models.IntegerField(default=0)
    min_execution_time_ms = models.IntegerField(default=0)
    max_execution_time_ms = models.IntegerField(default=0)

    # Token usage
    total_tokens_used = models.BigIntegerField(default=0)
    avg_tokens_per_execution = models.IntegerField(default=0)

    # Quality
    avg_confidence_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'agent_metrics'
        verbose_name = 'Agent Metrics'
        verbose_name_plural = 'Agent Metrics'
        ordering = ['-period_end']
        unique_together = ['agent_config', 'period_start', 'period_end']

    def __str__(self):
        return f"{self.agent_config.name} metrics ({self.period_start} - {self.period_end})"


class PolicyDocument(models.Model):
    """Underwriting policy documents for RAG"""

    class DocumentType(models.TextChoices):
        GUIDELINE = 'guideline', 'Underwriting Guideline'
        REGULATION = 'regulation', 'Regulation'
        PROCEDURE = 'procedure', 'Procedure'
        CHECKLIST = 'checklist', 'Checklist'
        REFERENCE = 'reference', 'Reference'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    document_type = models.CharField(max_length=20, choices=DocumentType.choices)
    category = models.CharField(max_length=50)  # credit, income, asset, collateral, etc.

    # Content
    content = models.TextField()
    source_file = models.CharField(max_length=255, blank=True)

    # Version control
    version = models.CharField(max_length=20, default='1.0')
    effective_date = models.DateField()
    expiration_date = models.DateField(null=True, blank=True)

    # Vector embedding reference
    chroma_collection = models.CharField(max_length=100, default='mortgage_policies')
    embedding_ids = models.JSONField(default=list)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'policy_documents'
        verbose_name = 'Policy Document'
        verbose_name_plural = 'Policy Documents'
        ordering = ['-effective_date']

    def __str__(self):
        return f"{self.title} (v{self.version})"


class ToolExecution(models.Model):
    """Log of tool executions by agents"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workflow_id = models.UUIDField(db_index=True)
    agent_type = models.CharField(max_length=25)
    tool_name = models.CharField(max_length=100)

    # Input/Output
    input_data = models.JSONField()
    output_data = models.JSONField()

    # Execution details
    execution_time_ms = models.IntegerField()
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'tool_executions'
        verbose_name = 'Tool Execution'
        verbose_name_plural = 'Tool Executions'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['workflow_id', 'timestamp']),
            models.Index(fields=['tool_name', 'timestamp']),
        ]

    def __str__(self):
        return f"{self.agent_type} - {self.tool_name}"

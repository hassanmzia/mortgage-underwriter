"""
Agent Serializers
"""
from rest_framework import serializers
from .models import AgentConfiguration, AgentMetrics, PolicyDocument, ToolExecution


class AgentConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for Agent Configuration"""

    class Meta:
        model = AgentConfiguration
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AgentMetricsSerializer(serializers.ModelSerializer):
    """Serializer for Agent Metrics"""
    agent_name = serializers.CharField(source='agent_config.name', read_only=True)
    success_rate = serializers.SerializerMethodField()

    class Meta:
        model = AgentMetrics
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

    def get_success_rate(self, obj):
        if obj.total_executions > 0:
            return round(obj.successful_executions / obj.total_executions * 100, 2)
        return 0


class PolicyDocumentSerializer(serializers.ModelSerializer):
    """Serializer for Policy Document"""

    class Meta:
        model = PolicyDocument
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class PolicyDocumentListSerializer(serializers.ModelSerializer):
    """List serializer for Policy Document (without content)"""

    class Meta:
        model = PolicyDocument
        exclude = ['content', 'embedding_ids']


class ToolExecutionSerializer(serializers.ModelSerializer):
    """Serializer for Tool Execution"""

    class Meta:
        model = ToolExecution
        fields = '__all__'
        read_only_fields = ['id', 'timestamp']


class AgentStatusSerializer(serializers.Serializer):
    """Serializer for agent status check"""
    agent_type = serializers.CharField()
    is_active = serializers.BooleanField()
    health = serializers.CharField()
    last_execution = serializers.DateTimeField(allow_null=True)
    avg_response_time_ms = serializers.IntegerField()


class RAGQuerySerializer(serializers.Serializer):
    """Serializer for RAG query request"""
    query = serializers.CharField()
    category = serializers.CharField(required=False)
    top_k = serializers.IntegerField(default=5, min_value=1, max_value=20)


class RAGResultSerializer(serializers.Serializer):
    """Serializer for RAG query result"""
    document_id = serializers.UUIDField()
    title = serializers.CharField()
    content = serializers.CharField()
    relevance_score = serializers.FloatField()
    category = serializers.CharField()

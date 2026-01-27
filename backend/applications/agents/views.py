"""
Agent Views
"""
from django.db.models import Avg, Sum
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import AgentConfiguration, AgentMetrics, PolicyDocument, ToolExecution
from .serializers import (
    AgentConfigurationSerializer, AgentMetricsSerializer,
    PolicyDocumentSerializer, PolicyDocumentListSerializer,
    ToolExecutionSerializer, AgentStatusSerializer,
    RAGQuerySerializer, RAGResultSerializer
)


class AgentConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet for Agent Configuration"""
    queryset = AgentConfiguration.objects.all()
    serializer_class = AgentConfigurationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['agent_type', 'is_active']

    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get status of all agents"""
        agents = AgentConfiguration.objects.filter(is_active=True)
        statuses = []

        for agent in agents:
            last_execution = ToolExecution.objects.filter(
                agent_type=agent.agent_type
            ).order_by('-timestamp').first()

            avg_time = ToolExecution.objects.filter(
                agent_type=agent.agent_type,
                success=True
            ).aggregate(avg=Avg('execution_time_ms'))['avg'] or 0

            statuses.append({
                'agent_type': agent.agent_type,
                'is_active': agent.is_active,
                'health': 'healthy',
                'last_execution': last_execution.timestamp if last_execution else None,
                'avg_response_time_ms': int(avg_time)
            })

        serializer = AgentStatusSerializer(statuses, many=True)
        return Response(serializer.data)


class AgentMetricsViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Agent Metrics"""
    queryset = AgentMetrics.objects.all()
    serializer_class = AgentMetricsSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['agent_config']

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get aggregated metrics summary"""
        from datetime import timedelta
        from django.utils import timezone

        # Last 24 hours
        since = timezone.now() - timedelta(hours=24)

        executions = ToolExecution.objects.filter(timestamp__gte=since)

        summary = {
            'total_executions': executions.count(),
            'successful': executions.filter(success=True).count(),
            'failed': executions.filter(success=False).count(),
            'avg_execution_time_ms': executions.aggregate(
                avg=Avg('execution_time_ms')
            )['avg'] or 0,
            'by_agent': {}
        }

        # Group by agent
        for agent_type in AgentConfiguration.AgentType.values:
            agent_execs = executions.filter(agent_type=agent_type)
            summary['by_agent'][agent_type] = {
                'total': agent_execs.count(),
                'avg_time_ms': agent_execs.aggregate(
                    avg=Avg('execution_time_ms')
                )['avg'] or 0
            }

        return Response(summary)


class PolicyDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet for Policy Documents"""
    queryset = PolicyDocument.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['document_type', 'category', 'is_active']

    def get_serializer_class(self):
        if self.action == 'list':
            return PolicyDocumentListSerializer
        return PolicyDocumentSerializer

    @action(detail=False, methods=['post'])
    def query(self, request):
        """Query policies using RAG"""
        serializer = RAGQuerySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data

        # Call MCP service for RAG query
        import httpx
        from django.conf import settings

        try:
            with httpx.Client(timeout=30.0) as client:
                response = client.post(
                    f"{settings.MCP_SERVICE_URL}/api/rag/query",
                    json={
                        'query': data['query'],
                        'category': data.get('category'),
                        'top_k': data['top_k']
                    }
                )
                response.raise_for_status()
                results = response.json()

            return Response(results)

        except httpx.HTTPError as e:
            return Response(
                {'error': f'RAG service error: {str(e)}'},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

    @action(detail=True, methods=['post'])
    def reindex(self, request, pk=None):
        """Reindex a policy document in the vector store"""
        document = self.get_object()

        # Trigger reindexing via Celery
        from .tasks import reindex_policy_document
        reindex_policy_document.delay(str(document.id))

        return Response({'status': 'Reindexing started'})

    @action(detail=False, methods=['post'])
    def bulk_upload(self, request):
        """Bulk upload policy documents"""
        documents = request.data.get('documents', [])
        created = []

        for doc_data in documents:
            serializer = PolicyDocumentSerializer(data=doc_data)
            if serializer.is_valid():
                doc = serializer.save()
                created.append(doc.id)

        # Trigger indexing
        from .tasks import index_policy_documents
        index_policy_documents.delay(created)

        return Response({
            'status': 'Documents uploaded',
            'count': len(created),
            'ids': created
        })


class ToolExecutionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for Tool Executions"""
    queryset = ToolExecution.objects.all()
    serializer_class = ToolExecutionSerializer
    permission_classes = [permissions.IsAuthenticated]
    filterset_fields = ['workflow_id', 'agent_type', 'tool_name', 'success']

    def get_queryset(self):
        queryset = ToolExecution.objects.all()

        # Filter by time range
        from datetime import timedelta
        from django.utils import timezone

        hours = self.request.query_params.get('hours')
        if hours:
            since = timezone.now() - timedelta(hours=int(hours))
            queryset = queryset.filter(timestamp__gte=since)

        return queryset

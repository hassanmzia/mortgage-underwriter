"""
Celery tasks for agent operations
"""
import logging
import httpx
from celery import shared_task
from django.conf import settings

logger = logging.getLogger(__name__)


@shared_task
def reindex_policy_document(document_id: str):
    """Reindex a single policy document in ChromaDB"""
    from .models import PolicyDocument

    try:
        document = PolicyDocument.objects.get(id=document_id)

        with httpx.Client(timeout=60.0) as client:
            response = client.post(
                f"{settings.MCP_SERVICE_URL}/api/rag/index",
                json={
                    'document_id': str(document.id),
                    'title': document.title,
                    'content': document.content,
                    'category': document.category,
                    'document_type': document.document_type,
                    'metadata': {
                        'version': document.version,
                        'effective_date': document.effective_date.isoformat()
                    }
                }
            )
            response.raise_for_status()
            result = response.json()

        # Update embedding IDs
        document.embedding_ids = result.get('embedding_ids', [])
        document.save()

        logger.info(f"Document {document_id} reindexed successfully")

    except Exception as e:
        logger.error(f"Error reindexing document {document_id}: {e}")
        raise


@shared_task
def index_policy_documents(document_ids: list):
    """Index multiple policy documents"""
    for doc_id in document_ids:
        reindex_policy_document.delay(doc_id)


@shared_task
def cleanup_old_tool_executions(days: int = 30):
    """Clean up old tool execution logs"""
    from datetime import timedelta
    from django.utils import timezone
    from .models import ToolExecution

    cutoff = timezone.now() - timedelta(days=days)
    deleted, _ = ToolExecution.objects.filter(timestamp__lt=cutoff).delete()
    logger.info(f"Deleted {deleted} old tool execution logs")


@shared_task
def calculate_agent_metrics():
    """Calculate and store agent metrics"""
    from datetime import timedelta
    from django.utils import timezone
    from django.db.models import Avg, Count, Min, Max, Sum
    from .models import AgentConfiguration, AgentMetrics, ToolExecution

    now = timezone.now()
    period_start = now - timedelta(hours=1)

    for config in AgentConfiguration.objects.filter(is_active=True):
        executions = ToolExecution.objects.filter(
            agent_type=config.agent_type,
            timestamp__gte=period_start,
            timestamp__lt=now
        )

        if not executions.exists():
            continue

        stats = executions.aggregate(
            total=Count('id'),
            successful=Count('id', filter=models.Q(success=True)),
            failed=Count('id', filter=models.Q(success=False)),
            avg_time=Avg('execution_time_ms'),
            min_time=Min('execution_time_ms'),
            max_time=Max('execution_time_ms')
        )

        AgentMetrics.objects.create(
            agent_config=config,
            period_start=period_start,
            period_end=now,
            total_executions=stats['total'],
            successful_executions=stats['successful'],
            failed_executions=stats['failed'],
            avg_execution_time_ms=int(stats['avg_time'] or 0),
            min_execution_time_ms=stats['min_time'] or 0,
            max_execution_time_ms=stats['max_time'] or 0
        )

    logger.info("Agent metrics calculated successfully")

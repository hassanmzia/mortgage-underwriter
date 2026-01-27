"""
WebSocket Consumers for Real-time Updates
"""
import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)


class UnderwritingConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for underwriting workflow updates"""

    async def connect(self):
        self.workflow_id = self.scope['url_route']['kwargs']['workflow_id']
        self.room_group_name = f'workflow_{self.workflow_id}'

        # Join workflow room
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        logger.info(f"WebSocket connected for workflow {self.workflow_id}")

        # Send current state
        state = await self.get_workflow_state()
        await self.send(text_data=json.dumps({
            'type': 'initial_state',
            'data': state
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"WebSocket disconnected for workflow {self.workflow_id}")

    async def receive(self, text_data):
        """Receive message from WebSocket"""
        data = json.loads(text_data)
        message_type = data.get('type')

        if message_type == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))
        elif message_type == 'get_state':
            state = await self.get_workflow_state()
            await self.send(text_data=json.dumps({
                'type': 'state_update',
                'data': state
            }))

    async def workflow_update(self, event):
        """Handle workflow update from channel layer"""
        await self.send(text_data=json.dumps({
            'type': 'workflow_update',
            'data': event['data']
        }))

    async def agent_progress(self, event):
        """Handle agent progress update"""
        await self.send(text_data=json.dumps({
            'type': 'agent_progress',
            'data': event['data']
        }))

    async def analysis_complete(self, event):
        """Handle analysis completion"""
        await self.send(text_data=json.dumps({
            'type': 'analysis_complete',
            'data': event['data']
        }))

    async def decision_made(self, event):
        """Handle decision notification"""
        await self.send(text_data=json.dumps({
            'type': 'decision_made',
            'data': event['data']
        }))

    @database_sync_to_async
    def get_workflow_state(self):
        """Get current workflow state from database"""
        from applications.underwriting.models import UnderwritingWorkflow
        from applications.underwriting.serializers import UnderwritingWorkflowDetailSerializer

        try:
            workflow = UnderwritingWorkflow.objects.get(id=self.workflow_id)
            serializer = UnderwritingWorkflowDetailSerializer(workflow)
            return serializer.data
        except UnderwritingWorkflow.DoesNotExist:
            return {'error': 'Workflow not found'}


class NotificationConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for user notifications"""

    async def connect(self):
        self.user = self.scope['user']

        if self.user.is_anonymous:
            await self.close()
            return

        self.user_group = f'user_{self.user.id}'

        await self.channel_layer.group_add(
            self.user_group,
            self.channel_name
        )

        # Also join role-based group
        self.role_group = f'role_{self.user.role}'
        await self.channel_layer.group_add(
            self.role_group,
            self.channel_name
        )

        await self.accept()
        logger.info(f"Notification WebSocket connected for user {self.user.username}")

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group'):
            await self.channel_layer.group_discard(
                self.user_group,
                self.channel_name
            )
        if hasattr(self, 'role_group'):
            await self.channel_layer.group_discard(
                self.role_group,
                self.channel_name
            )

    async def receive(self, text_data):
        data = json.loads(text_data)
        if data.get('type') == 'ping':
            await self.send(text_data=json.dumps({'type': 'pong'}))

    async def notification(self, event):
        """Send notification to user"""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': event['data']
        }))

    async def workflow_assigned(self, event):
        """Notify user of workflow assignment"""
        await self.send(text_data=json.dumps({
            'type': 'workflow_assigned',
            'data': event['data']
        }))

    async def review_required(self, event):
        """Notify user of pending review"""
        await self.send(text_data=json.dumps({
            'type': 'review_required',
            'data': event['data']
        }))

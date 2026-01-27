"""
WebSocket URL Routing
"""
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r'ws/underwriting/(?P<workflow_id>[^/]+)/$',
        consumers.UnderwritingConsumer.as_asgi()
    ),
    re_path(
        r'ws/notifications/$',
        consumers.NotificationConsumer.as_asgi()
    ),
]

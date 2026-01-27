"""
Agents URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AgentConfigurationViewSet, AgentMetricsViewSet,
    PolicyDocumentViewSet, ToolExecutionViewSet
)

router = DefaultRouter()
router.register(r'configurations', AgentConfigurationViewSet, basename='agent-config')
router.register(r'metrics', AgentMetricsViewSet, basename='agent-metrics')
router.register(r'policies', PolicyDocumentViewSet, basename='policy-document')
router.register(r'tool-executions', ToolExecutionViewSet, basename='tool-execution')

urlpatterns = [
    path('', include(router.urls)),
]

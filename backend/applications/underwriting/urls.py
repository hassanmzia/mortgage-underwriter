"""
Underwriting URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UnderwritingWorkflowViewSet, AgentAnalysisViewSet,
    UnderwritingDecisionViewSet, ConditionViewSet, AuditTrailViewSet
)

router = DefaultRouter()
router.register(r'workflows', UnderwritingWorkflowViewSet, basename='workflow')
router.register(r'analyses', AgentAnalysisViewSet, basename='analysis')
router.register(r'decisions', UnderwritingDecisionViewSet, basename='decision')
router.register(r'conditions', ConditionViewSet, basename='condition')
router.register(r'audit-trail', AuditTrailViewSet, basename='audit-trail')

urlpatterns = [
    path('', include(router.urls)),
]

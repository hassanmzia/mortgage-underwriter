"""
Compliance URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    BiasFlagViewSet, PIISanitizationLogViewSet,
    ComplianceCheckViewSet, FairLendingReportViewSet,
    ComplianceDashboardView
)

router = DefaultRouter()
router.register(r'bias-flags', BiasFlagViewSet, basename='bias-flag')
router.register(r'pii-logs', PIISanitizationLogViewSet, basename='pii-log')
router.register(r'checks', ComplianceCheckViewSet, basename='compliance-check')
router.register(r'reports', FairLendingReportViewSet, basename='fair-lending-report')
router.register(r'dashboard', ComplianceDashboardView, basename='compliance-dashboard')

urlpatterns = [
    path('', include(router.urls)),
]

"""
Loan Application URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LoanApplicationViewSet, BorrowerViewSet, CreditProfileViewSet,
    EmploymentViewSet, AssetViewSet, LiabilityViewSet, PropertyViewSet,
    DocumentViewSet
)

router = DefaultRouter()
router.register(r'', LoanApplicationViewSet, basename='application')
router.register(r'borrowers', BorrowerViewSet, basename='borrower')
router.register(r'credit-profiles', CreditProfileViewSet, basename='credit-profile')
router.register(r'employments', EmploymentViewSet, basename='employment')
router.register(r'assets', AssetViewSet, basename='asset')
router.register(r'liabilities', LiabilityViewSet, basename='liability')
router.register(r'properties', PropertyViewSet, basename='property')
router.register(r'documents', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
]

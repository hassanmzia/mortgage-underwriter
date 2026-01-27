"""
User URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, UserActivityViewSet

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')
router.register(r'activities', UserActivityViewSet, basename='user-activity')

urlpatterns = [
    path('', include(router.urls)),
]

"""
URL Configuration for Mortgage Underwriting System
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)

urlpatterns = [
    # Admin
    path('admin/', admin.site.urls),

    # JWT Authentication
    path('api/auth/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/auth/token/verify/', TokenVerifyView.as_view(), name='token_verify'),

    # API Routes
    path('api/v1/', include('applications.api.urls')),
    path('api/v1/users/', include('applications.users.urls')),
    path('api/v1/applications/', include('applications.applications.urls')),
    path('api/v1/underwriting/', include('applications.underwriting.urls')),
    path('api/v1/agents/', include('applications.agents.urls')),
    path('api/v1/compliance/', include('applications.compliance.urls')),
]

# Serve static and media files in development
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

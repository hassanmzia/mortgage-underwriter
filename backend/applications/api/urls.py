"""
Main API URL Configuration
"""
from django.urls import path
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """Health check endpoint"""
    return Response({
        'status': 'healthy',
        'service': 'mortgage-underwriter-api',
        'version': '1.0.0'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def api_root(request):
    """API root with available endpoints"""
    return Response({
        'endpoints': {
            'health': '/api/v1/health/',
            'auth': {
                'token': '/api/auth/token/',
                'refresh': '/api/auth/token/refresh/',
                'verify': '/api/auth/token/verify/'
            },
            'users': '/api/v1/users/',
            'applications': '/api/v1/applications/',
            'underwriting': '/api/v1/underwriting/',
            'agents': '/api/v1/agents/',
            'compliance': '/api/v1/compliance/'
        }
    })


urlpatterns = [
    path('', api_root, name='api-root'),
    path('health/', health_check, name='health-check'),
]

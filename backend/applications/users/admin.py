"""
User Admin Configuration
"""
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, UserActivity


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User Admin"""
    list_display = ['username', 'email', 'first_name', 'last_name', 'role', 'is_staff', 'is_active']
    list_filter = ['role', 'is_staff', 'is_active', 'is_available']
    search_fields = ['username', 'email', 'first_name', 'last_name']
    ordering = ['username']

    fieldsets = BaseUserAdmin.fieldsets + (
        ('Professional Info', {
            'fields': ('role', 'department', 'employee_id', 'phone', 'nmls_id', 'max_loan_amount', 'is_available')
        }),
    )

    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Professional Info', {
            'fields': ('role', 'department', 'employee_id', 'phone')
        }),
    )


@admin.register(UserActivity)
class UserActivityAdmin(admin.ModelAdmin):
    """User Activity Admin"""
    list_display = ['user', 'action', 'resource_type', 'timestamp']
    list_filter = ['action', 'resource_type', 'timestamp']
    search_fields = ['user__username', 'resource_type', 'resource_id']
    readonly_fields = ['user', 'action', 'resource_type', 'resource_id', 'details', 'ip_address', 'timestamp']
    ordering = ['-timestamp']

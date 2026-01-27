"""
Compliance Admin Configuration
"""
from django.contrib import admin
from .models import BiasFlag, PIISanitizationLog, ComplianceCheck, FairLendingReport


@admin.register(BiasFlag)
class BiasFlagAdmin(admin.ModelAdmin):
    list_display = ['id', 'severity', 'created_at']
    list_filter = ['severity']
    ordering = ['-created_at']


@admin.register(PIISanitizationLog)
class PIISanitizationLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'field_name', 'pii_type', 'created_at']
    list_filter = ['pii_type']
    ordering = ['-created_at']


@admin.register(ComplianceCheck)
class ComplianceCheckAdmin(admin.ModelAdmin):
    list_display = ['id', 'check_type', 'passed', 'created_at']
    list_filter = ['check_type', 'passed']
    ordering = ['-created_at']


@admin.register(FairLendingReport)
class FairLendingReportAdmin(admin.ModelAdmin):
    list_display = ['id', 'report_type', 'created_at']
    list_filter = ['report_type']
    ordering = ['-created_at']

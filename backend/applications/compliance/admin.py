"""
Compliance Admin Configuration
"""
from django.contrib import admin
from .models import BiasFlag, PIISanitizationLog, ComplianceCheck, FairLendingReport


@admin.register(BiasFlag)
class BiasFlagAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'bias_type', 'severity', 'status', 'detected_at']
    list_filter = ['bias_type', 'severity', 'status']
    search_fields = ['workflow__application__application_number', 'description']
    readonly_fields = ['detected_at', 'resolved_at']
    ordering = ['-detected_at']


@admin.register(PIISanitizationLog)
class PIISanitizationLogAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'field_name', 'pii_type', 'action', 'sanitized_at']
    list_filter = ['pii_type', 'action', 'sanitized_at']
    readonly_fields = ['sanitized_at']
    ordering = ['-sanitized_at']


@admin.register(ComplianceCheck)
class ComplianceCheckAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'check_type', 'status', 'checked_at']
    list_filter = ['check_type', 'status']
    readonly_fields = ['checked_at']
    ordering = ['-checked_at']


@admin.register(FairLendingReport)
class FairLendingReportAdmin(admin.ModelAdmin):
    list_display = ['report_type', 'period_start', 'period_end', 'generated_at']
    list_filter = ['report_type', 'generated_at']
    readonly_fields = ['generated_at']
    ordering = ['-generated_at']

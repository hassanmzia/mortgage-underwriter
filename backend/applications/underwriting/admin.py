"""
Underwriting Admin Configuration
"""
from django.contrib import admin
from .models import UnderwritingWorkflow, AgentAnalysis, UnderwritingDecision, RiskFactor, Condition, AuditTrail


class AgentAnalysisInline(admin.TabularInline):
    model = AgentAnalysis
    extra = 0
    readonly_fields = ['agent_type', 'status', 'started_at', 'completed_at']


class RiskFactorInline(admin.TabularInline):
    model = RiskFactor
    extra = 0


class ConditionInline(admin.TabularInline):
    model = Condition
    extra = 0


@admin.register(UnderwritingWorkflow)
class UnderwritingWorkflowAdmin(admin.ModelAdmin):
    list_display = ['id', 'application', 'status', 'current_agent', 'assigned_underwriter', 'started_at']
    list_filter = ['status', 'current_agent', 'requires_human_review']
    search_fields = ['application__application_number', 'assigned_underwriter__username']
    readonly_fields = ['started_at', 'completed_at']
    inlines = [AgentAnalysisInline]
    ordering = ['-started_at']


@admin.register(AgentAnalysis)
class AgentAnalysisAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'agent_type', 'status', 'risk_score', 'started_at', 'completed_at']
    list_filter = ['agent_type', 'status', 'recommendation']
    readonly_fields = ['started_at', 'completed_at']


@admin.register(UnderwritingDecision)
class UnderwritingDecisionAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'decision', 'confidence_score', 'decided_by', 'decided_at']
    list_filter = ['decision', 'is_automated']
    readonly_fields = ['decided_at']
    inlines = [RiskFactorInline, ConditionInline]


@admin.register(AuditTrail)
class AuditTrailAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'action', 'performed_by', 'timestamp']
    list_filter = ['action', 'timestamp']
    search_fields = ['workflow__application__application_number', 'performed_by__username']
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']

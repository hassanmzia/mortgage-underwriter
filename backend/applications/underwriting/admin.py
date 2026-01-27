"""
Underwriting Admin Configuration
"""
from django.contrib import admin
from .models import UnderwritingWorkflow, AgentAnalysis, UnderwritingDecision, RiskFactor, Condition, AuditTrail


@admin.register(UnderwritingWorkflow)
class UnderwritingWorkflowAdmin(admin.ModelAdmin):
    list_display = ['id', 'application', 'current_stage', 'started_at']
    list_filter = ['current_stage']
    ordering = ['-started_at']


@admin.register(AgentAnalysis)
class AgentAnalysisAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'agent_type', 'created_at']
    list_filter = ['agent_type']


@admin.register(UnderwritingDecision)
class UnderwritingDecisionAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'created_at']


@admin.register(RiskFactor)
class RiskFactorAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'category', 'severity', 'created_at']
    list_filter = ['category', 'severity']


@admin.register(Condition)
class ConditionAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'condition_type', 'created_at']
    list_filter = ['condition_type']


@admin.register(AuditTrail)
class AuditTrailAdmin(admin.ModelAdmin):
    list_display = ['workflow', 'user', 'created_at']
    ordering = ['-created_at']

"""
Agents Admin Configuration
"""
from django.contrib import admin
from .models import AgentConfiguration, AgentMetrics, PolicyDocument, ToolExecution


@admin.register(AgentConfiguration)
class AgentConfigurationAdmin(admin.ModelAdmin):
    list_display = ['name', 'agent_type', 'is_active', 'model_name', 'created_at']
    list_filter = ['agent_type', 'is_active']
    search_fields = ['name', 'agent_type']


@admin.register(AgentMetrics)
class AgentMetricsAdmin(admin.ModelAdmin):
    list_display = ['agent', 'date', 'total_analyses', 'successful_analyses', 'avg_processing_time']
    list_filter = ['agent', 'date']
    ordering = ['-date']


@admin.register(PolicyDocument)
class PolicyDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'version', 'is_active', 'effective_date']
    list_filter = ['category', 'is_active']
    search_fields = ['title', 'content']


@admin.register(ToolExecution)
class ToolExecutionAdmin(admin.ModelAdmin):
    list_display = ['tool_name', 'agent', 'workflow', 'success', 'execution_time_ms', 'executed_at']
    list_filter = ['tool_name', 'success', 'executed_at']
    readonly_fields = ['executed_at']
    ordering = ['-executed_at']

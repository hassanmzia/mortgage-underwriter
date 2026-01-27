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
    list_display = ['agent_config', 'period_start', 'period_end', 'total_executions', 'successful_executions']
    list_filter = ['agent_config', 'period_start']
    ordering = ['-period_end']


@admin.register(PolicyDocument)
class PolicyDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'category', 'version', 'is_active', 'effective_date']
    list_filter = ['category', 'is_active']
    search_fields = ['title', 'content']


@admin.register(ToolExecution)
class ToolExecutionAdmin(admin.ModelAdmin):
    list_display = ['tool_name', 'agent_type', 'workflow_id', 'success', 'execution_time_ms', 'timestamp']
    list_filter = ['tool_name', 'success', 'timestamp']
    readonly_fields = ['timestamp']
    ordering = ['-timestamp']

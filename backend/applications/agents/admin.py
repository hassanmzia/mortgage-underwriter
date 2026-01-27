"""
Agents Admin Configuration
"""
from django.contrib import admin
from .models import AgentConfiguration, AgentMetrics, PolicyDocument, ToolExecution

admin.site.register(AgentConfiguration)
admin.site.register(AgentMetrics)
admin.site.register(PolicyDocument)
admin.site.register(ToolExecution)

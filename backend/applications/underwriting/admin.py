"""
Underwriting Admin Configuration
"""
from django.contrib import admin
from .models import UnderwritingWorkflow, AgentAnalysis, UnderwritingDecision, RiskFactor, Condition, AuditTrail

admin.site.register(UnderwritingWorkflow)
admin.site.register(AgentAnalysis)
admin.site.register(UnderwritingDecision)
admin.site.register(RiskFactor)
admin.site.register(Condition)
admin.site.register(AuditTrail)

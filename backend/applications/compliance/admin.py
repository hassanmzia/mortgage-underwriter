"""
Compliance Admin Configuration
"""
from django.contrib import admin
from .models import BiasFlag, PIISanitizationLog, ComplianceCheck, FairLendingReport

admin.site.register(BiasFlag)
admin.site.register(PIISanitizationLog)
admin.site.register(ComplianceCheck)
admin.site.register(FairLendingReport)

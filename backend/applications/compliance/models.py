"""
Compliance Models - Bias detection, fair lending, and regulatory compliance
"""
import uuid
from django.db import models
from applications.applications.models import LoanApplication
from applications.users.models import User


class BiasFlag(models.Model):
    """Flags for potential bias in underwriting decisions"""

    class Severity(models.TextChoices):
        LOW = 'low', 'Low'
        MEDIUM = 'medium', 'Medium'
        HIGH = 'high', 'High'
        CRITICAL = 'critical', 'Critical'

    class BiasCategory(models.TextChoices):
        PROTECTED_CLASS = 'protected_class', 'Protected Class Reference'
        REDLINING = 'redlining', 'Geographic Redlining'
        DISPARATE_TREATMENT = 'disparate_treatment', 'Disparate Treatment'
        DISPARATE_IMPACT = 'disparate_impact', 'Disparate Impact'
        LANGUAGE_BIAS = 'language_bias', 'Biased Language'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        LoanApplication,
        on_delete=models.CASCADE,
        related_name='bias_flags'
    )

    category = models.CharField(max_length=25, choices=BiasCategory.choices)
    severity = models.CharField(max_length=10, choices=Severity.choices)
    description = models.TextField()
    source_text = models.TextField(blank=True)  # The text that triggered the flag
    agent_source = models.CharField(max_length=50)  # Which agent generated it

    # Resolution
    resolved = models.BooleanField(default=False)
    resolved_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_bias_flags'
    )
    resolution_notes = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'bias_flags'
        verbose_name = 'Bias Flag'
        verbose_name_plural = 'Bias Flags'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.category} - {self.severity}: {self.description[:50]}"


class PIISanitizationLog(models.Model):
    """Log of PII sanitization for compliance"""

    class PIIType(models.TextChoices):
        SSN = 'ssn', 'Social Security Number'
        NAME = 'name', 'Full Name'
        ADDRESS = 'address', 'Address'
        PHONE = 'phone', 'Phone Number'
        EMAIL = 'email', 'Email Address'
        DOB = 'dob', 'Date of Birth'
        ACCOUNT = 'account', 'Account Number'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        LoanApplication,
        on_delete=models.CASCADE,
        related_name='pii_sanitization_logs'
    )

    pii_type = models.CharField(max_length=20, choices=PIIType.choices)
    field_name = models.CharField(max_length=100)
    sanitization_method = models.CharField(max_length=50)
    original_hash = models.CharField(max_length=64)  # SHA-256 hash for verification

    sanitized_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'pii_sanitization_logs'
        verbose_name = 'PII Sanitization Log'
        verbose_name_plural = 'PII Sanitization Logs'
        ordering = ['-sanitized_at']

    def __str__(self):
        return f"{self.pii_type} sanitized for {self.application.case_id}"


class ComplianceCheck(models.Model):
    """Compliance check results"""

    class CheckType(models.TextChoices):
        ECOA = 'ecoa', 'Equal Credit Opportunity Act'
        FAIR_HOUSING = 'fair_housing', 'Fair Housing Act'
        HMDA = 'hmda', 'Home Mortgage Disclosure Act'
        RESPA = 'respa', 'Real Estate Settlement Procedures Act'
        TILA = 'tila', 'Truth in Lending Act'
        GDPR = 'gdpr', 'GDPR Compliance'
        CCPA = 'ccpa', 'CCPA Compliance'
        FCRA = 'fcra', 'Fair Credit Reporting Act'

    class Status(models.TextChoices):
        PASSED = 'passed', 'Passed'
        FAILED = 'failed', 'Failed'
        WARNING = 'warning', 'Warning'
        REVIEW = 'review', 'Needs Review'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        LoanApplication,
        on_delete=models.CASCADE,
        related_name='compliance_checks'
    )

    check_type = models.CharField(max_length=20, choices=CheckType.choices)
    status = models.CharField(max_length=10, choices=Status.choices)
    description = models.TextField()
    details = models.JSONField(default=dict)

    checked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'compliance_checks'
        verbose_name = 'Compliance Check'
        verbose_name_plural = 'Compliance Checks'
        ordering = ['-checked_at']

    def __str__(self):
        return f"{self.check_type} - {self.status}"


class FairLendingReport(models.Model):
    """Fair lending analysis reports"""

    class ReportType(models.TextChoices):
        DAILY = 'daily', 'Daily'
        WEEKLY = 'weekly', 'Weekly'
        MONTHLY = 'monthly', 'Monthly'
        QUARTERLY = 'quarterly', 'Quarterly'
        AD_HOC = 'ad_hoc', 'Ad Hoc'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    report_type = models.CharField(max_length=15, choices=ReportType.choices)
    period_start = models.DateField()
    period_end = models.DateField()

    # Statistics
    total_applications = models.IntegerField()
    approved = models.IntegerField()
    denied = models.IntegerField()
    conditional = models.IntegerField()

    # Disparate impact analysis
    approval_rate_overall = models.DecimalField(max_digits=5, decimal_places=2)
    disparate_impact_detected = models.BooleanField(default=False)
    disparate_impact_details = models.JSONField(default=dict)

    # Bias flags
    total_bias_flags = models.IntegerField()
    critical_flags = models.IntegerField()
    unresolved_flags = models.IntegerField()

    # Report content
    summary = models.TextField()
    recommendations = models.JSONField(default=list)

    generated_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='generated_fair_lending_reports'
    )
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'fair_lending_reports'
        verbose_name = 'Fair Lending Report'
        verbose_name_plural = 'Fair Lending Reports'
        ordering = ['-period_end']

    def __str__(self):
        return f"Fair Lending Report ({self.period_start} - {self.period_end})"

"""
Compliance Serializers
"""
from rest_framework import serializers
from .models import BiasFlag, PIISanitizationLog, ComplianceCheck, FairLendingReport


class BiasFlagSerializer(serializers.ModelSerializer):
    """Serializer for Bias Flag"""
    application_case_id = serializers.CharField(
        source='application.case_id',
        read_only=True
    )
    resolved_by_name = serializers.CharField(
        source='resolved_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = BiasFlag
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class PIISanitizationLogSerializer(serializers.ModelSerializer):
    """Serializer for PII Sanitization Log"""

    class Meta:
        model = PIISanitizationLog
        fields = '__all__'
        read_only_fields = ['id', 'sanitized_at']


class ComplianceCheckSerializer(serializers.ModelSerializer):
    """Serializer for Compliance Check"""
    application_case_id = serializers.CharField(
        source='application.case_id',
        read_only=True
    )

    class Meta:
        model = ComplianceCheck
        fields = '__all__'
        read_only_fields = ['id', 'checked_at']


class FairLendingReportSerializer(serializers.ModelSerializer):
    """Serializer for Fair Lending Report"""
    generated_by_name = serializers.CharField(
        source='generated_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = FairLendingReport
        fields = '__all__'
        read_only_fields = ['id', 'generated_at']


class BiasResolutionSerializer(serializers.Serializer):
    """Serializer for resolving bias flags"""
    resolution_notes = serializers.CharField()


class ComplianceSummarySerializer(serializers.Serializer):
    """Serializer for compliance summary"""
    total_bias_flags = serializers.IntegerField()
    unresolved_flags = serializers.IntegerField()
    critical_flags = serializers.IntegerField()
    compliance_checks_passed = serializers.IntegerField()
    compliance_checks_failed = serializers.IntegerField()
    applications_with_flags = serializers.IntegerField()

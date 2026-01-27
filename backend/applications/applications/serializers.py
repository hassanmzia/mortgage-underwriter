"""
Loan Application Serializers
"""
from rest_framework import serializers
from .models import (
    LoanApplication, Borrower, CreditProfile, Employment,
    Asset, Liability, Property, LargeDeposit, Document
)


class CreditProfileSerializer(serializers.ModelSerializer):
    """Serializer for Credit Profile"""
    credit_utilization = serializers.ReadOnlyField()

    class Meta:
        model = CreditProfile
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class EmploymentSerializer(serializers.ModelSerializer):
    """Serializer for Employment"""
    total_monthly_income = serializers.ReadOnlyField()

    class Meta:
        model = Employment
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class AssetSerializer(serializers.ModelSerializer):
    """Serializer for Asset"""

    class Meta:
        model = Asset
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class LiabilitySerializer(serializers.ModelSerializer):
    """Serializer for Liability"""

    class Meta:
        model = Liability
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class LargeDepositSerializer(serializers.ModelSerializer):
    """Serializer for Large Deposit"""

    class Meta:
        model = LargeDeposit
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class BorrowerSerializer(serializers.ModelSerializer):
    """Serializer for Borrower with nested relations"""
    credit_profile = CreditProfileSerializer(read_only=True)
    employments = EmploymentSerializer(many=True, read_only=True)
    assets = AssetSerializer(many=True, read_only=True)
    liabilities = LiabilitySerializer(many=True, read_only=True)
    large_deposits = LargeDepositSerializer(many=True, read_only=True)
    full_name = serializers.ReadOnlyField()
    masked_ssn = serializers.ReadOnlyField()

    class Meta:
        model = Borrower
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'ssn_encrypted': {'write_only': True}
        }


class BorrowerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Borrower"""

    class Meta:
        model = Borrower
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class PropertySerializer(serializers.ModelSerializer):
    """Serializer for Property"""
    full_address = serializers.ReadOnlyField()
    monthly_taxes = serializers.ReadOnlyField()
    monthly_insurance = serializers.ReadOnlyField()
    total_monthly_escrow = serializers.ReadOnlyField()

    class Meta:
        model = Property
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at']


class DocumentSerializer(serializers.ModelSerializer):
    """Serializer for Document"""
    reviewed_by_name = serializers.CharField(
        source='reviewed_by.get_full_name',
        read_only=True
    )

    class Meta:
        model = Document
        fields = '__all__'
        read_only_fields = ['id', 'uploaded_at', 'updated_at']


class LoanApplicationListSerializer(serializers.ModelSerializer):
    """Serializer for list view - minimal data"""
    borrower_name = serializers.SerializerMethodField()
    property_address = serializers.SerializerMethodField()
    assigned_underwriter_name = serializers.CharField(
        source='assigned_underwriter.get_full_name',
        read_only=True
    )
    ltv_ratio = serializers.ReadOnlyField()

    class Meta:
        model = LoanApplication
        fields = [
            'id', 'case_id', 'status', 'loan_type', 'loan_purpose',
            'loan_amount', 'down_payment', 'borrower_name', 'property_address',
            'ai_recommendation', 'ai_risk_score', 'requires_human_review',
            'assigned_underwriter', 'assigned_underwriter_name',
            'ltv_ratio', 'created_at', 'submitted_at'
        ]

    def get_borrower_name(self, obj):
        primary = obj.borrowers.filter(borrower_type='primary').first()
        return primary.full_name if primary else None

    def get_property_address(self, obj):
        if hasattr(obj, 'property') and obj.property:
            return obj.property.full_address
        return None


class LoanApplicationDetailSerializer(serializers.ModelSerializer):
    """Serializer for detailed view - all data"""
    borrowers = BorrowerSerializer(many=True, read_only=True)
    property = PropertySerializer(read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    assigned_underwriter_name = serializers.CharField(
        source='assigned_underwriter.get_full_name',
        read_only=True
    )
    processor_name = serializers.CharField(
        source='processor.get_full_name',
        read_only=True
    )
    ltv_ratio = serializers.ReadOnlyField()
    purchase_price = serializers.ReadOnlyField()

    class Meta:
        model = LoanApplication
        fields = '__all__'
        read_only_fields = ['id', 'case_id', 'created_at', 'updated_at']


class LoanApplicationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating loan application"""

    class Meta:
        model = LoanApplication
        fields = [
            'loan_type', 'loan_purpose', 'loan_amount', 'down_payment',
            'interest_rate', 'loan_term_months', 'estimated_monthly_payment',
            'occupancy_type', 'source', 'notes'
        ]


class DTICalculationSerializer(serializers.Serializer):
    """Serializer for DTI calculation request"""
    monthly_income = serializers.DecimalField(max_digits=12, decimal_places=2)
    monthly_debts = serializers.DecimalField(max_digits=12, decimal_places=2)
    proposed_payment = serializers.DecimalField(max_digits=10, decimal_places=2)


class LTVCalculationSerializer(serializers.Serializer):
    """Serializer for LTV calculation request"""
    loan_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    property_value = serializers.DecimalField(max_digits=12, decimal_places=2)


class ApplicationSummarySerializer(serializers.Serializer):
    """Serializer for application dashboard summary"""
    total_applications = serializers.IntegerField()
    pending_review = serializers.IntegerField()
    approved = serializers.IntegerField()
    denied = serializers.IntegerField()
    conditional = serializers.IntegerField()
    total_loan_volume = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_processing_time = serializers.FloatField()

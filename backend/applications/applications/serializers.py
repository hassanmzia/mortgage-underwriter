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
    """Serializer for creating loan application with optional borrower and property data"""
    borrower_data = serializers.DictField(required=False, write_only=True)
    property_data = serializers.DictField(required=False, write_only=True)

    class Meta:
        model = LoanApplication
        fields = [
            'loan_type', 'loan_purpose', 'loan_amount', 'down_payment',
            'interest_rate', 'loan_term_months', 'estimated_monthly_payment',
            'occupancy_type', 'source', 'notes',
            'borrower_data', 'property_data'
        ]

    def create(self, validated_data):
        from decimal import Decimal
        borrower_data = validated_data.pop('borrower_data', None)
        property_data = validated_data.pop('property_data', None)

        application = LoanApplication.objects.create(**validated_data)

        # Create borrower if data provided
        if borrower_data:
            ssn = borrower_data.pop('ssn', '')
            Borrower.objects.create(
                application=application,
                borrower_type='primary',
                first_name=borrower_data.get('first_name', ''),
                last_name=borrower_data.get('last_name', ''),
                email=borrower_data.get('email', ''),
                phone=borrower_data.get('phone', ''),
                date_of_birth=borrower_data.get('date_of_birth'),
                ssn_last_four=ssn[-4:] if ssn else '',
                ssn_encrypted=ssn,
                street_address=borrower_data.get('street_address', ''),
                city=borrower_data.get('city', ''),
                state=borrower_data.get('state', ''),
                zip_code=borrower_data.get('zip_code', ''),
                years_at_address=Decimal('0'),
            )

        # Create property if data provided
        if property_data:
            estimated_value = property_data.get('estimated_value')
            purchase_price = estimated_value or validated_data.get('loan_amount', 0) + validated_data.get('down_payment', 0)
            Property.objects.create(
                application=application,
                street_address=property_data.get('address', ''),
                city=property_data.get('city', ''),
                state=property_data.get('state', ''),
                zip_code=property_data.get('zip_code', ''),
                county='',
                property_type=property_data.get('property_type', 'single_family'),
                year_built=0,
                square_feet=0,
                bedrooms=0,
                bathrooms=Decimal('0'),
                purchase_price=Decimal(str(purchase_price)) if purchase_price else Decimal('0'),
                appraised_value=Decimal(str(estimated_value)) if estimated_value else None,
            )

        return application


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

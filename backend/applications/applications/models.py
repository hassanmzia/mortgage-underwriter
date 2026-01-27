"""
Loan Application Models for Mortgage Underwriting System
Comprehensive data models for mortgage applications
"""
import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from applications.users.models import User


class LoanApplication(models.Model):
    """Main loan application model"""

    class Status(models.TextChoices):
        DRAFT = 'draft', 'Draft'
        SUBMITTED = 'submitted', 'Submitted'
        IN_REVIEW = 'in_review', 'In Review'
        PROCESSING = 'processing', 'Processing'
        UNDERWRITING = 'underwriting', 'Underwriting'
        APPROVED = 'approved', 'Approved'
        CONDITIONAL = 'conditional', 'Conditional Approval'
        DENIED = 'denied', 'Denied'
        SUSPENDED = 'suspended', 'Suspended'
        WITHDRAWN = 'withdrawn', 'Withdrawn'
        CLOSED = 'closed', 'Closed'

    class LoanType(models.TextChoices):
        CONVENTIONAL = 'conventional', 'Conventional'
        FHA = 'fha', 'FHA'
        VA = 'va', 'VA'
        USDA = 'usda', 'USDA'
        JUMBO = 'jumbo', 'Jumbo'

    class LoanPurpose(models.TextChoices):
        PURCHASE = 'purchase', 'Purchase'
        REFINANCE = 'refinance', 'Refinance'
        CASH_OUT_REFINANCE = 'cash_out_refinance', 'Cash-Out Refinance'
        CONSTRUCTION = 'construction', 'Construction'

    class OccupancyType(models.TextChoices):
        PRIMARY = 'primary', 'Primary Residence'
        SECONDARY = 'secondary', 'Secondary/Vacation'
        INVESTMENT = 'investment', 'Investment Property'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    case_id = models.CharField(max_length=50, unique=True, db_index=True)

    # Application status
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DRAFT,
        db_index=True
    )

    # Loan details
    loan_type = models.CharField(max_length=20, choices=LoanType.choices)
    loan_purpose = models.CharField(max_length=25, choices=LoanPurpose.choices)
    loan_amount = models.DecimalField(max_digits=12, decimal_places=2)
    down_payment = models.DecimalField(max_digits=12, decimal_places=2)
    interest_rate = models.DecimalField(
        max_digits=5, decimal_places=3,
        null=True, blank=True
    )
    loan_term_months = models.IntegerField(default=360)  # 30 years
    estimated_monthly_payment = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True
    )

    # Property details
    occupancy_type = models.CharField(max_length=20, choices=OccupancyType.choices)

    # Assignment
    assigned_underwriter = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_applications'
    )
    processor = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='processed_applications'
    )

    # AI Processing
    ai_recommendation = models.CharField(max_length=20, blank=True)
    ai_risk_score = models.IntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    ai_confidence_score = models.DecimalField(
        max_digits=5, decimal_places=2,
        null=True, blank=True
    )
    requires_human_review = models.BooleanField(default=False)
    human_review_completed = models.BooleanField(default=False)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    decision_at = models.DateTimeField(null=True, blank=True)

    # Metadata
    source = models.CharField(max_length=50, default='web')
    notes = models.TextField(blank=True)

    class Meta:
        db_table = 'loan_applications'
        verbose_name = 'Loan Application'
        verbose_name_plural = 'Loan Applications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['assigned_underwriter', 'status']),
            models.Index(fields=['case_id']),
        ]

    def __str__(self):
        return f"{self.case_id} - {self.status}"

    def save(self, *args, **kwargs):
        if not self.case_id:
            # Generate case ID
            from datetime import datetime
            date_str = datetime.now().strftime('%Y%m%d')
            count = LoanApplication.objects.filter(
                case_id__startswith=f'MU-{date_str}'
            ).count() + 1
            self.case_id = f'MU-{date_str}-{count:04d}'
        super().save(*args, **kwargs)

    @property
    def ltv_ratio(self):
        """Calculate Loan-to-Value ratio"""
        if hasattr(self, 'property') and self.property.appraised_value:
            return (self.loan_amount / self.property.appraised_value) * 100
        return None

    @property
    def purchase_price(self):
        """Calculate total purchase price"""
        return self.loan_amount + self.down_payment


class Borrower(models.Model):
    """Borrower information (PII stored encrypted)"""

    class BorrowerType(models.TextChoices):
        PRIMARY = 'primary', 'Primary Borrower'
        CO_BORROWER = 'co_borrower', 'Co-Borrower'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        LoanApplication,
        on_delete=models.CASCADE,
        related_name='borrowers'
    )
    borrower_type = models.CharField(
        max_length=15,
        choices=BorrowerType.choices,
        default=BorrowerType.PRIMARY
    )

    # PII - should be encrypted at rest
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    middle_name = models.CharField(max_length=100, blank=True)
    ssn_encrypted = models.CharField(max_length=255)  # Encrypted SSN
    ssn_last_four = models.CharField(max_length=4)  # For display
    date_of_birth = models.DateField()
    email = models.EmailField()
    phone = models.CharField(max_length=20)

    # Address
    street_address = models.CharField(max_length=255)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)
    years_at_address = models.DecimalField(max_digits=4, decimal_places=1)

    # Demographics (optional, for fair lending compliance tracking)
    citizenship_status = models.CharField(max_length=50, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'borrowers'
        verbose_name = 'Borrower'
        verbose_name_plural = 'Borrowers'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"

    @property
    def masked_ssn(self):
        return f"***-**-{self.ssn_last_four}"


class CreditProfile(models.Model):
    """Credit information for borrower"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    borrower = models.OneToOneField(
        Borrower,
        on_delete=models.CASCADE,
        related_name='credit_profile'
    )

    # Credit scores from bureaus
    credit_score = models.IntegerField(
        validators=[MinValueValidator(300), MaxValueValidator(850)]
    )
    experian_score = models.IntegerField(null=True, blank=True)
    equifax_score = models.IntegerField(null=True, blank=True)
    transunion_score = models.IntegerField(null=True, blank=True)

    # Credit history
    bankruptcies = models.IntegerField(default=0)
    bankruptcy_discharge_date = models.DateField(null=True, blank=True)
    foreclosures = models.IntegerField(default=0)
    foreclosure_date = models.DateField(null=True, blank=True)
    late_payments_12mo = models.IntegerField(default=0)
    late_payments_24mo = models.IntegerField(default=0)

    # Collections
    collections_count = models.IntegerField(default=0)
    collections_total_amount = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00')
    )

    # Credit utilization
    total_credit_limit = models.DecimalField(
        max_digits=12, decimal_places=2,
        default=Decimal('0.00')
    )
    total_credit_used = models.DecimalField(
        max_digits=12, decimal_places=2,
        default=Decimal('0.00')
    )

    # Credit report date
    report_date = models.DateField()
    report_reference = models.CharField(max_length=100, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'credit_profiles'
        verbose_name = 'Credit Profile'
        verbose_name_plural = 'Credit Profiles'

    def __str__(self):
        return f"Credit Profile for {self.borrower} - Score: {self.credit_score}"

    @property
    def credit_utilization(self):
        if self.total_credit_limit > 0:
            return (self.total_credit_used / self.total_credit_limit) * 100
        return 0


class Employment(models.Model):
    """Employment information for borrower"""

    class EmploymentType(models.TextChoices):
        W2 = 'w2', 'W-2 Employee'
        SELF_EMPLOYED = 'self_employed', 'Self-Employed'
        CONTRACTOR = 'contractor', '1099 Contractor'
        RETIRED = 'retired', 'Retired'
        UNEMPLOYED = 'unemployed', 'Unemployed'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.CASCADE,
        related_name='employments'
    )
    is_current = models.BooleanField(default=True)

    # Employer info
    employer_name = models.CharField(max_length=200)
    employer_address = models.CharField(max_length=255, blank=True)
    employer_phone = models.CharField(max_length=20, blank=True)

    # Position
    position_title = models.CharField(max_length=100)
    employment_type = models.CharField(
        max_length=20,
        choices=EmploymentType.choices
    )

    # Duration
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    years_employed = models.DecimalField(max_digits=4, decimal_places=1)

    # Income
    monthly_income = models.DecimalField(max_digits=10, decimal_places=2)
    annual_income = models.DecimalField(max_digits=12, decimal_places=2)
    bonus_income = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00')
    )
    overtime_income = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00')
    )
    commission_income = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00')
    )

    # Verification
    voe_received = models.BooleanField(default=False)
    voe_date = models.DateField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'employments'
        verbose_name = 'Employment'
        verbose_name_plural = 'Employments'
        ordering = ['-is_current', '-start_date']

    def __str__(self):
        return f"{self.borrower} - {self.employer_name}"

    @property
    def total_monthly_income(self):
        return (
            self.monthly_income +
            (self.bonus_income / 12) +
            (self.overtime_income / 12) +
            (self.commission_income / 12)
        )


class Asset(models.Model):
    """Asset information for borrower"""

    class AssetType(models.TextChoices):
        CHECKING = 'checking', 'Checking Account'
        SAVINGS = 'savings', 'Savings Account'
        MONEY_MARKET = 'money_market', 'Money Market'
        CD = 'cd', 'Certificate of Deposit'
        RETIREMENT = 'retirement', 'Retirement Account (401k/IRA)'
        STOCKS = 'stocks', 'Stocks/Bonds'
        MUTUAL_FUNDS = 'mutual_funds', 'Mutual Funds'
        REAL_ESTATE = 'real_estate', 'Real Estate'
        BUSINESS = 'business', 'Business Equity'
        GIFT = 'gift', 'Gift Funds'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.CASCADE,
        related_name='assets'
    )

    asset_type = models.CharField(max_length=20, choices=AssetType.choices)
    institution_name = models.CharField(max_length=200)
    account_number_last_four = models.CharField(max_length=4, blank=True)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2)

    # For verification
    verified = models.BooleanField(default=False)
    verification_date = models.DateField(null=True, blank=True)

    # For gift funds
    is_gift = models.BooleanField(default=False)
    gift_donor_name = models.CharField(max_length=200, blank=True)
    gift_donor_relationship = models.CharField(max_length=100, blank=True)
    gift_letter_received = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'assets'
        verbose_name = 'Asset'
        verbose_name_plural = 'Assets'

    def __str__(self):
        return f"{self.borrower} - {self.asset_type}: ${self.current_balance}"


class Liability(models.Model):
    """Liability/Debt information for borrower"""

    class LiabilityType(models.TextChoices):
        MORTGAGE = 'mortgage', 'Mortgage'
        HELOC = 'heloc', 'Home Equity Line of Credit'
        AUTO_LOAN = 'auto_loan', 'Auto Loan'
        STUDENT_LOAN = 'student_loan', 'Student Loan'
        CREDIT_CARD = 'credit_card', 'Credit Card'
        PERSONAL_LOAN = 'personal_loan', 'Personal Loan'
        CHILD_SUPPORT = 'child_support', 'Child Support/Alimony'
        OTHER = 'other', 'Other'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.CASCADE,
        related_name='liabilities'
    )

    liability_type = models.CharField(max_length=20, choices=LiabilityType.choices)
    creditor_name = models.CharField(max_length=200)
    account_number_last_four = models.CharField(max_length=4, blank=True)

    # Amounts
    original_balance = models.DecimalField(max_digits=12, decimal_places=2)
    current_balance = models.DecimalField(max_digits=12, decimal_places=2)
    monthly_payment = models.DecimalField(max_digits=10, decimal_places=2)
    months_remaining = models.IntegerField(null=True, blank=True)

    # For payoff scenarios
    to_be_paid_off = models.BooleanField(default=False)
    included_in_dti = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'liabilities'
        verbose_name = 'Liability'
        verbose_name_plural = 'Liabilities'

    def __str__(self):
        return f"{self.borrower} - {self.liability_type}: ${self.monthly_payment}/mo"


class Property(models.Model):
    """Property/Collateral information"""

    class PropertyType(models.TextChoices):
        SINGLE_FAMILY = 'single_family', 'Single Family'
        CONDO = 'condo', 'Condominium'
        TOWNHOUSE = 'townhouse', 'Townhouse'
        MULTI_FAMILY = 'multi_family', 'Multi-Family (2-4 units)'
        MANUFACTURED = 'manufactured', 'Manufactured Home'
        CO_OP = 'co_op', 'Cooperative'

    class PropertyCondition(models.TextChoices):
        EXCELLENT = 'excellent', 'Excellent'
        GOOD = 'good', 'Good'
        AVERAGE = 'average', 'Average'
        FAIR = 'fair', 'Fair'
        POOR = 'poor', 'Poor'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.OneToOneField(
        LoanApplication,
        on_delete=models.CASCADE,
        related_name='property'
    )

    # Address
    street_address = models.CharField(max_length=255)
    unit_number = models.CharField(max_length=20, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=2)
    zip_code = models.CharField(max_length=10)
    county = models.CharField(max_length=100)

    # Property details
    property_type = models.CharField(max_length=20, choices=PropertyType.choices)
    year_built = models.IntegerField()
    square_feet = models.IntegerField()
    lot_size_sqft = models.IntegerField(null=True, blank=True)
    bedrooms = models.IntegerField()
    bathrooms = models.DecimalField(max_digits=3, decimal_places=1)
    stories = models.IntegerField(default=1)
    garage_spaces = models.IntegerField(default=0)

    # Valuation
    purchase_price = models.DecimalField(max_digits=12, decimal_places=2)
    appraised_value = models.DecimalField(
        max_digits=12, decimal_places=2,
        null=True, blank=True
    )
    appraisal_date = models.DateField(null=True, blank=True)
    appraiser_name = models.CharField(max_length=200, blank=True)
    appraiser_license = models.CharField(max_length=50, blank=True)

    # Condition
    condition = models.CharField(
        max_length=20,
        choices=PropertyCondition.choices,
        default=PropertyCondition.AVERAGE
    )
    condition_notes = models.TextField(blank=True)

    # Additional info
    hoa_monthly = models.DecimalField(
        max_digits=8, decimal_places=2,
        default=Decimal('0.00')
    )
    property_taxes_annual = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00')
    )
    insurance_annual = models.DecimalField(
        max_digits=10, decimal_places=2,
        default=Decimal('0.00')
    )

    # Flood zone
    in_flood_zone = models.BooleanField(default=False)
    flood_zone_designation = models.CharField(max_length=20, blank=True)
    flood_insurance_required = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'properties'
        verbose_name = 'Property'
        verbose_name_plural = 'Properties'

    def __str__(self):
        return f"{self.street_address}, {self.city}, {self.state}"

    @property
    def full_address(self):
        addr = self.street_address
        if self.unit_number:
            addr += f" #{self.unit_number}"
        return f"{addr}, {self.city}, {self.state} {self.zip_code}"

    @property
    def monthly_taxes(self):
        return self.property_taxes_annual / 12

    @property
    def monthly_insurance(self):
        return self.insurance_annual / 12

    @property
    def total_monthly_escrow(self):
        return self.monthly_taxes + self.monthly_insurance + self.hoa_monthly


class LargeDeposit(models.Model):
    """Track large deposits requiring sourcing documentation"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.CASCADE,
        related_name='large_deposits'
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    deposit_date = models.DateField()
    source_explanation = models.TextField()
    documentation_provided = models.BooleanField(default=False)
    verified = models.BooleanField(default=False)
    verification_notes = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'large_deposits'
        verbose_name = 'Large Deposit'
        verbose_name_plural = 'Large Deposits'

    def __str__(self):
        return f"${self.amount} on {self.deposit_date}"


class Document(models.Model):
    """Documents attached to loan application"""

    class DocumentType(models.TextChoices):
        PAYSTUB = 'paystub', 'Pay Stub'
        W2 = 'w2', 'W-2'
        TAX_RETURN = 'tax_return', 'Tax Return'
        BANK_STATEMENT = 'bank_statement', 'Bank Statement'
        DRIVERS_LICENSE = 'drivers_license', "Driver's License"
        APPRAISAL = 'appraisal', 'Appraisal Report'
        PURCHASE_CONTRACT = 'purchase_contract', 'Purchase Contract'
        GIFT_LETTER = 'gift_letter', 'Gift Letter'
        VOE = 'voe', 'Verification of Employment'
        VOD = 'vod', 'Verification of Deposit'
        CREDIT_REPORT = 'credit_report', 'Credit Report'
        TITLE_REPORT = 'title_report', 'Title Report'
        INSURANCE = 'insurance', 'Insurance Documentation'
        OTHER = 'other', 'Other'

    class DocumentStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        RECEIVED = 'received', 'Received'
        REVIEWED = 'reviewed', 'Reviewed'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'
        EXPIRED = 'expired', 'Expired'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        LoanApplication,
        on_delete=models.CASCADE,
        related_name='documents'
    )
    borrower = models.ForeignKey(
        Borrower,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='documents'
    )

    document_type = models.CharField(max_length=30, choices=DocumentType.choices)
    status = models.CharField(
        max_length=20,
        choices=DocumentStatus.choices,
        default=DocumentStatus.PENDING
    )

    file_name = models.CharField(max_length=255)
    file_path = models.CharField(max_length=500)
    file_size = models.IntegerField()  # bytes
    mime_type = models.CharField(max_length=100)

    description = models.TextField(blank=True)
    review_notes = models.TextField(blank=True)
    reviewed_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'documents'
        verbose_name = 'Document'
        verbose_name_plural = 'Documents'
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.document_type} - {self.file_name}"

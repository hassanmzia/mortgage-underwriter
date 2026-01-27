"""
Applications Admin Configuration
"""
from django.contrib import admin
from .models import (
    LoanApplication, Borrower, CreditProfile, Employment,
    Asset, Liability, Property, LargeDeposit, Document
)


@admin.register(LoanApplication)
class LoanApplicationAdmin(admin.ModelAdmin):
    list_display = ['case_id', 'loan_type', 'loan_amount', 'status', 'created_at']
    list_filter = ['status', 'loan_type', 'loan_purpose', 'created_at']
    search_fields = ['case_id']
    readonly_fields = ['case_id', 'created_at', 'updated_at']
    ordering = ['-created_at']


@admin.register(Borrower)
class BorrowerAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'borrower_type', 'application']
    list_filter = ['borrower_type', 'citizenship_status']
    search_fields = ['first_name', 'last_name', 'email']


@admin.register(CreditProfile)
class CreditProfileAdmin(admin.ModelAdmin):
    list_display = ['borrower', 'credit_score', 'credit_bureau']
    list_filter = ['credit_bureau']


@admin.register(Employment)
class EmploymentAdmin(admin.ModelAdmin):
    list_display = ['borrower', 'employer_name', 'is_current', 'monthly_income']
    list_filter = ['is_current', 'employment_type']


@admin.register(Asset)
class AssetAdmin(admin.ModelAdmin):
    list_display = ['borrower', 'asset_type', 'institution_name', 'current_value']
    list_filter = ['asset_type']


@admin.register(Liability)
class LiabilityAdmin(admin.ModelAdmin):
    list_display = ['borrower', 'liability_type', 'creditor_name', 'monthly_payment']
    list_filter = ['liability_type']


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['street_address', 'city', 'state', 'property_type', 'application']
    list_filter = ['property_type', 'state']
    search_fields = ['street_address', 'city', 'zip_code']


@admin.register(LargeDeposit)
class LargeDepositAdmin(admin.ModelAdmin):
    list_display = ['borrower', 'amount', 'deposit_date', 'source_verified']
    list_filter = ['source_verified']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['document_type', 'application', 'uploaded_at']
    list_filter = ['document_type', 'uploaded_at']

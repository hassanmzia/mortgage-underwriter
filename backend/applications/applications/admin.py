"""
Applications Admin Configuration
"""
from django.contrib import admin
from .models import (
    LoanApplication, Borrower, CreditProfile, Employment,
    Asset, Liability, Property, LargeDeposit, Document
)


class BorrowerInline(admin.StackedInline):
    model = Borrower
    extra = 0


class CreditProfileInline(admin.StackedInline):
    model = CreditProfile
    extra = 0


class EmploymentInline(admin.TabularInline):
    model = Employment
    extra = 0


class AssetInline(admin.TabularInline):
    model = Asset
    extra = 0


class LiabilityInline(admin.TabularInline):
    model = Liability
    extra = 0


class DocumentInline(admin.TabularInline):
    model = Document
    extra = 0


@admin.register(LoanApplication)
class LoanApplicationAdmin(admin.ModelAdmin):
    list_display = ['application_number', 'loan_type', 'loan_amount', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'loan_type', 'loan_purpose', 'created_at']
    search_fields = ['application_number', 'created_by__username']
    readonly_fields = ['application_number', 'created_at', 'updated_at']
    inlines = [BorrowerInline, DocumentInline]
    ordering = ['-created_at']


@admin.register(Borrower)
class BorrowerAdmin(admin.ModelAdmin):
    list_display = ['first_name', 'last_name', 'email', 'borrower_type', 'application']
    list_filter = ['borrower_type', 'citizenship_status']
    search_fields = ['first_name', 'last_name', 'email', 'ssn_last_four']
    inlines = [CreditProfileInline, EmploymentInline, AssetInline, LiabilityInline]


@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['address_line1', 'city', 'state', 'property_type', 'estimated_value', 'application']
    list_filter = ['property_type', 'occupancy_type', 'state']
    search_fields = ['address_line1', 'city', 'zip_code']


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'document_type', 'application', 'uploaded_at', 'verified']
    list_filter = ['document_type', 'verified', 'uploaded_at']
    search_fields = ['name', 'application__application_number']

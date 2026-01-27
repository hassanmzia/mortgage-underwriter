"""
Applications Admin Configuration
"""
from django.contrib import admin
from .models import (
    LoanApplication, Borrower, CreditProfile, Employment,
    Asset, Liability, Property, LargeDeposit, Document
)

admin.site.register(LoanApplication)
admin.site.register(Borrower)
admin.site.register(CreditProfile)
admin.site.register(Employment)
admin.site.register(Asset)
admin.site.register(Liability)
admin.site.register(Property)
admin.site.register(LargeDeposit)
admin.site.register(Document)

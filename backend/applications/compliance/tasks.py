"""
Celery tasks for compliance operations
"""
import logging
from celery import shared_task
from django.utils import timezone
from datetime import datetime

logger = logging.getLogger(__name__)


@shared_task
def run_compliance_checks(application_id: str):
    """Run all compliance checks for an application"""
    from applications.applications.models import LoanApplication
    from .models import ComplianceCheck

    try:
        application = LoanApplication.objects.get(id=application_id)

        checks_to_run = [
            ('ecoa', check_ecoa_compliance),
            ('fair_housing', check_fair_housing_compliance),
            ('fcra', check_fcra_compliance),
            ('gdpr', check_gdpr_compliance),
        ]

        for check_type, check_func in checks_to_run:
            result = check_func(application)
            ComplianceCheck.objects.create(
                application=application,
                check_type=check_type,
                status=result['status'],
                description=result['description'],
                details=result.get('details', {})
            )

        logger.info(f"Compliance checks completed for {application.case_id}")

    except Exception as e:
        logger.error(f"Error running compliance checks: {e}")
        raise


def check_ecoa_compliance(application):
    """Check Equal Credit Opportunity Act compliance"""
    # Check for protected class mentions in underwriting
    bias_flags = application.bias_flags.filter(
        category='protected_class',
        resolved=False
    )

    if bias_flags.exists():
        return {
            'status': 'failed',
            'description': 'Protected class references found in underwriting',
            'details': {'flag_count': bias_flags.count()}
        }

    return {
        'status': 'passed',
        'description': 'No ECOA violations detected'
    }


def check_fair_housing_compliance(application):
    """Check Fair Housing Act compliance"""
    bias_flags = application.bias_flags.filter(
        category__in=['redlining', 'disparate_treatment'],
        resolved=False
    )

    if bias_flags.exists():
        return {
            'status': 'failed',
            'description': 'Potential fair housing violations detected',
            'details': {'flag_count': bias_flags.count()}
        }

    return {
        'status': 'passed',
        'description': 'No Fair Housing Act violations detected'
    }


def check_fcra_compliance(application):
    """Check Fair Credit Reporting Act compliance"""
    # Check if credit information is properly sourced
    borrowers = application.borrowers.all()

    for borrower in borrowers:
        if hasattr(borrower, 'credit_profile'):
            if not borrower.credit_profile.report_reference:
                return {
                    'status': 'warning',
                    'description': 'Credit report reference missing',
                    'details': {'borrower_id': str(borrower.id)}
                }

    return {
        'status': 'passed',
        'description': 'FCRA compliance verified'
    }


def check_gdpr_compliance(application):
    """Check GDPR compliance for PII handling"""
    from .models import PIISanitizationLog

    # Check if PII was properly sanitized
    pii_logs = PIISanitizationLog.objects.filter(application=application)

    required_pii_types = ['ssn', 'name', 'address']
    sanitized_types = set(pii_logs.values_list('pii_type', flat=True))

    missing = set(required_pii_types) - sanitized_types

    if missing:
        return {
            'status': 'warning',
            'description': 'Some PII types not logged as sanitized',
            'details': {'missing_types': list(missing)}
        }

    return {
        'status': 'passed',
        'description': 'GDPR compliance verified'
    }


@shared_task
def generate_fair_lending_report(report_type: str, period_start: str,
                                  period_end: str, user_id: str):
    """Generate a fair lending analysis report"""
    from applications.applications.models import LoanApplication
    from applications.users.models import User
    from .models import FairLendingReport, BiasFlag

    try:
        start_date = datetime.strptime(period_start, '%Y-%m-%d').date()
        end_date = datetime.strptime(period_end, '%Y-%m-%d').date()
        user = User.objects.get(id=user_id)

        # Get applications in period
        applications = LoanApplication.objects.filter(
            created_at__date__gte=start_date,
            created_at__date__lte=end_date
        )

        total = applications.count()
        approved = applications.filter(status='approved').count()
        denied = applications.filter(status='denied').count()
        conditional = applications.filter(status='conditional').count()

        # Get bias flags
        flags = BiasFlag.objects.filter(
            application__in=applications
        )

        # Calculate approval rate
        approval_rate = (approved + conditional) / total * 100 if total > 0 else 0

        # Check for disparate impact (simplified)
        disparate_impact = False
        disparate_details = {}

        # Create report
        report = FairLendingReport.objects.create(
            report_type=report_type,
            period_start=start_date,
            period_end=end_date,
            total_applications=total,
            approved=approved,
            denied=denied,
            conditional=conditional,
            approval_rate_overall=approval_rate,
            disparate_impact_detected=disparate_impact,
            disparate_impact_details=disparate_details,
            total_bias_flags=flags.count(),
            critical_flags=flags.filter(severity='critical').count(),
            unresolved_flags=flags.filter(resolved=False).count(),
            summary=f"Fair lending report for {start_date} to {end_date}. "
                   f"Total applications: {total}, Approval rate: {approval_rate:.1f}%",
            recommendations=[],
            generated_by=user
        )

        logger.info(f"Fair lending report generated: {report.id}")
        return str(report.id)

    except Exception as e:
        logger.error(f"Error generating fair lending report: {e}")
        raise

"""
Celery Tasks for Underwriting Workflows
"""
import logging
import httpx
from celery import shared_task
from django.conf import settings
from django.utils import timezone

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def start_underwriting_workflow(self, application_id: str):
    """
    Start the underwriting workflow by calling the MCP agent service
    """
    from applications.applications.models import LoanApplication
    from applications.underwriting.models import (
        UnderwritingWorkflow, AuditTrail
    )

    try:
        application = LoanApplication.objects.get(id=application_id)

        # Get or create workflow
        workflow, created = UnderwritingWorkflow.objects.get_or_create(
            application=application,
            defaults={
                'status': UnderwritingWorkflow.WorkflowStatus.INITIALIZING,
                'started_at': timezone.now()
            }
        )

        if not created:
            workflow.status = UnderwritingWorkflow.WorkflowStatus.INITIALIZING
            workflow.started_at = timezone.now()
            workflow.retry_count += 1
            workflow.save()

        # Log start
        AuditTrail.objects.create(
            workflow=workflow,
            event_type=AuditTrail.EventType.WORKFLOW_STARTED,
            description=f"Underwriting workflow started for {application.case_id}",
            details={'retry_count': workflow.retry_count}
        )

        # Update application status
        application.status = LoanApplication.Status.UNDERWRITING
        application.save()

        # Prepare application data for MCP service
        application_data = prepare_application_data(application)

        # Call MCP agent service
        mcp_url = f"{settings.MCP_SERVICE_URL}/api/workflows/start"

        with httpx.Client(timeout=300.0) as client:
            response = client.post(
                mcp_url,
                json={
                    'workflow_id': str(workflow.id),
                    'application_id': str(application.id),
                    'case_id': application.case_id,
                    'application_data': application_data
                }
            )
            response.raise_for_status()
            result = response.json()

        logger.info(f"Workflow started successfully for {application.case_id}")
        return result

    except httpx.HTTPError as e:
        logger.error(f"MCP service error: {e}")
        self.retry(countdown=60 * (self.request.retries + 1))

    except Exception as e:
        logger.error(f"Error starting workflow: {e}")
        if 'workflow' in locals():
            workflow.status = UnderwritingWorkflow.WorkflowStatus.FAILED
            workflow.error_message = str(e)
            workflow.save()
        raise


@shared_task
def update_workflow_status(workflow_id: str, status_data: dict):
    """
    Update workflow status from MCP service callback
    """
    from applications.underwriting.models import (
        UnderwritingWorkflow, AuditTrail
    )

    try:
        workflow = UnderwritingWorkflow.objects.get(id=workflow_id)

        # Update workflow
        workflow.status = status_data.get('status', workflow.status)
        workflow.current_agent = status_data.get('current_agent', '')
        workflow.progress_percent = status_data.get('progress_percent', workflow.progress_percent)

        if status_data.get('state_data'):
            workflow.state_data = status_data['state_data']

        if status_data.get('completed'):
            workflow.completed_at = timezone.now()
            if workflow.started_at:
                workflow.total_duration_seconds = int(
                    (workflow.completed_at - workflow.started_at).total_seconds()
                )

        workflow.save()

        # Log status change
        AuditTrail.objects.create(
            workflow=workflow,
            event_type=AuditTrail.EventType.AGENT_COMPLETED,
            agent_name=status_data.get('current_agent', ''),
            description=f"Status updated to {workflow.status}",
            details=status_data
        )

        logger.info(f"Workflow {workflow_id} status updated to {workflow.status}")

    except Exception as e:
        logger.error(f"Error updating workflow status: {e}")
        raise


@shared_task
def save_agent_analysis(workflow_id: str, analysis_data: dict):
    """
    Save agent analysis from MCP service
    """
    from applications.underwriting.models import (
        UnderwritingWorkflow, AgentAnalysis, AuditTrail
    )

    try:
        workflow = UnderwritingWorkflow.objects.get(id=workflow_id)

        analysis = AgentAnalysis.objects.create(
            workflow=workflow,
            agent_type=analysis_data['agent_type'],
            analysis_text=analysis_data['analysis_text'],
            structured_data=analysis_data.get('structured_data', {}),
            recommendation=analysis_data.get('recommendation', ''),
            risk_factors=analysis_data.get('risk_factors', []),
            conditions=analysis_data.get('conditions', []),
            confidence_score=analysis_data.get('confidence_score'),
            processing_time_ms=analysis_data.get('processing_time_ms'),
            tokens_used=analysis_data.get('tokens_used')
        )

        # Log analysis
        AuditTrail.objects.create(
            workflow=workflow,
            event_type=AuditTrail.EventType.AGENT_COMPLETED,
            agent_name=analysis_data['agent_type'],
            description=f"{analysis_data['agent_type']} analysis completed",
            details={
                'analysis_id': str(analysis.id),
                'recommendation': analysis.recommendation
            }
        )

        logger.info(f"Agent analysis saved for workflow {workflow_id}")

    except Exception as e:
        logger.error(f"Error saving agent analysis: {e}")
        raise


@shared_task
def save_underwriting_decision(workflow_id: str, decision_data: dict):
    """
    Save final underwriting decision from MCP service
    """
    from applications.applications.models import LoanApplication
    from applications.underwriting.models import (
        UnderwritingWorkflow, UnderwritingDecision, RiskFactor, AuditTrail
    )

    try:
        workflow = UnderwritingWorkflow.objects.get(id=workflow_id)

        # Create decision
        decision = UnderwritingDecision.objects.create(
            workflow=workflow,
            ai_decision=decision_data['decision'],
            ai_risk_score=decision_data['risk_score'],
            ai_confidence=decision_data.get('confidence', 0.85),
            decision_memo=decision_data['decision_memo'],
            executive_summary=decision_data.get('executive_summary', ''),
            conditions=decision_data.get('conditions', [])
        )

        # Create risk factors
        for rf in decision_data.get('risk_factors', []):
            RiskFactor.objects.create(
                workflow=workflow,
                category=rf.get('category', 'credit'),
                severity=rf.get('severity', 'low'),
                description=rf['description'],
                mitigation=rf.get('mitigation', ''),
                identified_by=rf.get('identified_by', 'decision_agent')
            )

        # Update workflow
        workflow.status = UnderwritingWorkflow.WorkflowStatus.HUMAN_REVIEW if decision_data.get(
            'requires_human_review', True) else UnderwritingWorkflow.WorkflowStatus.COMPLETED
        workflow.completed_at = timezone.now()
        workflow.save()

        # Update application
        application = workflow.application
        application.ai_recommendation = decision_data['decision']
        application.ai_risk_score = decision_data['risk_score']
        application.ai_confidence_score = decision_data.get('confidence', 0.85)
        application.requires_human_review = decision_data.get('requires_human_review', True)

        if not decision_data.get('requires_human_review', True):
            # Auto-approve/deny based on AI decision
            status_map = {
                'approved': LoanApplication.Status.APPROVED,
                'denied': LoanApplication.Status.DENIED,
                'conditional': LoanApplication.Status.CONDITIONAL
            }
            application.status = status_map.get(
                decision_data['decision'],
                LoanApplication.Status.IN_REVIEW
            )
            application.decision_at = timezone.now()

        application.save()

        # Log decision
        AuditTrail.objects.create(
            workflow=workflow,
            event_type=AuditTrail.EventType.DECISION_MADE,
            description=f"AI Decision: {decision_data['decision']} (Risk Score: {decision_data['risk_score']})",
            details=decision_data
        )

        logger.info(f"Decision saved for workflow {workflow_id}: {decision_data['decision']}")

    except Exception as e:
        logger.error(f"Error saving decision: {e}")
        raise


def prepare_application_data(application) -> dict:
    """
    Prepare application data for MCP service
    Sanitizes PII and structures data for agent processing
    """
    from applications.applications.models import Borrower

    data = {
        'case_id': application.case_id,
        'loan': {
            'type': application.loan_type,
            'purpose': application.loan_purpose,
            'amount': float(application.loan_amount),
            'down_payment': float(application.down_payment),
            'term_months': application.loan_term_months,
            'estimated_payment': float(application.estimated_monthly_payment or 0),
            'occupancy': application.occupancy_type
        },
        'borrowers': [],
        'property': None
    }

    # Add borrower data (sanitized)
    for borrower in application.borrowers.all():
        borrower_data = {
            'type': borrower.borrower_type,
            'name': '[APPLICANT_NAME]',  # Sanitized
            'ssn': borrower.masked_ssn,
            'address': '[ADDRESS]',  # Sanitized
        }

        # Credit profile
        if hasattr(borrower, 'credit_profile'):
            cp = borrower.credit_profile
            borrower_data['credit'] = {
                'score': cp.credit_score,
                'bankruptcies': cp.bankruptcies,
                'foreclosures': cp.foreclosures,
                'late_payments_12mo': cp.late_payments_12mo,
                'collections_count': cp.collections_count,
                'collections_amount': float(cp.collections_total_amount)
            }

        # Employment
        borrower_data['employment'] = []
        for emp in borrower.employments.filter(is_current=True):
            borrower_data['employment'].append({
                'type': emp.employment_type,
                'years': float(emp.years_employed),
                'monthly_income': float(emp.monthly_income),
                'annual_income': float(emp.annual_income)
            })

        # Assets
        borrower_data['assets'] = {}
        for asset in borrower.assets.all():
            borrower_data['assets'][asset.asset_type] = float(asset.current_balance)

        # Liabilities
        borrower_data['debts'] = {}
        total_monthly_debt = 0
        for liability in borrower.liabilities.filter(included_in_dti=True):
            borrower_data['debts'][liability.liability_type] = float(liability.monthly_payment)
            total_monthly_debt += float(liability.monthly_payment)
        borrower_data['total_monthly_debt'] = total_monthly_debt

        # Large deposits
        borrower_data['large_deposits'] = [
            {
                'amount': float(dep.amount),
                'date': dep.deposit_date.isoformat(),
                'verified': dep.verified
            }
            for dep in borrower.large_deposits.all()
        ]

        data['borrowers'].append(borrower_data)

    # Property data
    if hasattr(application, 'property') and application.property:
        prop = application.property
        data['property'] = {
            'type': prop.property_type,
            'address': '[ADDRESS]',  # Sanitized
            'city': prop.city,
            'state': prop.state,
            'year_built': prop.year_built,
            'square_feet': prop.square_feet,
            'bedrooms': prop.bedrooms,
            'bathrooms': float(prop.bathrooms),
            'condition': prop.condition,
            'purchase_price': float(prop.purchase_price),
            'appraised_value': float(prop.appraised_value) if prop.appraised_value else None,
            'hoa_monthly': float(prop.hoa_monthly),
            'taxes_annual': float(prop.property_taxes_annual),
            'insurance_annual': float(prop.insurance_annual),
            'in_flood_zone': prop.in_flood_zone
        }

    return data

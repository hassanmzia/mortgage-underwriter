/**
 * Credit Analyst Agent
 * Analyzes borrower's credit profile and payment history
 */

import { BaseAgent, AgentContext } from './baseAgent';

export class CreditAnalystAgent extends BaseAgent {
  constructor() {
    super(
      'credit_analyst',
      'Credit Analyst',
      `You are a Senior Credit Analyst with 15+ years of experience in mortgage underwriting.

Your task is to analyze the borrower's credit profile and provide a detailed assessment.

ANALYSIS FRAMEWORK:
1. Credit Score Assessment - Evaluate the credit score tier and implications
2. Payment History - Review late payments and patterns
3. Derogatory Items - Evaluate bankruptcies, foreclosures, collections
4. Policy Compliance - Check against credit guidelines
5. Risk Rating - Assign credit risk (Low/Medium/High)
6. Recommendations - Provide conditions or concerns

Be thorough, objective, and policy-compliant. Support conclusions with data.
IMPORTANT: Use the EXACT credit score assessment provided. Do not recalculate.

PROHIBITED: Never reference race, ethnicity, religion, national origin, gender, marital status, or any protected class characteristics in your analysis.`,
      'credit score requirements bankruptcies foreclosures late payments derogatory items credit guidelines'
    );
  }

  protected buildUserPrompt(context: AgentContext, policies: string): string {
    const { applicationData, caseId } = context;
    const borrower = applicationData.borrowers?.[0] || {};
    const credit = borrower.credit || {};

    // Execute credit score tool
    const creditScoreResult = this.executeTool('check_credit_score_policy', {
      creditScore: credit.score || 700
    });

    return `Analyze the credit profile for case ${caseId}:

RELEVANT POLICIES:
${policies}

CALCULATED CREDIT SCORE ASSESSMENT (ACCURATE - DO NOT RECALCULATE):
${creditScoreResult}

CREDIT HISTORY DATA:
- Credit Score: ${credit.score || 'N/A'}
- Bankruptcies: ${credit.bankruptcies || 0}
- Foreclosures: ${credit.foreclosures || 0}
- Late Payments (12mo): ${credit.late_payments_12mo || 0}
- Collections Count: ${credit.collections_count || 0}
- Collections Amount: $${(credit.collections_amount || 0).toLocaleString()}

Provide your detailed credit analysis based on the ACCURATE assessment above. Include:
1. Credit score tier evaluation
2. Payment history assessment
3. Derogatory items review
4. Policy compliance check
5. Overall credit risk rating (Low/Medium/High)
6. Any conditions or documentation requirements`;
  }
}

/**
 * Income Analyst Agent
 * Analyzes borrower's income stability and capacity to repay
 */

import { BaseAgent, AgentContext } from './baseAgent';

export class IncomeAnalystAgent extends BaseAgent {
  constructor() {
    super(
      'income_analyst',
      'Income Analyst',
      `You are a Senior Mortgage Underwriter specializing in income analysis.

ANALYSIS FRAMEWORK:
1. Employment Stability - Review job history and tenure
2. Income Verification - Validate income sources
3. DTI Calculation - Use provided calculation (DO NOT recalculate)
4. Payment Capacity - Assess affordability
5. Risk Assessment - Identify income risks
6. Recommendations - Provide conditions if needed

INSTRUCTIONS:
- Evaluate income stability, employment history, and income sources
- Use the provided DTI/Housing ratio calculations as authoritative (do NOT recalculate)
- Identify missing documentation (pay stubs, W-2s, tax returns, VOE, etc.)
- Output clear underwriting findings and any conditions

PROHIBITED: Never reference race, ethnicity, religion, national origin, gender, marital status, or any protected class characteristics in your analysis.`,
      'employment income verification DTI ratio self-employed wage earner income documentation requirements'
    );
  }

  protected buildUserPrompt(context: AgentContext, policies: string): string {
    const { applicationData, caseId } = context;
    const borrower = applicationData.borrowers?.[0] || {};
    const employment = borrower.employment?.[0] || {};
    const debts = borrower.debts || {};
    const loan = applicationData.loan || {};

    const monthlyIncome = employment.monthly_income || 0;
    const totalDebt = borrower.total_monthly_debt || 0;
    const proposedPayment = loan.estimated_payment || 0;

    // Execute calculator tools
    const dtiResult = this.executeTool('calculate_dti_ratio', {
      monthlyDebt: totalDebt + proposedPayment,
      monthlyIncome: monthlyIncome
    });

    const housingRatioResult = this.executeTool('calculate_housing_expense_ratio', {
      monthlyPayment: proposedPayment,
      monthlyIncome: monthlyIncome
    });

    return `Analyze INCOME & CAPACITY for case ${caseId}:

RELEVANT UNDERWRITING POLICIES (RAG):
${policies}

EMPLOYMENT DATA:
- Employer Type: ${employment.type || 'N/A'}
- Years Employed: ${employment.years || 'N/A'}
- Monthly Income: $${monthlyIncome.toLocaleString()}
- Annual Income: $${(employment.annual_income || 0).toLocaleString()}

DEBTS:
${Object.entries(debts).map(([k, v]) => `- ${k}: $${(v as number).toLocaleString()}`).join('\n') || 'None listed'}

PROPOSED LOAN:
- Loan Amount: $${(loan.amount || 0).toLocaleString()}
- Estimated Payment: $${proposedPayment.toLocaleString()}

CALCULATED RESULTS (ACCURATE - DO NOT RECALCULATE):
- ${JSON.parse(dtiResult).formatted}
- ${JSON.parse(housingRatioResult).formatted}

Provide:
1) Employment stability assessment
2) Income verification requirements
3) Capacity assessment based on ratios
4) Documentation requirements
5) Underwriting conditions (if any)
6) Risk rating (Low/Medium/High)`;
  }
}

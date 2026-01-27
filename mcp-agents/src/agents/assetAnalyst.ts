/**
 * Asset Analyst Agent
 * Analyzes borrower's assets and reserves
 */

import { BaseAgent, AgentContext } from './baseAgent';

export class AssetAnalystAgent extends BaseAgent {
  constructor() {
    super(
      'asset_analyst',
      'Asset Analyst',
      `You are a Senior Mortgage Underwriter specializing in asset/reserve analysis.

ANALYSIS FRAMEWORK:
1. Down Payment Adequacy - Verify sufficient funds
2. Reserve Requirements - Use provided calculation
3. Large Deposits - Use provided analysis
4. Source of Funds - Ensure proper sourcing
5. Risk Assessment - Identify asset-related risks
6. Documentation Needs - List required documents

INSTRUCTIONS:
- Evaluate down payment source, liquid reserves, and any large deposits
- Use the provided reserves and deposit outputs as authoritative (do NOT recalculate)
- Identify required sourcing documentation (gift letters, bank statements, VOD, etc.)
- Output clear findings and conditions

PROHIBITED: Never reference race, ethnicity, religion, national origin, gender, marital status, or any protected class characteristics in your analysis.`,
      'down payment reserves assets large deposits gift funds seasoning requirements verification of deposit'
    );
  }

  protected buildUserPrompt(context: AgentContext, policies: string): string {
    const { applicationData, caseId } = context;
    const borrower = applicationData.borrowers?.[0] || {};
    const assets = borrower.assets || {};
    const loan = applicationData.loan || {};
    const employment = borrower.employment?.[0] || {};

    const liquidAssets = (assets.checking || 0) + (assets.savings || 0);
    const monthlyPayment = loan.estimated_payment || 0;
    const monthlyIncome = employment.monthly_income || 0;
    const largeDeposits = borrower.large_deposits || [];

    // Execute calculator tools
    const reservesResult = this.executeTool('calculate_reserves', {
      liquidAssets,
      monthlyPayment,
      requiredMonths: 2
    });

    const depositsResult = this.executeTool('check_large_deposits', {
      deposits: largeDeposits,
      monthlyIncome
    });

    return `Analyze ASSETS & RESERVES for case ${caseId}:

RELEVANT UNDERWRITING POLICIES (RAG):
${policies}

ASSET INFORMATION:
- Checking: $${(assets.checking || 0).toLocaleString()}
- Savings: $${(assets.savings || 0).toLocaleString()}
- Retirement: $${(assets.retirement || 0).toLocaleString()}
- Stocks/Bonds: $${(assets.stocks || 0).toLocaleString()}
- Total Liquid Assets: $${liquidAssets.toLocaleString()}

LOAN REQUIREMENTS:
- Down Payment Required: $${(loan.down_payment || 0).toLocaleString()}
- Monthly Payment: $${monthlyPayment.toLocaleString()}
- Required Reserves: 2 months (${monthlyPayment * 2})

RECENT DEPOSITS:
${largeDeposits.map((d: any) => `- $${d.amount.toLocaleString()} on ${d.date}`).join('\n') || 'None reported'}

CALCULATED RESULTS (ACCURATE - DO NOT RECALCULATE):
- ${JSON.parse(reservesResult).formatted}
- ${JSON.parse(depositsResult).formatted}

Provide:
1) Down payment verification status
2) Reserve adequacy assessment
3) Large deposit sourcing requirements
4) Documentation needed
5) Any conditions
6) Risk rating (Low/Medium/High)`;
  }
}

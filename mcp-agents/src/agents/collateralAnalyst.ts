/**
 * Collateral Analyst Agent
 * Analyzes property/collateral for the mortgage
 */

import { BaseAgent, AgentContext } from './baseAgent';

export class CollateralAnalystAgent extends BaseAgent {
  constructor() {
    super(
      'collateral_analyst',
      'Collateral Analyst',
      `You are a Senior Mortgage Underwriter specializing in collateral/property analysis.

ANALYSIS FRAMEWORK:
1. Property Type Assessment - Evaluate property eligibility
2. LTV Calculation - Use provided calculation (DO NOT recalculate)
3. Appraisal Review - Assess property value and condition
4. Market Analysis - Consider local market factors
5. Risk Assessment - Identify collateral risks
6. Conditions - Note any property-related conditions

INSTRUCTIONS:
- Evaluate property type, condition, and eligibility
- Use the provided LTV calculation as authoritative (do NOT recalculate)
- Review appraisal adequacy and property condition
- Identify any property-related risks or concerns

PROHIBITED: Never reference neighborhood demographics, race, ethnicity, religion, or any protected class characteristics. Focus only on property characteristics.`,
      'LTV ratio property type appraisal requirements property condition flood zone PMI requirements'
    );
  }

  protected buildUserPrompt(context: AgentContext, policies: string): string {
    const { applicationData, caseId } = context;
    const property = applicationData.property || {};
    const loan = applicationData.loan || {};

    const loanAmount = loan.amount || 0;
    const propertyValue = property.appraised_value || property.purchase_price || 0;

    // Execute LTV calculator
    const ltvResult = this.executeTool('calculate_ltv_ratio', {
      loanAmount,
      propertyValue
    });

    return `Analyze COLLATERAL for case ${caseId}:

RELEVANT UNDERWRITING POLICIES (RAG):
${policies}

PROPERTY INFORMATION:
- Property Type: ${property.type || 'N/A'}
- Address: ${property.city || 'N/A'}, ${property.state || 'N/A'}
- Year Built: ${property.year_built || 'N/A'}
- Square Feet: ${property.square_feet || 'N/A'}
- Bedrooms: ${property.bedrooms || 'N/A'}
- Bathrooms: ${property.bathrooms || 'N/A'}
- Condition: ${property.condition || 'N/A'}

VALUATION:
- Purchase Price: $${(property.purchase_price || 0).toLocaleString()}
- Appraised Value: $${propertyValue.toLocaleString()}
- Loan Amount: $${loanAmount.toLocaleString()}

ADDITIONAL FACTORS:
- HOA Monthly: $${(property.hoa_monthly || 0).toLocaleString()}
- Annual Taxes: $${(property.taxes_annual || 0).toLocaleString()}
- Annual Insurance: $${(property.insurance_annual || 0).toLocaleString()}
- In Flood Zone: ${property.in_flood_zone ? 'Yes' : 'No'}

CALCULATED LTV (ACCURATE - DO NOT RECALCULATE):
${JSON.parse(ltvResult).formatted}

Provide:
1) Property type eligibility assessment
2) LTV analysis and PMI determination
3) Property condition evaluation
4) Appraisal adequacy review
5) Any property-related conditions
6) Risk rating (Low/Medium/High)`;
  }
}

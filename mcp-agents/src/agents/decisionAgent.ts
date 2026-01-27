/**
 * Decision Agent
 * Makes final underwriting decision based on all inputs
 */

import { BaseAgent, AgentContext } from './baseAgent';

export class DecisionAgent extends BaseAgent {
  constructor() {
    super(
      'decision',
      'Decision Agent',
      `You are the Senior Underwriting Decision Maker responsible for making final loan decisions.

YOUR ROLE:
- Synthesize all specialist analyses and critic review
- Make a final decision: APPROVED, DENIED, or CONDITIONAL_APPROVAL
- Provide a comprehensive decision memo
- List any conditions for approval
- Generate an executive summary

DECISION FRAMEWORK:
1. APPROVED - Application meets all requirements
2. CONDITIONAL_APPROVAL - Meets requirements with specific conditions
3. DENIED - Does not meet minimum requirements

DECISION MEMO MUST INCLUDE:
1. Application Summary
2. Key Financial Metrics (DTI, LTV, Credit Score)
3. Strengths of Application
4. Weaknesses/Risk Factors
5. Decision Rationale
6. Conditions (if applicable)
7. Executive Summary (2-3 sentences)

IMPORTANT:
- Base decisions on factual analysis only
- Never consider protected class characteristics
- Document all reasoning for audit purposes
- Be specific about any conditions required`,
      'underwriting decision guidelines approval conditions denial reasons compensating factors'
    );
  }

  protected buildUserPrompt(context: AgentContext, policies: string): string {
    const { applicationData, caseId, previousAnalyses } = context;
    const loan = applicationData.loan || {};
    const borrower = applicationData.borrowers?.[0] || {};
    const credit = borrower.credit || {};

    return `Make FINAL DECISION for case ${caseId}:

RELEVANT POLICIES:
${policies}

APPLICATION SUMMARY:
- Loan Amount: $${(loan.amount || 0).toLocaleString()}
- Loan Type: ${loan.type || 'Conventional'}
- Purpose: ${loan.purpose || 'Purchase'}
- Occupancy: ${loan.occupancy || 'Primary'}

BORROWER PROFILE:
- Credit Score: ${credit.score || 'N/A'}

---

CREDIT ANALYSIS:
${previousAnalyses?.credit || 'Not available'}

---

INCOME ANALYSIS:
${previousAnalyses?.income || 'Not available'}

---

ASSET ANALYSIS:
${previousAnalyses?.asset || 'Not available'}

---

COLLATERAL ANALYSIS:
${previousAnalyses?.collateral || 'Not available'}

---

CRITIC REVIEW:
${previousAnalyses?.critic || 'Not available'}

---

Based on ALL analyses, provide:

1. FINAL DECISION: [APPROVED / CONDITIONAL_APPROVAL / DENIED]

2. RISK SCORE: [0-100]

3. DECISION MEMO:
   - Application Summary
   - Key Metrics
   - Strengths
   - Weaknesses
   - Decision Rationale

4. CONDITIONS (if applicable):
   - List each condition

5. EXECUTIVE SUMMARY:
   - 2-3 sentence summary suitable for senior management

6. HUMAN REVIEW REQUIRED: [Yes/No] - [Reason]`;
  }

  parseResponse(response: any, startTime: number): any {
    const result = super.parseResponse(response, startTime);
    const content = result.analysis;

    // Extract decision
    const decisionMatch = content.match(/FINAL DECISION:\s*(APPROVED|CONDITIONAL_APPROVAL|DENIED)/i);
    result.structuredData.decision = decisionMatch ? decisionMatch[1].toUpperCase() : 'CONDITIONAL_APPROVAL';

    // Extract risk score
    const riskMatch = content.match(/RISK SCORE:\s*(\d+)/i);
    result.structuredData.riskScore = riskMatch ? parseInt(riskMatch[1]) : 50;

    // Extract human review requirement
    const humanMatch = content.match(/HUMAN REVIEW REQUIRED:\s*(Yes|No)/i);
    result.structuredData.humanReviewRequired = humanMatch
      ? humanMatch[1].toLowerCase() === 'yes'
      : true;

    return result;
  }
}

/**
 * Critic Agent
 * Cross-validates all specialist analyses and ensures quality
 */

import { BaseAgent, AgentContext, AgentResult } from './baseAgent';

export class CriticAgent extends BaseAgent {
  constructor() {
    super(
      'critic',
      'Critic Agent',
      `You are a Senior Quality Assurance Underwriter responsible for reviewing all specialist analyses.

YOUR RESPONSIBILITIES:
1. Cross-validate all specialist analyses for consistency
2. Identify any gaps or contradictions between analyses
3. Check for bias or inappropriate considerations
4. Synthesize findings into a coherent summary
5. Calculate an overall risk score (0-100)
6. Determine if human review is required

BIAS DETECTION:
Check for any references to:
- Race, ethnicity, or national origin
- Religion or religious practices
- Gender or gender identity
- Marital or familial status
- Age (except for legal capacity)
- Disability status
- Geographic discrimination (redlining)

FLAG ANY BIAS IMMEDIATELY.

RISK SCORE GUIDELINES:
0-30: Low Risk - Strong application
31-50: Moderate Risk - Acceptable with conditions
51-70: Elevated Risk - Requires additional review
71-100: High Risk - Significant concerns

OUTPUT FORMAT:
Provide a structured review covering:
1. Synthesis of all analyses
2. Consistency check results
3. Bias detection results
4. Overall risk assessment
5. Recommended decision
6. Human review requirement (yes/no and reason)`,
      'underwriting quality assurance fair lending compliance bias detection review guidelines'
    );
  }

  protected buildUserPrompt(context: AgentContext, policies: string): string {
    const { caseId, previousAnalyses } = context;

    return `Review ALL specialist analyses for case ${caseId}:

RELEVANT POLICIES:
${policies}

CREDIT ANALYST FINDINGS:
${previousAnalyses?.credit || 'Not available'}

---

INCOME ANALYST FINDINGS:
${previousAnalyses?.income || 'Not available'}

---

ASSET ANALYST FINDINGS:
${previousAnalyses?.asset || 'Not available'}

---

COLLATERAL ANALYST FINDINGS:
${previousAnalyses?.collateral || 'Not available'}

---

Provide your quality review:
1. SYNTHESIS: Summarize key findings from all analyses
2. CONSISTENCY: Identify any contradictions or gaps
3. BIAS CHECK: Flag any inappropriate considerations
4. RISK SCORE: Calculate overall risk (0-100)
5. RECOMMENDATION: Recommend decision (APPROVE/DENY/CONDITIONAL)
6. HUMAN REVIEW: Required? (Yes/No and reason)`;
  }
}

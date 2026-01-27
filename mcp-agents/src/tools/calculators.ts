/**
 * Underwriting Calculator Tools
 * These tools provide accurate calculations for mortgage underwriting
 */

import { z } from 'zod';

// Tool Schemas
export const DTIInputSchema = z.object({
  monthlyDebt: z.number().positive(),
  monthlyIncome: z.number().positive()
});

export const LTVInputSchema = z.object({
  loanAmount: z.number().positive(),
  propertyValue: z.number().positive()
});

export const ReservesInputSchema = z.object({
  liquidAssets: z.number().nonnegative(),
  monthlyPayment: z.number().positive(),
  requiredMonths: z.number().int().positive().default(2)
});

export const HousingRatioInputSchema = z.object({
  monthlyPayment: z.number().positive(),
  monthlyIncome: z.number().positive()
});

export const CreditScoreInputSchema = z.object({
  creditScore: z.number().int().min(300).max(850)
});

export const LargeDepositsInputSchema = z.object({
  deposits: z.array(z.object({
    amount: z.number().positive(),
    date: z.string()
  })),
  monthlyIncome: z.number().positive()
});

// Tool Implementations
export function calculateDTI(input: z.infer<typeof DTIInputSchema>): string {
  const { monthlyDebt, monthlyIncome } = input;
  const dti = (monthlyDebt / monthlyIncome) * 100;

  let status: string;
  if (dti <= 36) status = 'Excellent';
  else if (dti <= 43) status = 'Acceptable';
  else if (dti <= 50) status = 'High';
  else status = 'Excessive';

  return JSON.stringify({
    dti_ratio: Math.round(dti * 100) / 100,
    monthly_debt: monthlyDebt,
    monthly_income: monthlyIncome,
    status,
    formatted: `DTI Ratio: ${dti.toFixed(2)}% (${status}) - Debt: $${monthlyDebt.toLocaleString()}, Income: $${monthlyIncome.toLocaleString()}`
  });
}

export function calculateLTV(input: z.infer<typeof LTVInputSchema>): string {
  const { loanAmount, propertyValue } = input;
  const ltv = (loanAmount / propertyValue) * 100;

  let status: string;
  if (ltv <= 80) status = 'Excellent';
  else if (ltv <= 90) status = 'Good';
  else if (ltv <= 97) status = 'Acceptable';
  else status = 'Excessive';

  const pmiRequired = ltv > 80;

  return JSON.stringify({
    ltv_ratio: Math.round(ltv * 100) / 100,
    loan_amount: loanAmount,
    property_value: propertyValue,
    status,
    pmi_required: pmiRequired,
    formatted: `LTV Ratio: ${ltv.toFixed(2)}% (${status}) - Loan: $${loanAmount.toLocaleString()}, Value: $${propertyValue.toLocaleString()}${pmiRequired ? ' [PMI Required]' : ''}`
  });
}

export function calculateReserves(input: z.infer<typeof ReservesInputSchema>): string {
  const { liquidAssets, monthlyPayment, requiredMonths } = input;
  const monthsCoverage = liquidAssets / monthlyPayment;
  const requiredAmount = monthlyPayment * requiredMonths;
  const surplus = liquidAssets - requiredAmount;

  const status = monthsCoverage >= requiredMonths ? 'Adequate' : 'Insufficient';

  return JSON.stringify({
    months_coverage: Math.round(monthsCoverage * 10) / 10,
    liquid_assets: liquidAssets,
    required_amount: requiredAmount,
    surplus_deficit: surplus,
    status,
    formatted: `Reserves: ${monthsCoverage.toFixed(1)} months coverage (${status}) - Assets: $${liquidAssets.toLocaleString()}, Required: $${requiredAmount.toLocaleString()}`
  });
}

export function calculateHousingRatio(input: z.infer<typeof HousingRatioInputSchema>): string {
  const { monthlyPayment, monthlyIncome } = input;
  const ratio = (monthlyPayment / monthlyIncome) * 100;

  let status: string;
  if (ratio <= 28) status = 'Acceptable';
  else if (ratio <= 35) status = 'Elevated';
  else status = 'High';

  return JSON.stringify({
    housing_ratio: Math.round(ratio * 100) / 100,
    monthly_payment: monthlyPayment,
    monthly_income: monthlyIncome,
    status,
    formatted: `Housing Ratio: ${ratio.toFixed(2)}% (${status}) - Payment: $${monthlyPayment.toLocaleString()}, Income: $${monthlyIncome.toLocaleString()}`
  });
}

export function checkCreditScorePolicy(input: z.infer<typeof CreditScoreInputSchema>): string {
  const { creditScore } = input;

  let tier: string;
  let rateAdjustment: string;

  if (creditScore >= 740) {
    tier = 'Excellent';
    rateAdjustment = 'Best rates available';
  } else if (creditScore >= 700) {
    tier = 'Very Good';
    rateAdjustment = 'Favorable rates';
  } else if (creditScore >= 660) {
    tier = 'Good';
    rateAdjustment = 'Standard rates';
  } else if (creditScore >= 620) {
    tier = 'Fair';
    rateAdjustment = 'Higher rates, may require compensating factors';
  } else {
    tier = 'Below Minimum';
    rateAdjustment = 'Does not meet conventional loan requirements';
  }

  return JSON.stringify({
    credit_score: creditScore,
    tier,
    rate_adjustment: rateAdjustment,
    meets_minimum: creditScore >= 620,
    formatted: `Credit Score: ${creditScore} - Tier: ${tier} - ${rateAdjustment}`
  });
}

export function checkLargeDeposits(input: z.infer<typeof LargeDepositsInputSchema>): string {
  const { deposits, monthlyIncome } = input;
  const threshold = monthlyIncome * 0.25;

  const largeDeposits = deposits.filter(d => d.amount >= threshold).map(d => ({
    amount: d.amount,
    date: d.date,
    sourcingRequired: true
  }));

  if (largeDeposits.length === 0) {
    return JSON.stringify({
      large_deposits: [],
      threshold,
      formatted: `No large deposits identified (threshold: $${threshold.toLocaleString()}). All deposits are acceptable.`
    });
  }

  const details = largeDeposits.map((d, i) =>
    `${i + 1}. $${d.amount.toLocaleString()} on ${d.date} - Sourcing documentation required`
  ).join('\n  ');

  return JSON.stringify({
    large_deposits: largeDeposits,
    threshold,
    formatted: `Found ${largeDeposits.length} large deposit(s) requiring documentation (threshold: $${threshold.toLocaleString()}):\n  ${details}`
  });
}

// Tool registry for MCP
export const calculatorTools = [
  {
    name: 'calculate_dti_ratio',
    description: 'Calculate Debt-to-Income ratio',
    inputSchema: DTIInputSchema,
    handler: calculateDTI
  },
  {
    name: 'calculate_ltv_ratio',
    description: 'Calculate Loan-to-Value ratio',
    inputSchema: LTVInputSchema,
    handler: calculateLTV
  },
  {
    name: 'calculate_reserves',
    description: 'Calculate reserve coverage in months',
    inputSchema: ReservesInputSchema,
    handler: calculateReserves
  },
  {
    name: 'calculate_housing_expense_ratio',
    description: 'Calculate housing expense ratio (front-end ratio)',
    inputSchema: HousingRatioInputSchema,
    handler: calculateHousingRatio
  },
  {
    name: 'check_credit_score_policy',
    description: 'Check if credit score meets policy requirements',
    inputSchema: CreditScoreInputSchema,
    handler: checkCreditScorePolicy
  },
  {
    name: 'check_large_deposits',
    description: 'Identify large deposits requiring sourcing documentation',
    inputSchema: LargeDepositsInputSchema,
    handler: checkLargeDeposits
  }
];

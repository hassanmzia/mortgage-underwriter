/**
 * Underwriting Calculator Tools
 * These tools provide accurate calculations for mortgage underwriting
 */

import { z } from 'zod';

// Tool Schemas
export const DTIInputSchema = z.object({
  monthlyDebt: z.number().nonnegative(),
  monthlyIncome: z.number().nonnegative()
});

export const LTVInputSchema = z.object({
  loanAmount: z.number().nonnegative(),
  propertyValue: z.number().nonnegative()
});

export const ReservesInputSchema = z.object({
  liquidAssets: z.number().nonnegative(),
  monthlyPayment: z.number().nonnegative(),
  requiredMonths: z.number().int().positive().default(2)
});

export const HousingRatioInputSchema = z.object({
  monthlyPayment: z.number().nonnegative(),
  monthlyIncome: z.number().nonnegative()
});

export const CreditScoreInputSchema = z.object({
  creditScore: z.number().int().min(300).max(850)
});

export const LargeDepositsInputSchema = z.object({
  deposits: z.array(z.object({
    amount: z.number().nonnegative(),
    date: z.string()
  })),
  monthlyIncome: z.number().nonnegative()
});

// Tool Implementations
export function calculateDTI(input: z.infer<typeof DTIInputSchema>): string {
  const { monthlyDebt, monthlyIncome } = input;
  if (monthlyIncome === 0) {
    return JSON.stringify({
      dti_ratio: 0,
      monthly_debt: monthlyDebt,
      monthly_income: 0,
      status: 'Unknown - No income reported',
      formatted: `DTI Ratio: N/A (No income reported) - Debt: $${monthlyDebt.toLocaleString()}`
    });
  }
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
  if (propertyValue === 0) {
    return JSON.stringify({
      ltv_ratio: 0,
      loan_amount: loanAmount,
      property_value: 0,
      status: 'Unknown - No property value',
      pmi_required: false,
      formatted: `LTV Ratio: N/A (No property value reported) - Loan: $${loanAmount.toLocaleString()}`
    });
  }
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
  if (monthlyPayment === 0) {
    return JSON.stringify({
      months_coverage: 0,
      liquid_assets: liquidAssets,
      required_amount: 0,
      surplus_deficit: liquidAssets,
      status: 'Unknown - No payment reported',
      formatted: `Reserves: N/A (No monthly payment reported) - Assets: $${liquidAssets.toLocaleString()}`
    });
  }
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
  if (monthlyIncome === 0) {
    return JSON.stringify({
      housing_ratio: 0,
      monthly_payment: monthlyPayment,
      monthly_income: 0,
      status: 'Unknown - No income reported',
      formatted: `Housing Ratio: N/A (No income reported) - Payment: $${monthlyPayment.toLocaleString()}`
    });
  }
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
  if (monthlyIncome === 0) {
    return JSON.stringify({
      large_deposits: deposits.map(d => ({ ...d, sourcingRequired: true })),
      threshold: 0,
      formatted: deposits.length > 0
        ? `All ${deposits.length} deposit(s) require sourcing documentation (no income reported for threshold calculation).`
        : 'No deposits reported and no income available for threshold calculation.'
    });
  }
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

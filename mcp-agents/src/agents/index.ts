/**
 * Agent Registry
 */

export { BaseAgent, AgentContext, AgentResult } from './baseAgent';
export { CreditAnalystAgent } from './creditAnalyst';
export { IncomeAnalystAgent } from './incomeAnalyst';
export { AssetAnalystAgent } from './assetAnalyst';
export { CollateralAnalystAgent } from './collateralAnalyst';
export { CriticAgent } from './criticAgent';
export { DecisionAgent } from './decisionAgent';

import { CreditAnalystAgent } from './creditAnalyst';
import { IncomeAnalystAgent } from './incomeAnalyst';
import { AssetAnalystAgent } from './assetAnalyst';
import { CollateralAnalystAgent } from './collateralAnalyst';
import { CriticAgent } from './criticAgent';
import { DecisionAgent } from './decisionAgent';

export const agentRegistry = {
  credit_analyst: () => new CreditAnalystAgent(),
  income_analyst: () => new IncomeAnalystAgent(),
  asset_analyst: () => new AssetAnalystAgent(),
  collateral_analyst: () => new CollateralAnalystAgent(),
  critic: () => new CriticAgent(),
  decision: () => new DecisionAgent()
};

export type AgentType = keyof typeof agentRegistry;

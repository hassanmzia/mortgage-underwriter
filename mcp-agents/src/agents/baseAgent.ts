/**
 * Base Agent Class
 * Foundation for all specialist agents
 */

import OpenAI from 'openai';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { queryPolicies } from '../rag/chromaClient';
import { calculatorTools } from '../tools/calculators';

export interface AgentContext {
  workflowId: string;
  applicationId: string;
  caseId: string;
  applicationData: any;
  previousAnalyses?: Record<string, string>;
}

export interface AgentResult {
  agentType: string;
  analysis: string;
  structuredData: Record<string, any>;
  recommendation: string;
  riskFactors: Array<{
    category: string;
    severity: string;
    description: string;
    mitigation?: string;
  }>;
  conditions: string[];
  confidenceScore: number;
  processingTimeMs: number;
  tokensUsed: number;
}

export abstract class BaseAgent {
  protected openai: OpenAI;
  protected agentType: string;
  protected agentName: string;
  protected systemPrompt: string;
  protected ragQuery: string;

  constructor(
    agentType: string,
    agentName: string,
    systemPrompt: string,
    ragQuery: string
  ) {
    this.agentType = agentType;
    this.agentName = agentName;
    this.systemPrompt = systemPrompt;
    this.ragQuery = ragQuery;

    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiApiBase,
      timeout: config.agentTimeout
    });
  }

  async execute(context: AgentContext): Promise<AgentResult> {
    const startTime = Date.now();
    logger.info(`${this.agentName} starting analysis for ${context.caseId}`);

    try {
      // Retrieve relevant policies
      const policies = await this.retrievePolicies(context);

      // Build the prompt
      const userPrompt = this.buildUserPrompt(context, policies);

      // Call LLM
      const response = await this.callLLM(userPrompt);

      // Parse the response
      const result = this.parseResponse(response, startTime);

      logger.info(`${this.agentName} completed analysis for ${context.caseId}`);
      return result;

    } catch (error) {
      logger.error(`${this.agentName} error:`, error);
      throw error;
    }
  }

  protected async retrievePolicies(context: AgentContext): Promise<string> {
    try {
      const results = await queryPolicies(this.ragQuery, 5);
      return results.map(r => r.content).join('\n\n---\n\n');
    } catch (error) {
      logger.warn(`Failed to retrieve policies for ${this.agentType}:`, error);
      return 'No specific policies retrieved.';
    }
  }

  protected abstract buildUserPrompt(context: AgentContext, policies: string): string;

  protected async callLLM(userPrompt: string): Promise<OpenAI.ChatCompletion> {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: this.systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const response = await this.openai.chat.completions.create({
      model: config.openaiModel,
      messages,
      temperature: 0,
      max_tokens: 4096
    });

    return response;
  }

  protected parseResponse(
    response: OpenAI.ChatCompletion,
    startTime: number
  ): AgentResult {
    const content = response.choices[0]?.message?.content || '';
    const processingTime = Date.now() - startTime;
    const tokensUsed = response.usage?.total_tokens || 0;

    return {
      agentType: this.agentType,
      analysis: content,
      structuredData: {},
      recommendation: this.extractRecommendation(content),
      riskFactors: this.extractRiskFactors(content),
      conditions: this.extractConditions(content),
      confidenceScore: 0.85,
      processingTimeMs: processingTime,
      tokensUsed
    };
  }

  protected extractRecommendation(content: string): string {
    // Extract recommendation from content
    const recMatch = content.match(/(?:recommendation|recommended|suggest)[\s:]+([^\n.]+)/i);
    return recMatch ? recMatch[1].trim() : '';
  }

  protected extractRiskFactors(content: string): Array<{
    category: string;
    severity: string;
    description: string;
  }> {
    const factors: Array<{ category: string; severity: string; description: string }> = [];

    // Look for risk-related patterns
    const riskPatterns = [
      /(?:high risk|concern|issue|warning)[\s:]+([^\n]+)/gi,
      /(?:risk factor)[\s:]+([^\n]+)/gi
    ];

    for (const pattern of riskPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        factors.push({
          category: this.agentType.replace('_analyst', ''),
          severity: content.toLowerCase().includes('high') ? 'high' : 'medium',
          description: match[1].trim()
        });
      }
    }

    return factors;
  }

  protected extractConditions(content: string): string[] {
    const conditions: string[] = [];

    // Look for condition patterns
    const conditionPatterns = [
      /(?:condition|required|must provide)[\s:]+([^\n]+)/gi
    ];

    for (const pattern of conditionPatterns) {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        conditions.push(match[1].trim());
      }
    }

    return conditions;
  }

  // Execute calculator tool
  protected executeTool(toolName: string, input: any): string {
    const tool = calculatorTools.find(t => t.name === toolName);
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    const validated = tool.inputSchema.parse(input);
    return tool.handler(validated as any);
  }
}

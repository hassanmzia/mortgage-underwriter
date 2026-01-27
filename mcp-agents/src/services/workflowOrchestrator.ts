/**
 * Workflow Orchestrator
 * Manages the multi-agent underwriting workflow
 */

import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { cacheSet, cacheGet } from './redis';
import {
  agentRegistry,
  AgentContext,
  AgentResult
} from '../agents';
import { A2AHub } from '../a2a/hub';

export interface WorkflowState {
  id: string;
  applicationId: string;
  caseId: string;
  status: string;
  currentAgent: string;
  progressPercent: number;
  applicationData: any;
  analyses: Record<string, AgentResult>;
  decision?: any;
  startedAt: Date;
  completedAt?: Date;
  error?: string;
}

const WORKFLOW_STAGES = [
  { agent: 'credit_analyst', weight: 15 },
  { agent: 'income_analyst', weight: 15 },
  { agent: 'asset_analyst', weight: 15 },
  { agent: 'collateral_analyst', weight: 15 },
  { agent: 'critic', weight: 20 },
  { agent: 'decision', weight: 20 }
];

export class WorkflowOrchestrator {
  private static instance: WorkflowOrchestrator;
  private io: SocketIOServer | null = null;
  private a2aHub: A2AHub;

  private constructor() {
    this.a2aHub = A2AHub.getInstance();
  }

  static getInstance(): WorkflowOrchestrator {
    if (!WorkflowOrchestrator.instance) {
      WorkflowOrchestrator.instance = new WorkflowOrchestrator();
    }
    return WorkflowOrchestrator.instance;
  }

  setSocketIO(io: SocketIOServer): void {
    this.io = io;
  }

  // Start a new workflow
  async startWorkflow(
    workflowId: string,
    applicationId: string,
    caseId: string,
    applicationData: any
  ): Promise<WorkflowState> {
    logger.info(`Starting workflow ${workflowId} for case ${caseId}`);

    const state: WorkflowState = {
      id: workflowId,
      applicationId,
      caseId,
      status: 'initializing',
      currentAgent: '',
      progressPercent: 0,
      applicationData,
      analyses: {},
      startedAt: new Date()
    };

    // Cache initial state
    await cacheSet(`workflow:${workflowId}`, state, 86400);

    // Notify Django backend
    await this.notifyBackend(workflowId, 'workflow_started', { status: 'initializing' });

    // Emit to WebSocket clients
    this.emitWorkflowUpdate(workflowId, state);

    // Run the workflow
    this.executeWorkflow(state).catch(error => {
      logger.error(`Workflow ${workflowId} failed:`, error);
      this.handleWorkflowError(state, error);
    });

    return state;
  }

  // Execute the full workflow
  private async executeWorkflow(state: WorkflowState): Promise<void> {
    try {
      let progressBase = 0;

      for (const stage of WORKFLOW_STAGES) {
        // Update state
        state.status = stage.agent;
        state.currentAgent = stage.agent;
        state.progressPercent = progressBase;

        await this.updateState(state);
        this.emitAgentProgress(state.id, stage.agent, 'started');

        // Notify A2A hub
        await this.a2aHub.updateAgentStatus(stage.agent, 'busy');

        // Execute agent
        const agent = agentRegistry[stage.agent as keyof typeof agentRegistry]();

        const context: AgentContext = {
          workflowId: state.id,
          applicationId: state.applicationId,
          caseId: state.caseId,
          applicationData: state.applicationData,
          previousAnalyses: this.getPreviousAnalyses(state.analyses)
        };

        const result = await agent.execute(context);

        // Store analysis
        state.analyses[stage.agent] = result;

        // Notify Django backend
        await this.notifyBackend(state.id, 'agent_analysis', {
          agent_type: stage.agent,
          analysis_text: result.analysis,
          structured_data: result.structuredData,
          recommendation: result.recommendation,
          risk_factors: result.riskFactors,
          conditions: result.conditions,
          confidence_score: result.confidenceScore,
          processing_time_ms: result.processingTimeMs,
          tokens_used: result.tokensUsed
        });

        // Update progress
        progressBase += stage.weight;
        state.progressPercent = progressBase;

        await this.a2aHub.updateAgentStatus(stage.agent, 'online');
        this.emitAgentProgress(state.id, stage.agent, 'completed');

        await this.updateState(state);
      }

      // Extract final decision
      const decisionResult = state.analyses['decision'];
      const decision = {
        decision: decisionResult.structuredData.decision || 'CONDITIONAL_APPROVAL',
        risk_score: decisionResult.structuredData.riskScore || 50,
        decision_memo: decisionResult.analysis,
        confidence: decisionResult.confidenceScore,
        conditions: decisionResult.conditions,
        risk_factors: decisionResult.riskFactors,
        requires_human_review: decisionResult.structuredData.humanReviewRequired !== false
      };

      state.decision = decision;
      state.status = 'completed';
      state.completedAt = new Date();
      state.progressPercent = 100;

      await this.updateState(state);

      // Notify Django backend of decision
      await this.notifyBackend(state.id, 'decision_made', decision);

      // Emit completion
      this.emitDecisionMade(state.id, decision);

      logger.info(`Workflow ${state.id} completed: ${decision.decision}`);

    } catch (error) {
      await this.handleWorkflowError(state, error);
      throw error;
    }
  }

  private getPreviousAnalyses(analyses: Record<string, AgentResult>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [agent, analysis] of Object.entries(analyses)) {
      result[agent.replace('_analyst', '')] = analysis.analysis;
    }
    return result;
  }

  private async updateState(state: WorkflowState): Promise<void> {
    await cacheSet(`workflow:${state.id}`, state, 86400);
    this.emitWorkflowUpdate(state.id, state);
  }

  private async handleWorkflowError(state: WorkflowState, error: any): Promise<void> {
    state.status = 'failed';
    state.error = error.message || 'Unknown error';
    state.completedAt = new Date();

    await this.updateState(state);
    await this.notifyBackend(state.id, 'workflow_failed', { error: state.error });

    this.io?.to(`workflow:${state.id}`).emit('workflow_error', {
      workflowId: state.id,
      error: state.error
    });
  }

  private async notifyBackend(workflowId: string, eventType: string, data: any): Promise<void> {
    try {
      await axios.post(
        `${config.djangoApiUrl}/api/v1/underwriting/workflows/${workflowId}/callback/`,
        { event_type: eventType, data },
        { timeout: 10000 }
      );
    } catch (error) {
      logger.warn(`Failed to notify backend: ${error}`);
    }
  }

  // WebSocket emissions
  private emitWorkflowUpdate(workflowId: string, state: WorkflowState): void {
    this.io?.to(`workflow:${workflowId}`).emit('workflow_update', {
      workflowId,
      status: state.status,
      currentAgent: state.currentAgent,
      progressPercent: state.progressPercent
    });
  }

  private emitAgentProgress(workflowId: string, agent: string, status: string): void {
    this.io?.to(`workflow:${workflowId}`).emit('agent_progress', {
      workflowId,
      agent,
      status
    });
  }

  private emitDecisionMade(workflowId: string, decision: any): void {
    this.io?.to(`workflow:${workflowId}`).emit('decision_made', {
      workflowId,
      decision
    });
  }

  // Get workflow state
  async getWorkflowState(workflowId: string): Promise<WorkflowState | null> {
    return await cacheGet<WorkflowState>(`workflow:${workflowId}`);
  }
}

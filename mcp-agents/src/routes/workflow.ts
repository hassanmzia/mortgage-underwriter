/**
 * Workflow Routes
 */

import { Router, Request, Response } from 'express';
import { WorkflowOrchestrator } from '../services/workflowOrchestrator';
import { logger } from '../utils/logger';

export const workflowRouter = Router();
const orchestrator = WorkflowOrchestrator.getInstance();

// Start a new workflow
workflowRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { workflow_id, application_id, case_id, application_data } = req.body;

    if (!workflow_id || !application_id || !case_id || !application_data) {
      return res.status(400).json({
        error: 'Missing required fields: workflow_id, application_id, case_id, application_data'
      });
    }

    const state = await orchestrator.startWorkflow(
      workflow_id,
      application_id,
      case_id,
      application_data
    );

    res.json({
      status: 'started',
      workflow_id: state.id,
      message: 'Underwriting workflow started'
    });
  } catch (error) {
    logger.error('Failed to start workflow:', error);
    res.status(500).json({ error: 'Failed to start workflow' });
  }
});

// Get workflow status
workflowRouter.get('/:workflowId', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const state = await orchestrator.getWorkflowState(workflowId);

    if (!state) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({
      id: state.id,
      applicationId: state.applicationId,
      caseId: state.caseId,
      status: state.status,
      currentAgent: state.currentAgent,
      progressPercent: state.progressPercent,
      startedAt: state.startedAt,
      completedAt: state.completedAt,
      decision: state.decision,
      error: state.error
    });
  } catch (error) {
    logger.error('Failed to get workflow:', error);
    res.status(500).json({ error: 'Failed to get workflow status' });
  }
});

// Get workflow analyses
workflowRouter.get('/:workflowId/analyses', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const state = await orchestrator.getWorkflowState(workflowId);

    if (!state) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    res.json({
      workflowId: state.id,
      analyses: Object.entries(state.analyses).map(([agent, analysis]) => ({
        agent,
        ...analysis
      }))
    });
  } catch (error) {
    logger.error('Failed to get analyses:', error);
    res.status(500).json({ error: 'Failed to get workflow analyses' });
  }
});

// Get workflow decision
workflowRouter.get('/:workflowId/decision', async (req: Request, res: Response) => {
  try {
    const { workflowId } = req.params;
    const state = await orchestrator.getWorkflowState(workflowId);

    if (!state) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (!state.decision) {
      return res.status(404).json({ error: 'No decision made yet' });
    }

    res.json({
      workflowId: state.id,
      decision: state.decision
    });
  } catch (error) {
    logger.error('Failed to get decision:', error);
    res.status(500).json({ error: 'Failed to get decision' });
  }
});

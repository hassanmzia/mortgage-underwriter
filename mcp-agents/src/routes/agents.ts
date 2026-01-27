/**
 * Agent Routes
 */

import { Router, Request, Response } from 'express';
import { agentRegistry } from '../agents';
import { A2AHub } from '../a2a/hub';
import { logger } from '../utils/logger';

export const agentRouter = Router();
const a2aHub = A2AHub.getInstance();

// List all agents
agentRouter.get('/', async (req: Request, res: Response) => {
  try {
    const agents = a2aHub.getAllAgents();
    res.json({ agents });
  } catch (error) {
    logger.error('Failed to list agents:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// Get agent details
agentRouter.get('/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const agent = a2aHub.getAgent(agentId);

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    res.json(agent);
  } catch (error) {
    logger.error('Failed to get agent:', error);
    res.status(500).json({ error: 'Failed to get agent' });
  }
});

// Execute a single agent (for testing)
agentRouter.post('/:agentId/execute', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { applicationData, caseId } = req.body;

    if (!(agentId in agentRegistry)) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    const agentFactory = agentRegistry[agentId as keyof typeof agentRegistry];
    const agent = agentFactory();

    const result = await agent.execute({
      workflowId: 'test',
      applicationId: 'test',
      caseId: caseId || 'TEST-001',
      applicationData: applicationData || {}
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to execute agent:', error);
    res.status(500).json({ error: 'Failed to execute agent' });
  }
});

// Find agents by capability
agentRouter.get('/capability/:capability', async (req: Request, res: Response) => {
  try {
    const { capability } = req.params;
    const agents = a2aHub.findAgentsByCapability(capability);
    res.json({ agents });
  } catch (error) {
    logger.error('Failed to find agents:', error);
    res.status(500).json({ error: 'Failed to find agents' });
  }
});

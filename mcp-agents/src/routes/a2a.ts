/**
 * Agent-to-Agent Communication Routes
 */

import { Router, Request, Response } from 'express';
import { A2AHub } from '../a2a/hub';
import { logger } from '../utils/logger';

export const a2aRouter = Router();
const a2aHub = A2AHub.getInstance();

// List all registered agents
a2aRouter.get('/agents', async (req: Request, res: Response) => {
  try {
    const agents = a2aHub.getAllAgents();
    res.json({ agents });
  } catch (error) {
    logger.error('Failed to list A2A agents:', error);
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// Get agent by ID
a2aRouter.get('/agents/:agentId', async (req: Request, res: Response) => {
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

// Send message to agent
a2aRouter.post('/messages', async (req: Request, res: Response) => {
  try {
    const { from_agent, to_agent, type, action, payload } = req.body;

    if (!from_agent || !to_agent || !action) {
      return res.status(400).json({
        error: 'from_agent, to_agent, and action are required'
      });
    }

    const messageId = await a2aHub.sendMessage({
      fromAgent: from_agent,
      toAgent: to_agent,
      type: type || 'request',
      action,
      payload
    });

    res.json({ message_id: messageId, status: 'sent' });
  } catch (error) {
    logger.error('Failed to send message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Get messages for an agent
a2aRouter.get('/messages/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const messages = a2aHub.getMessages(agentId);
    res.json({ agent_id: agentId, messages });
  } catch (error) {
    logger.error('Failed to get messages:', error);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// Clear messages for an agent
a2aRouter.delete('/messages/:agentId', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    a2aHub.clearMessages(agentId);
    res.json({ status: 'cleared' });
  } catch (error) {
    logger.error('Failed to clear messages:', error);
    res.status(500).json({ error: 'Failed to clear messages' });
  }
});

// Broadcast message to all agents
a2aRouter.post('/broadcast', async (req: Request, res: Response) => {
  try {
    const { from_agent, action, payload } = req.body;

    if (!from_agent || !action) {
      return res.status(400).json({
        error: 'from_agent and action are required'
      });
    }

    await a2aHub.broadcast(from_agent, action, payload);
    res.json({ status: 'broadcast_sent' });
  } catch (error) {
    logger.error('Failed to broadcast:', error);
    res.status(500).json({ error: 'Failed to broadcast message' });
  }
});

// Find agents by capability
a2aRouter.get('/capabilities/:capability', async (req: Request, res: Response) => {
  try {
    const { capability } = req.params;
    const agents = a2aHub.findAgentsByCapability(capability);
    res.json({ capability, agents });
  } catch (error) {
    logger.error('Failed to find agents by capability:', error);
    res.status(500).json({ error: 'Failed to find agents' });
  }
});

// Update agent status
a2aRouter.patch('/agents/:agentId/status', async (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const { status } = req.body;

    if (!['online', 'offline', 'busy'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    await a2aHub.updateAgentStatus(agentId, status);
    res.json({ agent_id: agentId, status });
  } catch (error) {
    logger.error('Failed to update agent status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

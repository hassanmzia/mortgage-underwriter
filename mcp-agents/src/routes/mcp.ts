/**
 * MCP Protocol Routes
 */

import { Router, Request, Response } from 'express';
import { getMCPServer } from '../mcp/server';
import { logger } from '../utils/logger';

export const mcpRouter = Router();

// MCP protocol handler
mcpRouter.post('/message', async (req: Request, res: Response) => {
  try {
    const message = req.body;
    const mcpServer = getMCPServer();
    const result = await mcpServer.handleMessage(message);
    res.json(result);
  } catch (error) {
    logger.error('MCP message handling failed:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// List available tools
mcpRouter.get('/tools', async (req: Request, res: Response) => {
  try {
    const mcpServer = getMCPServer();
    const tools = mcpServer.listTools();
    res.json({ tools });
  } catch (error) {
    logger.error('Failed to list tools:', error);
    res.status(500).json({ error: 'Failed to list tools' });
  }
});

// Execute a tool
mcpRouter.post('/tools/:toolName/execute', async (req: Request, res: Response) => {
  try {
    const { toolName } = req.params;
    const args = req.body;

    const mcpServer = getMCPServer();
    const result = await mcpServer.executeTool(toolName, args);
    res.json(result);
  } catch (error) {
    logger.error('Tool execution failed:', error);
    res.status(500).json({ error: 'Failed to execute tool' });
  }
});

// List available resources
mcpRouter.get('/resources', async (req: Request, res: Response) => {
  try {
    const mcpServer = getMCPServer();
    const resources = mcpServer.listResources();
    res.json({ resources });
  } catch (error) {
    logger.error('Failed to list resources:', error);
    res.status(500).json({ error: 'Failed to list resources' });
  }
});

// Read a resource
mcpRouter.get('/resources/:uri', async (req: Request, res: Response) => {
  try {
    const uri = decodeURIComponent(req.params.uri);
    const mcpServer = getMCPServer();
    const content = await mcpServer.readResource(uri);
    res.json(content);
  } catch (error) {
    logger.error('Failed to read resource:', error);
    res.status(500).json({ error: 'Failed to read resource' });
  }
});

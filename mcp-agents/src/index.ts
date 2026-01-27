/**
 * MCP Agent Service Entry Point
 * Multi-agent mortgage underwriting system with MCP protocol
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config/environment';
import { logger } from './utils/logger';
import { workflowRouter } from './routes/workflow';
import { agentRouter } from './routes/agents';
import { ragRouter } from './routes/rag';
import { mcpRouter } from './routes/mcp';
import { a2aRouter } from './routes/a2a';
import { initializeChromaDB } from './rag/chromaClient';
import { initializeRedis } from './services/redis';
import { WorkflowOrchestrator } from './services/workflowOrchestrator';
import { MCPServer } from './mcp/server';
import { A2AHub } from './a2a/hub';

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.corsOrigins,
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors({ origin: config.corsOrigins }));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'mcp-agents',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/workflows', workflowRouter);
app.use('/api/agents', agentRouter);
app.use('/api/rag', ragRouter);
app.use('/api/mcp', mcpRouter);
app.use('/api/a2a', a2aRouter);

// Error handling
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: config.isDevelopment ? err.message : undefined
  });
});

// Initialize services
async function initializeServices() {
  try {
    // Initialize Redis
    await initializeRedis();
    logger.info('Redis connected');

    // Initialize ChromaDB
    await initializeChromaDB();
    logger.info('ChromaDB connected');

    // Initialize MCP Server
    const mcpServer = new MCPServer();
    await mcpServer.initialize();
    logger.info('MCP Server initialized');

    // Initialize A2A Hub
    const a2aHub = A2AHub.getInstance();
    await a2aHub.initialize();
    logger.info('A2A Hub initialized');

    // Initialize Workflow Orchestrator
    const orchestrator = WorkflowOrchestrator.getInstance();
    orchestrator.setSocketIO(io);
    logger.info('Workflow Orchestrator initialized');

    // Socket.IO connection handling
    io.on('connection', (socket) => {
      logger.info(`Client connected: ${socket.id}`);

      socket.on('join_workflow', (workflowId: string) => {
        socket.join(`workflow:${workflowId}`);
        logger.info(`Client ${socket.id} joined workflow ${workflowId}`);
      });

      socket.on('leave_workflow', (workflowId: string) => {
        socket.leave(`workflow:${workflowId}`);
      });

      socket.on('disconnect', () => {
        logger.info(`Client disconnected: ${socket.id}`);
      });
    });

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Start server
async function start() {
  await initializeServices();

  httpServer.listen(config.port, () => {
    logger.info(`MCP Agent Service running on port ${config.port}`);
    logger.info(`Environment: ${config.nodeEnv}`);
  });
}

start().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down...');
  httpServer.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

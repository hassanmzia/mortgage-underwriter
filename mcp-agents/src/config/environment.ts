/**
 * Environment Configuration
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',

  // CORS
  corsOrigins: process.env.CORS_ORIGINS?.split(',') || [
    'http://localhost:3001',
    'http://localhost:8001'
  ],

  // Redis
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',

  // ChromaDB
  chromaHost: process.env.CHROMADB_HOST || 'localhost',
  chromaPort: parseInt(process.env.CHROMADB_PORT || '8000', 10),

  // Django Backend
  djangoApiUrl: process.env.DJANGO_API_URL || 'http://localhost:8000',

  // OpenAI
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiApiBase: process.env.OPENAI_API_BASE || 'https://api.openai.com/v1',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',

  // Agent Configuration
  agentTimeout: parseInt(process.env.AGENT_TIMEOUT || '60000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),

  // RAG Configuration
  ragTopK: parseInt(process.env.RAG_TOP_K || '5', 10),
  ragCollectionName: process.env.RAG_COLLECTION || 'mortgage_policies',

  // MCP Configuration
  mcpServerName: 'mortgage-underwriter-mcp',
  mcpVersion: '1.0.0'
};

/**
 * MCP (Model Context Protocol) Server Implementation
 * Provides tools and resources to LLM agents
 */

import { logger } from '../utils/logger';
import { config } from '../config/environment';
import { calculatorTools } from '../tools/calculators';
import { queryPolicies, indexPolicy } from '../rag/chromaClient';

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export class MCPServer {
  private tools: Map<string, MCPTool> = new Map();
  private resources: Map<string, MCPResource> = new Map();

  async initialize(): Promise<void> {
    // Register calculator tools
    for (const tool of calculatorTools) {
      this.registerTool({
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: 'object',
          properties: this.zodToJsonSchema(tool.inputSchema)
        }
      });
    }

    // Register RAG tools
    this.registerTool({
      name: 'query_policies',
      description: 'Query underwriting policies using semantic search',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          category: { type: 'string', description: 'Policy category filter' },
          topK: { type: 'number', description: 'Number of results' }
        },
        required: ['query']
      }
    });

    // Register resources
    this.registerResource({
      uri: 'policy://mortgage/credit-guidelines',
      name: 'Credit Guidelines',
      description: 'Underwriting credit score and history guidelines',
      mimeType: 'text/plain'
    });

    this.registerResource({
      uri: 'policy://mortgage/income-guidelines',
      name: 'Income Guidelines',
      description: 'DTI ratios and income verification requirements',
      mimeType: 'text/plain'
    });

    this.registerResource({
      uri: 'policy://mortgage/asset-guidelines',
      name: 'Asset Guidelines',
      description: 'Reserve requirements and asset documentation',
      mimeType: 'text/plain'
    });

    this.registerResource({
      uri: 'policy://mortgage/collateral-guidelines',
      name: 'Collateral Guidelines',
      description: 'LTV ratios and property requirements',
      mimeType: 'text/plain'
    });

    logger.info(`MCP Server initialized with ${this.tools.size} tools and ${this.resources.size} resources`);
  }

  registerTool(tool: MCPTool): void {
    this.tools.set(tool.name, tool);
    logger.debug(`Registered tool: ${tool.name}`);
  }

  registerResource(resource: MCPResource): void {
    this.resources.set(resource.uri, resource);
    logger.debug(`Registered resource: ${resource.uri}`);
  }

  // List available tools
  listTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  // List available resources
  listResources(): MCPResource[] {
    return Array.from(this.resources.values());
  }

  // Execute a tool
  async executeTool(name: string, args: any): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool not found: ${name}`);
    }

    logger.info(`Executing tool: ${name}`);
    const startTime = Date.now();

    try {
      let result: any;

      // Handle built-in tools
      if (name === 'query_policies') {
        result = await this.executeQueryPolicies(args);
      } else {
        // Calculator tools
        const calcTool = calculatorTools.find(t => t.name === name);
        if (calcTool) {
          const validated = calcTool.inputSchema.parse(args);
          result = calcTool.handler(validated as any);
        } else {
          throw new Error(`No handler for tool: ${name}`);
        }
      }

      const duration = Date.now() - startTime;
      logger.info(`Tool ${name} completed in ${duration}ms`);

      return {
        success: true,
        result,
        executionTimeMs: duration
      };
    } catch (error) {
      logger.error(`Tool ${name} failed:`, error);
      return {
        success: false,
        error: (error as Error).message
      };
    }
  }

  // Read a resource
  async readResource(uri: string): Promise<any> {
    const resource = this.resources.get(uri);
    if (!resource) {
      throw new Error(`Resource not found: ${uri}`);
    }

    logger.info(`Reading resource: ${uri}`);

    // Query ChromaDB for policy content
    const category = uri.split('/').pop() || '';
    const policies = await queryPolicies(
      `${category} guidelines requirements`,
      5,
      category.replace('-guidelines', '')
    );

    return {
      uri,
      mimeType: resource.mimeType,
      content: policies.map(p => p.content).join('\n\n---\n\n')
    };
  }

  private async executeQueryPolicies(args: any): Promise<any> {
    const { query, category, topK = 5 } = args;
    const results = await queryPolicies(query, topK, category);

    return {
      query,
      results: results.map(r => ({
        id: r.id,
        content: r.content,
        metadata: r.metadata,
        relevanceScore: 1 - r.distance
      }))
    };
  }

  private zodToJsonSchema(schema: any): any {
    // Convert Zod schema to JSON Schema (simplified)
    const shape = schema._def?.shape?.() || {};
    const properties: any = {};

    for (const [key, value] of Object.entries(shape)) {
      const def = (value as any)._def;
      properties[key] = {
        type: this.zodTypeToJsonType(def?.typeName)
      };
    }

    return properties;
  }

  private zodTypeToJsonType(zodType: string): string {
    const mapping: Record<string, string> = {
      ZodString: 'string',
      ZodNumber: 'number',
      ZodBoolean: 'boolean',
      ZodArray: 'array',
      ZodObject: 'object'
    };
    return mapping[zodType] || 'string';
  }

  // Handle MCP protocol messages
  async handleMessage(message: any): Promise<any> {
    const { method, params } = message;

    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '1.0.0',
          serverInfo: {
            name: config.mcpServerName,
            version: config.mcpVersion
          },
          capabilities: {
            tools: true,
            resources: true
          }
        };

      case 'tools/list':
        return { tools: this.listTools() };

      case 'tools/call':
        return await this.executeTool(params.name, params.arguments);

      case 'resources/list':
        return { resources: this.listResources() };

      case 'resources/read':
        return await this.readResource(params.uri);

      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }
}

// Singleton instance
let mcpServer: MCPServer | null = null;

export function getMCPServer(): MCPServer {
  if (!mcpServer) {
    mcpServer = new MCPServer();
  }
  return mcpServer;
}

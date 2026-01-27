/**
 * Agent-to-Agent (A2A) Communication Hub
 * Enables direct communication between agents
 */

import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';
import { cacheSet, cacheGet, publishEvent } from '../services/redis';

export interface A2AMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  type: 'request' | 'response' | 'broadcast';
  action: string;
  payload: any;
  correlationId?: string;
  timestamp: Date;
}

export interface AgentCapability {
  agentId: string;
  name: string;
  capabilities: string[];
  status: 'online' | 'offline' | 'busy';
  lastSeen: Date;
}

export class A2AHub extends EventEmitter {
  private static instance: A2AHub;
  private agents: Map<string, AgentCapability> = new Map();
  private messageQueue: Map<string, A2AMessage[]> = new Map();
  private pendingRequests: Map<string, {
    resolve: (value: any) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }> = new Map();

  private constructor() {
    super();
  }

  static getInstance(): A2AHub {
    if (!A2AHub.instance) {
      A2AHub.instance = new A2AHub();
    }
    return A2AHub.instance;
  }

  async initialize(): Promise<void> {
    // Register core agents
    const coreAgents = [
      { id: 'credit_analyst', name: 'Credit Analyst', capabilities: ['credit_analysis', 'credit_score_check'] },
      { id: 'income_analyst', name: 'Income Analyst', capabilities: ['income_analysis', 'dti_calculation'] },
      { id: 'asset_analyst', name: 'Asset Analyst', capabilities: ['asset_analysis', 'reserve_calculation'] },
      { id: 'collateral_analyst', name: 'Collateral Analyst', capabilities: ['collateral_analysis', 'ltv_calculation'] },
      { id: 'critic', name: 'Critic Agent', capabilities: ['quality_review', 'bias_detection'] },
      { id: 'decision', name: 'Decision Agent', capabilities: ['decision_making', 'memo_generation'] },
      { id: 'supervisor', name: 'Supervisor', capabilities: ['orchestration', 'routing'] }
    ];

    for (const agent of coreAgents) {
      await this.registerAgent({
        agentId: agent.id,
        name: agent.name,
        capabilities: agent.capabilities,
        status: 'online',
        lastSeen: new Date()
      });
    }

    logger.info(`A2A Hub initialized with ${this.agents.size} agents`);
  }

  // Register an agent with the hub
  async registerAgent(agent: AgentCapability): Promise<void> {
    this.agents.set(agent.agentId, agent);
    this.messageQueue.set(agent.agentId, []);

    await cacheSet(`a2a:agent:${agent.agentId}`, agent, 3600);
    logger.info(`Agent registered: ${agent.agentId}`);

    this.emit('agent:registered', agent);
  }

  // Unregister an agent
  async unregisterAgent(agentId: string): Promise<void> {
    this.agents.delete(agentId);
    this.messageQueue.delete(agentId);

    logger.info(`Agent unregistered: ${agentId}`);
    this.emit('agent:unregistered', agentId);
  }

  // Update agent status
  async updateAgentStatus(agentId: string, status: 'online' | 'offline' | 'busy'): Promise<void> {
    const agent = this.agents.get(agentId);
    if (agent) {
      agent.status = status;
      agent.lastSeen = new Date();
      await cacheSet(`a2a:agent:${agentId}`, agent, 3600);
    }
  }

  // Send a message to a specific agent
  async sendMessage(message: Omit<A2AMessage, 'id' | 'timestamp'>): Promise<string> {
    const fullMessage: A2AMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date()
    };

    // Store message
    const queue = this.messageQueue.get(message.toAgent) || [];
    queue.push(fullMessage);
    this.messageQueue.set(message.toAgent, queue);

    // Publish to Redis for distributed systems
    await publishEvent(`a2a:${message.toAgent}`, fullMessage);

    logger.debug(`Message sent: ${fullMessage.fromAgent} -> ${fullMessage.toAgent}`);
    this.emit('message:sent', fullMessage);

    return fullMessage.id;
  }

  // Send a request and wait for response
  async request(
    fromAgent: string,
    toAgent: string,
    action: string,
    payload: any,
    timeoutMs: number = 30000
  ): Promise<any> {
    const correlationId = uuidv4();

    return new Promise((resolve, reject) => {
      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(correlationId);
        reject(new Error(`Request timeout: ${action}`));
      }, timeoutMs);

      // Store pending request
      this.pendingRequests.set(correlationId, { resolve, reject, timeout });

      // Send the request
      this.sendMessage({
        fromAgent,
        toAgent,
        type: 'request',
        action,
        payload,
        correlationId
      });
    });
  }

  // Handle incoming response
  handleResponse(message: A2AMessage): void {
    if (message.type !== 'response' || !message.correlationId) {
      return;
    }

    const pending = this.pendingRequests.get(message.correlationId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.correlationId);
      pending.resolve(message.payload);
    }
  }

  // Broadcast to all agents
  async broadcast(fromAgent: string, action: string, payload: any): Promise<void> {
    for (const [agentId] of this.agents) {
      if (agentId !== fromAgent) {
        await this.sendMessage({
          fromAgent,
          toAgent: agentId,
          type: 'broadcast',
          action,
          payload
        });
      }
    }
  }

  // Get messages for an agent
  getMessages(agentId: string): A2AMessage[] {
    return this.messageQueue.get(agentId) || [];
  }

  // Clear messages for an agent
  clearMessages(agentId: string): void {
    this.messageQueue.set(agentId, []);
  }

  // Find agents by capability
  findAgentsByCapability(capability: string): AgentCapability[] {
    return Array.from(this.agents.values())
      .filter(agent =>
        agent.capabilities.includes(capability) &&
        agent.status === 'online'
      );
  }

  // Get all agents
  getAllAgents(): AgentCapability[] {
    return Array.from(this.agents.values());
  }

  // Get agent by ID
  getAgent(agentId: string): AgentCapability | undefined {
    return this.agents.get(agentId);
  }
}

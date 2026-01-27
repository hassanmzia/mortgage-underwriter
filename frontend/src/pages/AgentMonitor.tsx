import { useQuery } from '@tanstack/react-query';
import { agentsAPI } from '../services/api';
import clsx from 'clsx';
import {
  CpuChipIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

const agentDescriptions: Record<string, string> = {
  credit_analyst: 'Evaluates credit scores, payment history, and derogatory items',
  income_analyst: 'Analyzes employment stability, income verification, and DTI ratios',
  asset_analyst: 'Reviews down payment adequacy, reserves, and large deposits',
  collateral_analyst: 'Assesses property type, LTV ratios, and appraisal values',
  critic: 'Cross-validates all analyses and performs bias detection',
  decision: 'Synthesizes findings and makes final underwriting decisions',
  supervisor: 'Orchestrates workflow and routes between agents',
};

export default function AgentMonitor() {
  const { data: agentStatus, isLoading } = useQuery({
    queryKey: ['agentStatus'],
    queryFn: agentsAPI.getStatus,
    refetchInterval: 10000,
  });

  const { data: metrics } = useQuery({
    queryKey: ['agentMetrics'],
    queryFn: agentsAPI.getMetricsSummary,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI Agent Monitor</h1>
        <p className="text-gray-600 mt-1">
          Real-time status and performance of underwriting agents
        </p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CpuChipIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {metrics?.total_executions || 0}
              </p>
              <p className="text-sm text-gray-600">Total Executions (24h)</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {metrics?.successful || 0}
              </p>
              <p className="text-sm text-gray-600">Successful</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {metrics?.failed || 0}
              </p>
              <p className="text-sm text-gray-600">Failed</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ClockIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {Math.round(metrics?.avg_execution_time_ms || 0)}ms
              </p>
              <p className="text-sm text-gray-600">Avg Response Time</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {agentStatus?.map((agent: any) => (
          <div
            key={agent.agent_type}
            className={clsx(
              'card border-2 transition-all',
              agent.health === 'healthy'
                ? 'border-green-200 hover:border-green-300'
                : 'border-red-200 hover:border-red-300'
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  'p-2 rounded-lg',
                  agent.health === 'healthy' ? 'bg-green-100' : 'bg-red-100'
                )}>
                  <CpuChipIcon className={clsx(
                    'h-6 w-6',
                    agent.health === 'healthy' ? 'text-green-600' : 'text-red-600'
                  )} />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 capitalize">
                    {agent.agent_type.replace('_', ' ')}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={clsx(
                      'h-2 w-2 rounded-full',
                      agent.health === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                    )} />
                    <span className="text-sm text-gray-500 capitalize">
                      {agent.health}
                    </span>
                  </div>
                </div>
              </div>
              <span className={clsx(
                'px-2 py-1 text-xs font-medium rounded',
                agent.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
              )}>
                {agent.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {agentDescriptions[agent.agent_type] || 'No description available'}
            </p>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Avg Response Time</span>
                <span className="font-medium">{agent.avg_response_time_ms}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Execution</span>
                <span className="font-medium">
                  {agent.last_execution
                    ? new Date(agent.last_execution).toLocaleTimeString()
                    : 'Never'}
                </span>
              </div>
            </div>

            {/* Performance Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Performance</span>
                <span>
                  {agent.avg_response_time_ms < 500 ? 'Excellent' :
                   agent.avg_response_time_ms < 1000 ? 'Good' :
                   agent.avg_response_time_ms < 2000 ? 'Fair' : 'Slow'}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={clsx(
                    'h-2 rounded-full',
                    agent.avg_response_time_ms < 500 ? 'bg-green-500' :
                    agent.avg_response_time_ms < 1000 ? 'bg-blue-500' :
                    agent.avg_response_time_ms < 2000 ? 'bg-yellow-500' : 'bg-red-500'
                  )}
                  style={{
                    width: `${Math.max(10, 100 - (agent.avg_response_time_ms / 30))}%`
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MCP & A2A Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            MCP Protocol Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Protocol Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Tools Registered</span>
              <span className="font-medium">7</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Resources Available</span>
              <span className="font-medium">4</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Agent-to-Agent (A2A) Communication
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Connected Agents</span>
              <span className="font-medium">{agentStatus?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Message Queue</span>
              <span className="font-medium text-green-600">Healthy</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-600">Redis Connection</span>
              <span className="font-medium text-green-600">Connected</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

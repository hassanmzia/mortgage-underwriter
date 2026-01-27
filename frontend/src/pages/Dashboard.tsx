import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { applicationsAPI, underwritingAPI, complianceAPI, agentsAPI } from '../services/api';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

export default function Dashboard() {
  const { data: appSummary } = useQuery({
    queryKey: ['applicationSummary'],
    queryFn: applicationsAPI.getSummary,
  });

  const { data: workflowMetrics } = useQuery({
    queryKey: ['workflowMetrics'],
    queryFn: underwritingAPI.getMetrics,
  });

  const { data: complianceDashboard } = useQuery({
    queryKey: ['complianceDashboard'],
    queryFn: complianceAPI.getDashboard,
  });

  const { data: agentStatus } = useQuery({
    queryKey: ['agentStatus'],
    queryFn: agentsAPI.getStatus,
  });

  const stats = [
    {
      name: 'Total Applications',
      value: appSummary?.total_applications || 0,
      icon: DocumentTextIcon,
      color: 'bg-blue-500',
      change: '+12%',
    },
    {
      name: 'Approved',
      value: appSummary?.approved || 0,
      icon: CheckCircleIcon,
      color: 'bg-green-500',
      change: '+8%',
    },
    {
      name: 'Denied',
      value: appSummary?.denied || 0,
      icon: XCircleIcon,
      color: 'bg-red-500',
      change: '-3%',
    },
    {
      name: 'Pending Review',
      value: appSummary?.pending_review || 0,
      icon: ClockIcon,
      color: 'bg-yellow-500',
      change: '+5%',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Overview of your mortgage underwriting operations
          </p>
        </div>
        <Link to="/applications" className="btn-primary">
          View All Applications
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="card">
            <div className="flex items-center justify-between">
              <div className={clsx('p-2 rounded-lg', stat.color)}>
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              <span className={clsx(
                'text-sm font-medium',
                stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
              )}>
                {stat.change}
              </span>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Workflow Metrics */}
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            AI Underwriting Performance
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-primary-600">
                {workflowMetrics?.approval_rate?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-600">Approval Rate</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-accent-600">
                {workflowMetrics?.completed || 0}
              </p>
              <p className="text-sm text-gray-600">Workflows Completed</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">
                {Math.round((workflowMetrics?.average_duration_seconds || 0) / 60)}m
              </p>
              <p className="text-sm text-gray-600">Avg Processing Time</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">
                {workflowMetrics?.human_override_rate?.toFixed(1) || 0}%
              </p>
              <p className="text-sm text-gray-600">Human Override Rate</p>
            </div>
          </div>

          {/* Progress bar for in-progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Workflows in Progress
              </span>
              <span className="text-sm text-gray-500">
                {workflowMetrics?.in_progress || 0} active
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full"
                style={{
                  width: `${((workflowMetrics?.in_progress || 0) / Math.max(workflowMetrics?.total_workflows || 1, 1)) * 100}%`
                }}
              />
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Compliance Status
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Critical Flags
                </span>
              </div>
              <span className="text-lg font-bold text-red-600">
                {complianceDashboard?.critical_flags || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div className="flex items-center gap-3">
                <ClockIcon className="h-5 w-5 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">
                  Unresolved
                </span>
              </div>
              <span className="text-lg font-bold text-yellow-600">
                {complianceDashboard?.unresolved_flags || 0}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircleIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-800">
                  Checks Passed
                </span>
              </div>
              <span className="text-lg font-bold text-green-600">
                {complianceDashboard?.compliance_checks_passed || 0}
              </span>
            </div>
          </div>
          <Link
            to="/compliance"
            className="mt-4 block text-center text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View Compliance Dashboard
          </Link>
        </div>
      </div>

      {/* Agent Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">AI Agent Status</h2>
          <Link
            to="/agents"
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            View All
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {agentStatus?.map((agent: any) => (
            <div
              key={agent.agent_type}
              className={clsx(
                'p-4 rounded-lg border-2 transition-all',
                agent.health === 'healthy'
                  ? 'border-green-200 bg-green-50'
                  : 'border-red-200 bg-red-50'
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <CpuChipIcon className={clsx(
                  'h-5 w-5',
                  agent.health === 'healthy' ? 'text-green-600' : 'text-red-600'
                )} />
                <span className={clsx(
                  'h-2 w-2 rounded-full',
                  agent.health === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                )} />
              </div>
              <p className="text-sm font-medium text-gray-900 capitalize">
                {agent.agent_type.replace('_', ' ')}
              </p>
              <p className="text-xs text-gray-500">
                {agent.avg_response_time_ms}ms avg
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Loan Volume */}
      <div className="card">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-100 rounded-xl">
            <ArrowTrendingUpIcon className="h-8 w-8 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-gray-600">Total Loan Volume</p>
            <p className="text-3xl font-bold text-gray-900">
              ${((appSummary?.total_loan_volume || 0) / 1000000).toFixed(2)}M
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

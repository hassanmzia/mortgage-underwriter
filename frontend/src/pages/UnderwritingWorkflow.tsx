import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { underwritingAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';
import {
  CheckCircleIcon,
  ClockIcon,
  XCircleIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';

const agentStages = [
  { key: 'credit_analysis', name: 'Credit Analyst', icon: '💳' },
  { key: 'income_analysis', name: 'Income Analyst', icon: '💵' },
  { key: 'asset_analysis', name: 'Asset Analyst', icon: '💰' },
  { key: 'collateral_analysis', name: 'Collateral Analyst', icon: '🏠' },
  { key: 'critic_review', name: 'Critic Agent', icon: '🔎' },
  { key: 'decision', name: 'Decision Agent', icon: '⚖️' },
];

export default function UnderwritingWorkflow() {
  const { workflowId } = useParams<{ workflowId: string }>();
  const queryClient = useQueryClient();
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);

  const { data: workflow, isLoading } = useQuery({
    queryKey: ['workflow', workflowId],
    queryFn: () => underwritingAPI.getWorkflow(workflowId!),
    enabled: !!workflowId,
    refetchInterval: (data) =>
      data?.status === 'completed' || data?.status === 'failed' ? false : 3000,
  });

  const humanReviewMutation = useMutation({
    mutationFn: (data: { decision: string; notes: string }) =>
      underwritingAPI.humanReview(workflowId!, data),
    onSuccess: () => {
      toast.success('Review submitted successfully');
      queryClient.invalidateQueries({ queryKey: ['workflow', workflowId] });
    },
    onError: () => {
      toast.error('Failed to submit review');
    },
  });

  const handleSubmitReview = () => {
    if (!reviewDecision) {
      toast.error('Please select a decision');
      return;
    }
    humanReviewMutation.mutate({ decision: reviewDecision, notes: reviewNotes });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Workflow not found</p>
      </div>
    );
  }

  const getStageStatus = (stageKey: string) => {
    const stageIndex = agentStages.findIndex((s) => s.key === stageKey);
    const currentIndex = agentStages.findIndex((s) => s.key === workflow.status);

    if (stageIndex < currentIndex || workflow.status === 'completed') {
      return 'completed';
    } else if (stageIndex === currentIndex) {
      return 'active';
    }
    return 'pending';
  };

  const getAgentAnalysis = (agentType: string) => {
    return workflow.analyses?.find((a: any) => a.agent_type === agentType);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Underwriting Workflow
          </h1>
          <p className="text-gray-600 mt-1">
            Case: {workflow.application_case_id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={clsx(
            'px-3 py-1 rounded-full text-sm font-medium',
            workflow.status === 'completed' ? 'bg-green-100 text-green-800' :
            workflow.status === 'failed' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          )}>
            {workflow.status.replace('_', ' ').toUpperCase()}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Workflow Progress</h2>
          <span className="text-2xl font-bold text-primary-600">
            {workflow.progress_percent}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-primary-500 to-accent-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${workflow.progress_percent}%` }}
          />
        </div>
      </div>

      {/* Agent Pipeline */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Agent Pipeline</h2>
        <div className="space-y-4">
          {agentStages.map((stage, index) => {
            const status = getStageStatus(stage.key);
            const analysis = getAgentAnalysis(stage.key.replace('_analysis', '_analyst').replace('_review', ''));

            return (
              <div key={stage.key}>
                <div
                  className={clsx(
                    'flex items-center gap-4 p-4 rounded-lg cursor-pointer transition-all',
                    status === 'completed' ? 'bg-green-50 border border-green-200' :
                    status === 'active' ? 'bg-blue-50 border border-blue-200' :
                    'bg-gray-50 border border-gray-200'
                  )}
                  onClick={() => setExpandedAgent(expandedAgent === stage.key ? null : stage.key)}
                >
                  <div className="text-2xl">{stage.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{stage.name}</h3>
                    <p className="text-sm text-gray-500">
                      {status === 'completed' ? 'Analysis complete' :
                       status === 'active' ? 'Processing...' :
                       'Pending'}
                    </p>
                  </div>
                  <div>
                    {status === 'completed' && (
                      <CheckCircleIcon className="h-6 w-6 text-green-500" />
                    )}
                    {status === 'active' && (
                      <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                    )}
                    {status === 'pending' && (
                      <ClockIcon className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Analysis */}
                {expandedAgent === stage.key && analysis && (
                  <div className="mt-2 ml-12 p-4 bg-white border rounded-lg">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                      {analysis.analysis_text}
                    </pre>
                    {analysis.risk_factors?.length > 0 && (
                      <div className="mt-4 border-t pt-4">
                        <h4 className="font-medium text-gray-900 mb-2">Risk Factors</h4>
                        <ul className="space-y-1">
                          {analysis.risk_factors.map((rf: any, i: number) => (
                            <li key={i} className="text-sm text-gray-600">
                              • {rf.description}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Decision Section */}
      {workflow.decision && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Decision</h2>
          <div className={clsx(
            'p-4 rounded-lg border-l-4',
            workflow.decision.ai_decision === 'approved' ? 'bg-green-50 border-green-500' :
            workflow.decision.ai_decision === 'denied' ? 'bg-red-50 border-red-500' :
            'bg-yellow-50 border-yellow-500'
          )}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xl font-bold capitalize">
                  {workflow.decision.ai_decision.replace('_', ' ')}
                </p>
                <p className="text-gray-600">
                  Risk Score: {workflow.decision.ai_risk_score}/100
                </p>
              </div>
            </div>
            <div className="prose prose-sm max-w-none">
              <h4 className="font-medium text-gray-900">Decision Memo</h4>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap bg-white p-4 rounded">
                {workflow.decision.decision_memo}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Human Review Section */}
      {workflow.status === 'human_review' && !workflow.decision?.human_override && (
        <div className="card border-2 border-orange-300">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Human Review Required
          </h2>
          <div className="space-y-4">
            <div>
              <label className="label">Your Decision</label>
              <div className="flex gap-4">
                {['approved', 'conditional', 'denied'].map((decision) => (
                  <button
                    key={decision}
                    onClick={() => setReviewDecision(decision)}
                    className={clsx(
                      'px-4 py-2 rounded-lg border-2 font-medium capitalize transition-all',
                      reviewDecision === decision
                        ? decision === 'approved' ? 'border-green-500 bg-green-50 text-green-700' :
                          decision === 'denied' ? 'border-red-500 bg-red-50 text-red-700' :
                          'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-300 hover:border-gray-400'
                    )}
                  >
                    {decision}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Review Notes</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="input h-32"
                placeholder="Enter your review notes and reasoning..."
              />
            </div>
            <button
              onClick={handleSubmitReview}
              disabled={humanReviewMutation.isPending}
              className="btn-primary w-full"
            >
              {humanReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </div>
      )}

      {/* Audit Trail */}
      {workflow.audit_trail?.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Audit Trail</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {workflow.audit_trail.map((entry: any) => (
              <div key={entry.id} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {new Date(entry.timestamp).toLocaleString()}
                </div>
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{entry.description}</p>
                  {entry.agent_name && (
                    <p className="text-xs text-gray-500">Agent: {entry.agent_name}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

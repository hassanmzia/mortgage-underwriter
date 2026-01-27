import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { complianceAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';
import clsx from 'clsx';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ShieldExclamationIcon,
} from '@heroicons/react/24/outline';

export default function Compliance() {
  const queryClient = useQueryClient();
  const [selectedFlag, setSelectedFlag] = useState<any>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const { data: dashboard } = useQuery({
    queryKey: ['complianceDashboard'],
    queryFn: complianceAPI.getDashboard,
  });

  const { data: biasFlags } = useQuery({
    queryKey: ['biasFlags'],
    queryFn: () => complianceAPI.listBiasFlags({ unresolved: 'true' }),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      complianceAPI.resolveBiasFlag(id, notes),
    onSuccess: () => {
      toast.success('Bias flag resolved');
      queryClient.invalidateQueries({ queryKey: ['biasFlags'] });
      queryClient.invalidateQueries({ queryKey: ['complianceDashboard'] });
      setSelectedFlag(null);
      setResolutionNotes('');
    },
    onError: () => {
      toast.error('Failed to resolve flag');
    },
  });

  const severityColors: Record<string, string> = {
    low: 'bg-blue-100 text-blue-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    critical: 'bg-red-100 text-red-800',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Compliance Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Monitor bias detection and fair lending compliance
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <ShieldExclamationIcon className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {dashboard?.critical_flags || 0}
              </p>
              <p className="text-sm text-gray-600">Critical Flags</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {dashboard?.unresolved_flags || 0}
              </p>
              <p className="text-sm text-gray-600">Unresolved Flags</p>
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
                {dashboard?.compliance_checks_passed || 0}
              </p>
              <p className="text-sm text-gray-600">Checks Passed</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <ExclamationTriangleIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {dashboard?.applications_with_flags || 0}
              </p>
              <p className="text-sm text-gray-600">Affected Applications</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bias Flags List */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Unresolved Bias Flags
        </h2>

        {biasFlags?.results?.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-600">No unresolved bias flags</p>
          </div>
        ) : (
          <div className="space-y-4">
            {biasFlags?.results?.map((flag: any) => (
              <div
                key={flag.id}
                className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => setSelectedFlag(flag)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={clsx(
                        'status-badge',
                        severityColors[flag.severity]
                      )}>
                        {flag.severity.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-500">
                        {flag.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-gray-900 font-medium">{flag.description}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Case: {flag.application_case_id} •
                      {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <button className="btn-secondary text-sm">
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Resolution Modal */}
      {selectedFlag && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resolve Bias Flag
            </h3>

            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className={clsx(
                    'status-badge',
                    severityColors[selectedFlag.severity]
                  )}>
                    {selectedFlag.severity.toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500">
                    {selectedFlag.category.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-gray-900">{selectedFlag.description}</p>
                {selectedFlag.source_text && (
                  <div className="mt-2 p-2 bg-white rounded border">
                    <p className="text-xs text-gray-500">Source text:</p>
                    <p className="text-sm text-gray-700">{selectedFlag.source_text}</p>
                  </div>
                )}
              </div>

              <div>
                <label className="label">Resolution Notes</label>
                <textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="input h-32"
                  placeholder="Explain your resolution..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setSelectedFlag(null);
                    setResolutionNotes('');
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={() => resolveMutation.mutate({
                    id: selectedFlag.id,
                    notes: resolutionNotes
                  })}
                  disabled={!resolutionNotes || resolveMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {resolveMutation.isPending ? 'Resolving...' : 'Resolve Flag'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { applicationsAPI } from '../services/api';
import { formatDistanceToNow } from 'date-fns';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import type { LoanApplication } from '../types';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  in_review: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-purple-100 text-purple-800',
  underwriting: 'bg-indigo-100 text-indigo-800',
  approved: 'bg-green-100 text-green-800',
  conditional: 'bg-amber-100 text-amber-800',
  denied: 'bg-red-100 text-red-800',
  suspended: 'bg-orange-100 text-orange-800',
  withdrawn: 'bg-gray-100 text-gray-800',
  closed: 'bg-gray-100 text-gray-800',
};

export default function Applications() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['applications', search, statusFilter],
    queryFn: () => applicationsAPI.list({
      search: search || undefined,
      status: statusFilter || undefined,
    }),
  });

  const applications: LoanApplication[] = data?.results || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loan Applications</h1>
          <p className="text-gray-600 mt-1">
            Manage and review mortgage applications
          </p>
        </div>
        <button
          onClick={() => navigate('/applications/new')}
          className="btn-primary flex items-center gap-2"
        >
          <PlusIcon className="h-5 w-5" />
          New Application
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by case ID or borrower name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="h-5 w-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input w-40"
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="underwriting">Underwriting</option>
              <option value="approved">Approved</option>
              <option value="conditional">Conditional</option>
              <option value="denied">Denied</option>
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card overflow-hidden p-0">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-600">No applications found</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Case ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Borrower
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loan Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Submitted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link
                      to={`/applications/${app.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {app.case_id}
                    </Link>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {app.borrower_name || 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {app.property_address || 'No address'}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-sm font-medium text-gray-900">
                      ${app.loan_amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {app.loan_type} - {app.loan_purpose.replace('_', ' ')}
                    </p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={clsx(
                      'status-badge capitalize',
                      statusColors[app.status] || 'bg-gray-100 text-gray-800'
                    )}>
                      {app.status.replace('_', ' ')}
                    </span>
                    {app.requires_human_review && !app.human_review_completed && (
                      <span className="ml-2 status-badge bg-orange-100 text-orange-800">
                        Review Required
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {app.ai_risk_score !== null && app.ai_risk_score !== undefined ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div
                            className={clsx(
                              'h-2 rounded-full',
                              app.ai_risk_score <= 30 ? 'bg-green-500' :
                              app.ai_risk_score <= 60 ? 'bg-yellow-500' : 'bg-red-500'
                            )}
                            style={{ width: `${100 - app.ai_risk_score}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">
                          {app.ai_risk_score}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {app.submitted_at
                      ? formatDistanceToNow(new Date(app.submitted_at), { addSuffix: true })
                      : 'Not submitted'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <Link
                      to={`/applications/${app.id}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

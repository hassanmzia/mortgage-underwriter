import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { applicationsAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import clsx from 'clsx';

const reviewRoles = ['admin', 'senior_underwriter', 'reviewer'];
const activeStatuses = ['submitted', 'in_review', 'processing', 'underwriting'];

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reviewDecision, setReviewDecision] = useState('');
  const [reviewComments, setReviewComments] = useState('');

  const canReview = user && reviewRoles.includes(user.role);

  const { data: application, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsAPI.get(id!),
    enabled: !!id,
  });

  const submitMutation = useMutation({
    mutationFn: () => applicationsAPI.submit(id!),
    onSuccess: () => {
      toast.success('Application submitted for underwriting!');
      queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to submit application';
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => applicationsAPI.delete(id!),
    onSuccess: () => {
      toast.success('Application deleted');
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      navigate('/applications');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to delete application';
      toast.error(message);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (data: { decision: string; comments: string }) =>
      applicationsAPI.humanReview(id!, data.decision, data.comments),
    onSuccess: (data) => {
      toast.success(`Application ${data.status || 'reviewed'}`);
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      setReviewDecision('');
      setReviewComments('');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Failed to submit review';
      toast.error(message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!application) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Application not found</p>
      </div>
    );
  }

  const borrower = application.borrowers?.[0];
  const property = application.property;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">
              {application.case_id}
            </h1>
            <span className={clsx(
              'status-badge capitalize',
              application.status === 'approved' ? 'status-approved' :
              application.status === 'denied' ? 'status-denied' :
              application.status === 'conditional' ? 'status-conditional' :
              'status-pending'
            )}>
              {application.status.replace('_', ' ')}
            </span>
          </div>
          <p className="text-gray-600 mt-1">
            {borrower?.full_name || 'Unknown Borrower'}
          </p>
        </div>
        <div className="flex gap-3">
          {application.status === 'draft' && (
            <>
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="btn-primary"
              >
                {submitMutation.isPending ? 'Submitting...' : 'Submit for Underwriting'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 rounded-lg font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
              >
                Delete
              </button>
            </>
          )}
          {canReview && activeStatuses.includes(application.status) && (
            <a href="#review-section" className="btn-primary">
              Review & Decide
            </a>
          )}
          {application.underwriting_workflow && (
            <Link
              to={`/underwriting/${application.underwriting_workflow.id}`}
              className="btn-secondary"
            >
              View Workflow
            </Link>
          )}
        </div>
      </div>

      {/* AI Decision Summary */}
      {application.ai_recommendation && (
        <div className={clsx(
          'card border-l-4',
          application.ai_recommendation === 'approved' ? 'border-green-500 bg-green-50' :
          application.ai_recommendation === 'denied' ? 'border-red-500 bg-red-50' :
          'border-yellow-500 bg-yellow-50'
        )}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                AI Recommendation: {application.ai_recommendation.toUpperCase()}
              </h2>
              <p className="text-gray-600 mt-1">
                Risk Score: {application.ai_risk_score}/100 |
                Confidence: {(application.ai_confidence_score * 100).toFixed(0)}%
              </p>
            </div>
            {application.requires_human_review && (
              <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-medium">
                Requires Human Review
              </span>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Loan Details */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Loan Details</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-600">Loan Amount</dt>
              <dd className="font-medium">${application.loan_amount.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Down Payment</dt>
              <dd className="font-medium">${application.down_payment.toLocaleString()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Loan Type</dt>
              <dd className="font-medium capitalize">{application.loan_type}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Purpose</dt>
              <dd className="font-medium capitalize">{application.loan_purpose.replace('_', ' ')}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">Term</dt>
              <dd className="font-medium">{application.loan_term_months / 12} years</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-600">LTV Ratio</dt>
              <dd className="font-medium">{application.ltv_ratio?.toFixed(2)}%</dd>
            </div>
          </dl>
        </div>

        {/* Borrower Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Borrower Information</h2>
          {borrower ? (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Name</dt>
                <dd className="font-medium">{borrower.full_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">SSN</dt>
                <dd className="font-medium">{borrower.masked_ssn}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Email</dt>
                <dd className="font-medium text-sm">{borrower.email}</dd>
              </div>
              {borrower.credit_profile && (
                <>
                  <div className="border-t pt-3">
                    <p className="text-sm font-medium text-gray-700 mb-2">Credit Profile</p>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Credit Score</dt>
                    <dd className="font-medium">{borrower.credit_profile.credit_score}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Bankruptcies</dt>
                    <dd className="font-medium">{borrower.credit_profile.bankruptcies}</dd>
                  </div>
                </>
              )}
            </dl>
          ) : (
            <p className="text-gray-500">No borrower information available</p>
          )}
        </div>

        {/* Property Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h2>
          {property ? (
            <dl className="space-y-3">
              <div className="flex justify-between">
                <dt className="text-gray-600">Address</dt>
                <dd className="font-medium text-sm text-right">
                  {property.street_address}<br />
                  {property.city}, {property.state} {property.zip_code}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Type</dt>
                <dd className="font-medium capitalize">{property.property_type.replace('_', ' ')}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Appraised Value</dt>
                <dd className="font-medium">${property.appraised_value?.toLocaleString()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Year Built</dt>
                <dd className="font-medium">{property.year_built}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Size</dt>
                <dd className="font-medium">{property.square_feet.toLocaleString()} sqft</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Bedrooms/Baths</dt>
                <dd className="font-medium">{property.bedrooms} / {property.bathrooms}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-gray-500">No property information available</p>
          )}
        </div>
      </div>

      {/* Underwriting Link */}
      {application.underwriting_workflow && (
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Underwriting Workflow</h2>
              <p className="text-gray-600 mt-1">
                Status: <span className="capitalize">{application.underwriting_workflow.status?.replace('_', ' ')}</span>
              </p>
            </div>
            <Link
              to={`/underwriting/${application.underwriting_workflow.id}`}
              className="btn-secondary"
            >
              View Workflow Details
            </Link>
          </div>
        </div>
      )}

      {/* Review & Decision Section for Senior Underwriters */}
      {canReview && activeStatuses.includes(application.status) && !application.human_review_completed && (
        <div id="review-section" className="card border-2 border-primary-300">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Review & Decision
          </h2>
          <p className="text-gray-600 mb-4">
            As a {user?.role?.replace('_', ' ')}, you can make a decision on this application.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Decision</label>
              <div className="flex gap-3">
                {[
                  { value: 'approve', label: 'Approve', color: 'green' },
                  { value: 'condition', label: 'Conditional', color: 'yellow' },
                  { value: 'deny', label: 'Deny', color: 'red' },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setReviewDecision(opt.value)}
                    className={clsx(
                      'px-5 py-2.5 rounded-lg border-2 font-medium transition-all',
                      reviewDecision === opt.value
                        ? opt.color === 'green' ? 'border-green-500 bg-green-50 text-green-700' :
                          opt.color === 'red' ? 'border-red-500 bg-red-50 text-red-700' :
                          'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-300 text-gray-600 hover:border-gray-400'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments / Reasoning
              </label>
              <textarea
                value={reviewComments}
                onChange={(e) => setReviewComments(e.target.value)}
                className="input h-28"
                placeholder="Enter your review notes and reasoning for this decision..."
              />
            </div>

            <button
              onClick={() => {
                if (!reviewDecision) {
                  toast.error('Please select a decision');
                  return;
                }
                reviewMutation.mutate({ decision: reviewDecision, comments: reviewComments });
              }}
              disabled={reviewMutation.isPending || !reviewDecision}
              className={clsx(
                'w-full px-4 py-2.5 rounded-lg font-medium text-white transition-colors',
                reviewDecision === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                reviewDecision === 'deny' ? 'bg-red-600 hover:bg-red-700' :
                reviewDecision === 'condition' ? 'bg-yellow-600 hover:bg-yellow-700' :
                'bg-primary-600 hover:bg-primary-700'
              )}
            >
              {reviewMutation.isPending ? 'Submitting...' : 'Submit Decision'}
            </button>
          </div>
        </div>
      )}

      {/* Decision Completed */}
      {application.human_review_completed && application.decision_at && (
        <div className={clsx(
          'card border-l-4',
          application.status === 'approved' ? 'border-green-500 bg-green-50' :
          application.status === 'denied' ? 'border-red-500 bg-red-50' :
          application.status === 'conditional' ? 'border-yellow-500 bg-yellow-50' :
          'border-gray-500 bg-gray-50'
        )}>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Final Decision</h2>
          <p className="text-xl font-bold capitalize">
            {application.status.replace('_', ' ')}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            Decided on {new Date(application.decision_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Application</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete application <strong>{application.case_id}</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 rounded-lg font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 rounded-lg font-medium text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

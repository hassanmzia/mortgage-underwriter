import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { applicationsAPI } from '../services/api';
import clsx from 'clsx';

export default function ApplicationDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

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
            <button
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="btn-primary"
            >
              {submitMutation.isPending ? 'Submitting...' : 'Submit for Underwriting'}
            </button>
          )}
          {application.requires_human_review && !application.human_review_completed && (
            <Link
              to={`/underwriting/${application.underwriting_workflow?.id}`}
              className="btn-primary"
            >
              Review Decision
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
                Status: {application.underwriting_workflow.status}
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
    </div>
  );
}

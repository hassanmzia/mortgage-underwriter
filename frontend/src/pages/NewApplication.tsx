import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { applicationsAPI } from '../services/api';
import {
  ArrowLeftIcon,
  HomeIcon,
  UserIcon,
  BanknotesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface LoanForm {
  loan_type: string;
  loan_purpose: string;
  loan_amount: string;
  down_payment: string;
  interest_rate: string;
  loan_term_months: number;
  occupancy_type: string;
  notes: string;
}

interface BorrowerForm {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  date_of_birth: string;
  ssn: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
}

interface PropertyForm {
  property_address: string;
  property_city: string;
  property_state: string;
  property_zip: string;
  property_type: string;
  estimated_value: string;
}

const steps = [
  { id: 'loan', name: 'Loan Details', icon: BanknotesIcon },
  { id: 'borrower', name: 'Borrower Info', icon: UserIcon },
  { id: 'property', name: 'Property', icon: HomeIcon },
  { id: 'review', name: 'Review & Submit', icon: CheckCircleIcon },
];

export default function NewApplication() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const loanForm = useForm<LoanForm>({
    defaultValues: {
      loan_type: 'conventional',
      loan_purpose: 'purchase',
      loan_amount: '',
      down_payment: '',
      interest_rate: '',
      loan_term_months: 360,
      occupancy_type: 'primary',
      notes: '',
    },
  });

  const borrowerForm = useForm<BorrowerForm>({
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      date_of_birth: '',
      ssn: '',
      street_address: '',
      city: '',
      state: '',
      zip_code: '',
    },
  });

  const propertyForm = useForm<PropertyForm>({
    defaultValues: {
      property_address: '',
      property_city: '',
      property_state: '',
      property_zip: '',
      property_type: 'single_family',
      estimated_value: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const loanData = loanForm.getValues();
      const borrowerData = borrowerForm.getValues();
      const propertyData = propertyForm.getValues();

      // Create the application
      const application = await applicationsAPI.create({
        loan_type: loanData.loan_type,
        loan_purpose: loanData.loan_purpose,
        loan_amount: parseFloat(loanData.loan_amount),
        down_payment: parseFloat(loanData.down_payment),
        interest_rate: loanData.interest_rate ? parseFloat(loanData.interest_rate) : null,
        loan_term_months: loanData.loan_term_months,
        occupancy_type: loanData.occupancy_type,
        notes: loanData.notes,
        borrower_data: {
          first_name: borrowerData.first_name,
          last_name: borrowerData.last_name,
          email: borrowerData.email,
          phone: borrowerData.phone,
          date_of_birth: borrowerData.date_of_birth,
          ssn: borrowerData.ssn,
          street_address: borrowerData.street_address,
          city: borrowerData.city,
          state: borrowerData.state,
          zip_code: borrowerData.zip_code,
        },
        property_data: {
          address: propertyData.property_address,
          city: propertyData.property_city,
          state: propertyData.property_state,
          zip_code: propertyData.property_zip,
          property_type: propertyData.property_type,
          estimated_value: propertyData.estimated_value ? parseFloat(propertyData.estimated_value) : null,
        },
      });

      return application;
    },
    onSuccess: (data) => {
      toast.success('Application created successfully!');
      navigate(`/applications/${data.id}`);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.response?.data?.error || 'Failed to create application';
      toast.error(message);
    },
  });

  const handleNext = async () => {
    let isValid = true;

    if (currentStep === 0) {
      isValid = await loanForm.trigger();
    } else if (currentStep === 1) {
      isValid = await borrowerForm.trigger();
    } else if (currentStep === 2) {
      isValid = await propertyForm.trigger();
    }

    if (isValid) {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    createMutation.mutate();
  };

  const loanData = loanForm.watch();
  const borrowerData = borrowerForm.watch();
  const propertyData = propertyForm.watch();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/applications')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Loan Application</h1>
          <p className="text-gray-600 mt-1">Complete all steps to submit a new mortgage application</p>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="card">
        <nav className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1">
              <button
                onClick={() => index < currentStep && setCurrentStep(index)}
                className={clsx(
                  'flex items-center gap-3',
                  index <= currentStep ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                <div className={clsx(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
                  index < currentStep
                    ? 'bg-green-500 text-white'
                    : index === currentStep
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 text-gray-500'
                )}>
                  {index < currentStep ? (
                    <CheckCircleIcon className="h-6 w-6" />
                  ) : (
                    <step.icon className="h-5 w-5" />
                  )}
                </div>
                <div className="hidden sm:block">
                  <p className={clsx(
                    'text-sm font-medium',
                    index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                  )}>
                    {step.name}
                  </p>
                  <p className="text-xs text-gray-500">Step {index + 1}</p>
                </div>
              </button>
              {index < steps.length - 1 && (
                <div className={clsx(
                  'flex-1 h-0.5 mx-4',
                  index < currentStep ? 'bg-green-500' : 'bg-gray-200'
                )} />
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Step Content */}
      <div className="card">
        {/* Step 1: Loan Details */}
        {currentStep === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Loan Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">Loan Type *</label>
                <select {...loanForm.register('loan_type', { required: true })} className="input">
                  <option value="conventional">Conventional</option>
                  <option value="fha">FHA</option>
                  <option value="va">VA</option>
                  <option value="usda">USDA</option>
                  <option value="jumbo">Jumbo</option>
                </select>
              </div>
              <div>
                <label className="label">Loan Purpose *</label>
                <select {...loanForm.register('loan_purpose', { required: true })} className="input">
                  <option value="purchase">Purchase</option>
                  <option value="refinance">Refinance</option>
                  <option value="cash_out_refinance">Cash-Out Refinance</option>
                  <option value="construction">Construction</option>
                </select>
              </div>
              <div>
                <label className="label">Loan Amount ($) *</label>
                <input
                  {...loanForm.register('loan_amount', { required: 'Loan amount is required' })}
                  type="number"
                  min="0"
                  step="1000"
                  className="input"
                  placeholder="e.g. 350000"
                />
                {loanForm.formState.errors.loan_amount && (
                  <p className="text-red-500 text-xs mt-1">{loanForm.formState.errors.loan_amount.message}</p>
                )}
              </div>
              <div>
                <label className="label">Down Payment ($) *</label>
                <input
                  {...loanForm.register('down_payment', { required: 'Down payment is required' })}
                  type="number"
                  min="0"
                  step="1000"
                  className="input"
                  placeholder="e.g. 70000"
                />
                {loanForm.formState.errors.down_payment && (
                  <p className="text-red-500 text-xs mt-1">{loanForm.formState.errors.down_payment.message}</p>
                )}
              </div>
              <div>
                <label className="label">Interest Rate (%)</label>
                <input
                  {...loanForm.register('interest_rate')}
                  type="number"
                  min="0"
                  max="20"
                  step="0.125"
                  className="input"
                  placeholder="e.g. 6.5"
                />
              </div>
              <div>
                <label className="label">Loan Term *</label>
                <select {...loanForm.register('loan_term_months', { required: true, valueAsNumber: true })} className="input">
                  <option value={360}>30 Years</option>
                  <option value={240}>20 Years</option>
                  <option value={180}>15 Years</option>
                  <option value={120}>10 Years</option>
                </select>
              </div>
              <div>
                <label className="label">Occupancy Type *</label>
                <select {...loanForm.register('occupancy_type', { required: true })} className="input">
                  <option value="primary">Primary Residence</option>
                  <option value="secondary">Second Home</option>
                  <option value="investment">Investment Property</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="label">Notes</label>
                <textarea
                  {...loanForm.register('notes')}
                  rows={3}
                  className="input"
                  placeholder="Any additional notes about the loan..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Borrower Info */}
        {currentStep === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Primary Borrower Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="label">First Name *</label>
                <input
                  {...borrowerForm.register('first_name', { required: 'First name is required' })}
                  type="text"
                  className="input"
                  placeholder="John"
                />
                {borrowerForm.formState.errors.first_name && (
                  <p className="text-red-500 text-xs mt-1">{borrowerForm.formState.errors.first_name.message}</p>
                )}
              </div>
              <div>
                <label className="label">Last Name *</label>
                <input
                  {...borrowerForm.register('last_name', { required: 'Last name is required' })}
                  type="text"
                  className="input"
                  placeholder="Doe"
                />
                {borrowerForm.formState.errors.last_name && (
                  <p className="text-red-500 text-xs mt-1">{borrowerForm.formState.errors.last_name.message}</p>
                )}
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  {...borrowerForm.register('email', { required: 'Email is required' })}
                  type="email"
                  className="input"
                  placeholder="john.doe@email.com"
                />
                {borrowerForm.formState.errors.email && (
                  <p className="text-red-500 text-xs mt-1">{borrowerForm.formState.errors.email.message}</p>
                )}
              </div>
              <div>
                <label className="label">Phone *</label>
                <input
                  {...borrowerForm.register('phone', { required: 'Phone is required' })}
                  type="tel"
                  className="input"
                  placeholder="+1 (555) 000-0000"
                />
                {borrowerForm.formState.errors.phone && (
                  <p className="text-red-500 text-xs mt-1">{borrowerForm.formState.errors.phone.message}</p>
                )}
              </div>
              <div>
                <label className="label">Date of Birth *</label>
                <input
                  {...borrowerForm.register('date_of_birth', { required: 'Date of birth is required' })}
                  type="date"
                  className="input"
                />
                {borrowerForm.formState.errors.date_of_birth && (
                  <p className="text-red-500 text-xs mt-1">{borrowerForm.formState.errors.date_of_birth.message}</p>
                )}
              </div>
              <div>
                <label className="label">SSN (Last 4 digits) *</label>
                <input
                  {...borrowerForm.register('ssn', { required: 'SSN is required' })}
                  type="text"
                  maxLength={4}
                  className="input"
                  placeholder="1234"
                />
                {borrowerForm.formState.errors.ssn && (
                  <p className="text-red-500 text-xs mt-1">{borrowerForm.formState.errors.ssn.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <h3 className="text-md font-medium text-gray-800 mb-4 mt-2">Current Address</h3>
              </div>
              <div className="md:col-span-2">
                <label className="label">Street Address *</label>
                <input
                  {...borrowerForm.register('street_address', { required: 'Street address is required' })}
                  type="text"
                  className="input"
                  placeholder="123 Main Street"
                />
                {borrowerForm.formState.errors.street_address && (
                  <p className="text-red-500 text-xs mt-1">{borrowerForm.formState.errors.street_address.message}</p>
                )}
              </div>
              <div>
                <label className="label">City *</label>
                <input
                  {...borrowerForm.register('city', { required: 'City is required' })}
                  type="text"
                  className="input"
                  placeholder="New York"
                />
              </div>
              <div>
                <label className="label">State *</label>
                <input
                  {...borrowerForm.register('state', { required: 'State is required' })}
                  type="text"
                  className="input"
                  placeholder="NY"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="label">ZIP Code *</label>
                <input
                  {...borrowerForm.register('zip_code', { required: 'ZIP code is required' })}
                  type="text"
                  className="input"
                  placeholder="10001"
                  maxLength={10}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Property */}
        {currentStep === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Subject Property</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="label">Property Address *</label>
                <input
                  {...propertyForm.register('property_address', { required: 'Property address is required' })}
                  type="text"
                  className="input"
                  placeholder="456 Oak Avenue"
                />
                {propertyForm.formState.errors.property_address && (
                  <p className="text-red-500 text-xs mt-1">{propertyForm.formState.errors.property_address.message}</p>
                )}
              </div>
              <div>
                <label className="label">City *</label>
                <input
                  {...propertyForm.register('property_city', { required: 'City is required' })}
                  type="text"
                  className="input"
                  placeholder="New York"
                />
              </div>
              <div>
                <label className="label">State *</label>
                <input
                  {...propertyForm.register('property_state', { required: 'State is required' })}
                  type="text"
                  className="input"
                  placeholder="NY"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="label">ZIP Code *</label>
                <input
                  {...propertyForm.register('property_zip', { required: 'ZIP code is required' })}
                  type="text"
                  className="input"
                  placeholder="10001"
                  maxLength={10}
                />
              </div>
              <div>
                <label className="label">Property Type *</label>
                <select {...propertyForm.register('property_type', { required: true })} className="input">
                  <option value="single_family">Single Family</option>
                  <option value="condo">Condo</option>
                  <option value="townhouse">Townhouse</option>
                  <option value="multi_family">Multi-Family (2-4 units)</option>
                  <option value="manufactured">Manufactured Home</option>
                </select>
              </div>
              <div>
                <label className="label">Estimated Property Value ($)</label>
                <input
                  {...propertyForm.register('estimated_value')}
                  type="number"
                  min="0"
                  step="1000"
                  className="input"
                  placeholder="e.g. 420000"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Review */}
        {currentStep === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Review Application</h2>
            <div className="space-y-6">
              {/* Loan Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <BanknotesIcon className="h-5 w-5 text-primary-600" />
                  Loan Details
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium capitalize">{loanData.loan_type}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Purpose:</span>
                    <span className="ml-2 font-medium capitalize">{loanData.loan_purpose?.replace('_', ' ')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Amount:</span>
                    <span className="ml-2 font-medium">
                      ${loanData.loan_amount ? parseFloat(loanData.loan_amount).toLocaleString() : '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Down Payment:</span>
                    <span className="ml-2 font-medium">
                      ${loanData.down_payment ? parseFloat(loanData.down_payment).toLocaleString() : '0'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Rate:</span>
                    <span className="ml-2 font-medium">{loanData.interest_rate || 'TBD'}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Term:</span>
                    <span className="ml-2 font-medium">{loanData.loan_term_months / 12} Years</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Occupancy:</span>
                    <span className="ml-2 font-medium capitalize">{loanData.occupancy_type?.replace('_', ' ')}</span>
                  </div>
                  {loanData.loan_amount && loanData.down_payment && (
                    <div>
                      <span className="text-gray-500">LTV:</span>
                      <span className="ml-2 font-medium">
                        {((parseFloat(loanData.loan_amount) / (parseFloat(loanData.loan_amount) + parseFloat(loanData.down_payment))) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Borrower Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <UserIcon className="h-5 w-5 text-primary-600" />
                  Primary Borrower
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Name:</span>
                    <span className="ml-2 font-medium">{borrowerData.first_name} {borrowerData.last_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Email:</span>
                    <span className="ml-2 font-medium">{borrowerData.email}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <span className="ml-2 font-medium">{borrowerData.phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">DOB:</span>
                    <span className="ml-2 font-medium">{borrowerData.date_of_birth}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">SSN:</span>
                    <span className="ml-2 font-medium">***-**-{borrowerData.ssn}</span>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-gray-500">Address:</span>
                    <span className="ml-2 font-medium">
                      {borrowerData.street_address}, {borrowerData.city}, {borrowerData.state} {borrowerData.zip_code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Property Summary */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <HomeIcon className="h-5 w-5 text-primary-600" />
                  Subject Property
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div className="col-span-2 md:col-span-3">
                    <span className="text-gray-500">Address:</span>
                    <span className="ml-2 font-medium">
                      {propertyData.property_address}, {propertyData.property_city}, {propertyData.property_state} {propertyData.property_zip}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <span className="ml-2 font-medium capitalize">{propertyData.property_type?.replace('_', ' ')}</span>
                  </div>
                  {propertyData.estimated_value && (
                    <div>
                      <span className="text-gray-500">Est. Value:</span>
                      <span className="ml-2 font-medium">
                        ${parseFloat(propertyData.estimated_value).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {loanData.notes && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
                  <p className="text-sm text-gray-600">{loanData.notes}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className={clsx(
            'px-6 py-2 rounded-lg font-medium transition-colors',
            currentStep === 0
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          )}
        >
          Back
        </button>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/applications')}
            className="px-6 py-2 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              className="btn-primary px-8"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="btn-primary px-8"
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

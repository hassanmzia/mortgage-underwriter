// Application Types
export interface LoanApplication {
  id: string;
  case_id: string;
  status: ApplicationStatus;
  loan_type: LoanType;
  loan_purpose: LoanPurpose;
  loan_amount: number;
  down_payment: number;
  interest_rate?: number;
  loan_term_months: number;
  estimated_monthly_payment?: number;
  occupancy_type: OccupancyType;
  borrower_name?: string;
  property_address?: string;
  assigned_underwriter?: string;
  assigned_underwriter_name?: string;
  ai_recommendation?: string;
  ai_risk_score?: number;
  ai_confidence_score?: number;
  requires_human_review: boolean;
  human_review_completed: boolean;
  ltv_ratio?: number;
  created_at: string;
  submitted_at?: string;
  decision_at?: string;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'in_review'
  | 'processing'
  | 'underwriting'
  | 'approved'
  | 'conditional'
  | 'denied'
  | 'suspended'
  | 'withdrawn'
  | 'closed';

export type LoanType = 'conventional' | 'fha' | 'va' | 'usda' | 'jumbo';
export type LoanPurpose = 'purchase' | 'refinance' | 'cash_out_refinance' | 'construction';
export type OccupancyType = 'primary' | 'secondary' | 'investment';

// Borrower Types
export interface Borrower {
  id: string;
  borrower_type: 'primary' | 'co_borrower';
  first_name: string;
  last_name: string;
  masked_ssn: string;
  email: string;
  phone: string;
  credit_profile?: CreditProfile;
  employments?: Employment[];
  assets?: Asset[];
  liabilities?: Liability[];
}

export interface CreditProfile {
  credit_score: number;
  bankruptcies: number;
  foreclosures: number;
  late_payments_12mo: number;
  collections_count: number;
  collections_total_amount: number;
}

export interface Employment {
  id: string;
  employer_name: string;
  position_title: string;
  employment_type: string;
  years_employed: number;
  monthly_income: number;
  annual_income: number;
  is_current: boolean;
}

export interface Asset {
  id: string;
  asset_type: string;
  institution_name: string;
  current_balance: number;
  verified: boolean;
}

export interface Liability {
  id: string;
  liability_type: string;
  creditor_name: string;
  monthly_payment: number;
  current_balance: number;
}

// Property Types
export interface Property {
  id: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  property_type: string;
  year_built: number;
  square_feet: number;
  bedrooms: number;
  bathrooms: number;
  condition: string;
  purchase_price: number;
  appraised_value?: number;
}

// Underwriting Types
export interface UnderwritingWorkflow {
  id: string;
  application: string;
  application_case_id: string;
  status: WorkflowStatus;
  current_agent: string;
  progress_percent: number;
  started_at?: string;
  completed_at?: string;
  analyses: AgentAnalysis[];
  decision?: UnderwritingDecision;
  risk_factors: RiskFactor[];
  audit_trail: AuditEntry[];
}

export type WorkflowStatus =
  | 'pending'
  | 'initializing'
  | 'credit_analysis'
  | 'income_analysis'
  | 'asset_analysis'
  | 'collateral_analysis'
  | 'critic_review'
  | 'decision'
  | 'human_review'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface AgentAnalysis {
  id: string;
  agent_type: string;
  analysis_text: string;
  recommendation: string;
  risk_factors: any[];
  conditions: string[];
  confidence_score: number;
  processing_time_ms: number;
  created_at: string;
}

export interface UnderwritingDecision {
  id: string;
  ai_decision: DecisionType;
  ai_risk_score: number;
  ai_confidence: number;
  decision_memo: string;
  executive_summary: string;
  conditions: any[];
  human_override: boolean;
  human_decision?: DecisionType;
  human_reviewer_name?: string;
  human_notes?: string;
  final_decision: DecisionType;
}

export type DecisionType = 'approved' | 'denied' | 'conditional' | 'suspended' | 'refer';

export interface RiskFactor {
  id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation?: string;
}

export interface AuditEntry {
  id: string;
  event_type: string;
  agent_name: string;
  description: string;
  details: any;
  user_name?: string;
  timestamp: string;
}

// Compliance Types
export interface BiasFlag {
  id: string;
  application_case_id: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  source_text: string;
  resolved: boolean;
  resolved_by_name?: string;
  resolution_notes?: string;
  created_at: string;
}

// Agent Types
export interface AgentStatus {
  agent_type: string;
  name: string;
  is_active: boolean;
  health: string;
  last_execution?: string;
  avg_response_time_ms: number;
  capabilities: string[];
}

// User Types
export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  department: string;
  phone?: string;
  is_available: boolean;
}

export type UserRole =
  | 'admin'
  | 'senior_underwriter'
  | 'underwriter'
  | 'junior_underwriter'
  | 'reviewer'
  | 'processor'
  | 'viewer';

// Dashboard Types
export interface DashboardSummary {
  total_applications: number;
  pending_review: number;
  approved: number;
  denied: number;
  conditional: number;
  total_loan_volume: number;
  average_processing_time: number;
}

export interface WorkflowMetrics {
  total_workflows: number;
  completed: number;
  in_progress: number;
  failed: number;
  average_duration_seconds: number;
  approval_rate: number;
  human_override_rate: number;
}

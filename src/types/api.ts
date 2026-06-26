// ── Standard API response wrappers ───────────────────────────────────────────

export interface ApiSuccess<T = unknown> {
  success: true
  data: T
}

export interface ApiError {
  success: false
  error: string
  code?: string
}

export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError

// ── Auth ─────────────────────────────────────────────────────────────────────

export interface SendOtpRequest {
  mobile: string
  insurer_slug: string
}

export interface SendOtpResponse {
  message: string
  expires_in_seconds: number
  otp_ref_id: string
}

export interface VerifyOtpRequest {
  mobile: string
  otp: string
  otp_ref_id: string
  insurer_slug: string
  initial_sum_insured?: number
  initial_members?: number
  initial_plan_type?: string
}

export interface VerifyOtpResponse {
  application_id: string
  next_step: number
}

// ── Journey ──────────────────────────────────────────────────────────────────

export interface ProfileRequest {
  application_id: string
  pan: string
  name?: string
  dob: string
  gender: string
  email: string
  vehicle_reg_number?: string
}

export interface ProfileResponse {
  iadore_job_id: string
  next_step: number
}

export interface ProfileStatusResponse {
  status: 'pending' | 'running' | 'done' | 'failed'
  summary?: {
    name: string
    dob: string
    gender: string
    address: {
      line1: string
      city: string
      state: string
      pincode: string
    }
    employer_name?: string
    occupation_type: string
    pan_category: string
    company_is_hazardous: boolean
    gst_registered: boolean
    litigation_count: number
    bureau_score: number | null
    income_from_bureau: number | null
    income_from_bank_statement: number | null
  }
}

export interface IncomeRequest {
  application_id: string
  customer_declared_income: number
  vehicle_reg_number?: string
}

export interface SelectQuoteRequest {
  application_id: string
  quote_id: string
  selected_riders: string[]
}

export interface SelectQuoteResponse {
  final_premium: number
  next_step: number
}

export interface ProposalRequest {
  application_id: string
  proposal_data: {
    name: string
    dob: string
    gender: string
    pan: string
    mobile: string
    email: string
    address: {
      line1: string
      line2?: string
      city: string
      state: string
      pincode: string
    }
    marital_status: string
    occupation: string
    occupation_type: string
    annual_income: number
    nominee_name: string
    nominee_relation: string
    nominee_dob: string
    nominee_share: number
    members?: Array<{ name: string; dob: string; gender: string; relation: string }>
    declaration_accepted: boolean
    consent_data_sharing: boolean
    consent_health_declaration: boolean
  }
}

export interface VerifyIdRequest {
  application_id: string
  id_type: 'pan' | 'voter_id' | 'passport'
  id_value: string
  name?: string
  dob?: string
}

export interface STPResponse {
  decision: 'approved' | 'referred'
  stp_score: number
  message: string
  next_step: number
}

// ── Payment ──────────────────────────────────────────────────────────────────

export interface CreateOrderRequest {
  application_id: string
}

export interface CreateOrderResponse {
  order_id: string
  amount: number
  currency: string
  razorpay_key: string
}

export interface VerifyPaymentRequest {
  application_id: string
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

// ── Underwriter ──────────────────────────────────────────────────────────────

export interface UWApproveRequest {
  customer_message?: string
  internal_notes?: string
}

export interface UWLoadingRequest {
  loading_type: 'percentage' | 'flat'
  loading_percent?: number
  loading_amount?: number
  customer_message?: string
  internal_notes?: string
}

export interface UWExclusionRequest {
  exclusions: Array<{
    condition: string
    type: 'permanent' | 'temporary'
    duration_months?: number
    description?: string
  }>
  customer_message?: string
  internal_notes?: string
}

export interface UWRejectRequest {
  rejection_reason_code: string
  rejection_reason_text?: string
  customer_message?: string
  internal_notes: string
}

export interface UWRequestDocsRequest {
  requested_documents: Array<{
    document_type: string
    description: string
    is_mandatory: boolean
  }>
  customer_message?: string
  internal_notes?: string
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface CreateInsurerRequest {
  slug: string
  name: string
  config: Record<string, unknown>
}

export interface CreateUserRequest {
  name: string
  email: string
  role: 'underwriter' | 'insurer_admin'
  insurer_id: string
  temp_password: string
}

// ── Quote Calculator ──────────────────────────────────────────────────────────

export interface QuoteCalculateParams {
  age: number
  gender: 'male' | 'female' | 'other'
  city_tier: 1 | 2 | 3
  sum_insured: number
  members: number
  plan_type: 'individual' | 'family_floater'
  insurer_slug?: string
}

export interface QuoteCalculateResponse {
  indicative_annual_premium: number
  gst: number
  total: number
  plan_options: Array<{
    type: 'basic' | 'standard' | 'premium'
    premium: number
    total: number
  }>
}

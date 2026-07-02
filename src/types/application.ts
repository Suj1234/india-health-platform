// ── Cover Type ───────────────────────────────────────────────────────────────
export type CoverType = 'individual' | 'family_floater' | 'parents'

// ── Member Relation ───────────────────────────────────────────────────────────
export type MemberRelation = 'self' | 'spouse' | 'son' | 'daughter' | 'father' | 'mother'

// ── Application Status ───────────────────────────────────────────────────────
export type ApplicationStatus =
  | 'initiated'
  | 'otp_verified'
  | 'profiling_started'
  | 'profiling_done'
  | 'members_added'       // cover type + insured members saved (end of Step 2)
  | 'medical_done'        // per-member health declaration + NuralX complete (Step 3)
  | 'quote_selected'      // single plan + riders confirmed (Step 4)
  | 'proposal_submitted'  // proposal + nominee saved (Step 5)
  | 'docs_uploaded'       // KYC documents uploaded (Step 6)
  | 'stp_evaluated'
  | 'payment_pending'
  | 'payment_done'
  | 'policy_issued'
  | 'uw_pending'
  | 'uw_approved'
  | 'uw_rejected'
  | 'uw_more_docs'
  | 'docs_requested'
  | 'expired'
  | 'cancelled'

// ── UW Decision ──────────────────────────────────────────────────────────────
export type UWDecision =
  | 'approved'
  | 'approved_with_loading'
  | 'approved_with_exclusion'
  | 'rejected'
  | 'more_docs_requested'
  | 'medical_test_requested'

// ── STP Decision ─────────────────────────────────────────────────────────────
export type STPDecision = 'approved' | 'referred'

// ── Income Profile ───────────────────────────────────────────────────────────
export interface IncomeSource {
  customer_declared?: number
  bank_statement?: number
  bureau?: number
  vehicle_surrogate?: number
}

export interface IncomeCrossAnalysis {
  source: string
  amount: number
  consistency: 'consistent' | 'within_20' | 'divergent' | 'not_available'
  flag?: string
}

export interface IncomeProfile {
  sources: IncomeSource
  selected_source: keyof IncomeSource
  selected_annual_income: number
  cross_analysis: IncomeCrossAnalysis[]
}

// ── iAdore Summary ───────────────────────────────────────────────────────────
export interface IAdoreSummary {
  name: string
  dob: string
  gender: string
  address: {
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
  }
  employer_name?: string
  occupation_type: 'salaried' | 'self_employed' | 'business' | 'other'
  pan_category: string
  company_is_hazardous: boolean
  gst_registered: boolean
  litigation_count: number
  bureau_score: number | null
  income_from_bureau: number | null
  income_from_bank_statement: number | null
  surrogate_income: number | null
}

// ── Insured Member ────────────────────────────────────────────────────────────
export interface InsuredMember {
  member_id: string        // uuid generated client-side, stable across journey
  relation: MemberRelation
  name: string
  dob: string              // YYYY-MM-DD
  gender: 'male' | 'female' | 'other'
}

// ── Proposal Data ────────────────────────────────────────────────────────────
export interface ProposalProposer {
  name: string
  pan: string
  dob: string
  mobile: string
  email: string
  gender: 'male' | 'female' | 'other'
  address: {
    line1: string
    line2?: string
    city: string
    state: string
    pincode: string
  }
  marital_status: 'single' | 'married' | 'divorced' | 'widowed'
  occupation: string
  occupation_type: string
  annual_income: number
  is_insured: boolean      // false only for parents plan
}

export interface ProposalData {
  proposer: ProposalProposer
  insured_members: InsuredMember[]   // empty [] for individual (proposer is sole insured)
  nominee_name: string
  nominee_relation: string
  nominee_dob: string
  nominee_share: number
  declaration_accepted: true
  consent_data_sharing: true
  consent_health_declaration: true
}

// ── Quote ─────────────────────────────────────────────────────────────────────
export interface QuoteBenefit {
  name: string
  description: string
  limit: string
}

export interface QuoteExclusion {
  name: string
  description: string
}

export interface QuoteWaitingPeriod {
  condition: string
  days: number
}

export interface QuoteRider {
  code: string
  name: string
  annual_premium: number
  gst: number
  total: number
  selected: boolean
}

export interface QuoteOption {
  id: string
  plan_type: string        // single plan per insurer — value is insurer-configured plan code
  plan_name: string
  plan_code: string
  sum_insured: number
  annual_premium: number
  gst_amount: number
  total_premium: number
  benefits: QuoteBenefit[]
  exclusions: QuoteExclusion[]
  waiting_periods: QuoteWaitingPeriod[]
  riders: QuoteRider[]
  network_hospitals_count: number
}

// ── Needs Summary ─────────────────────────────────────────────────────────────
export interface NeedsTier {
  cover: number
  premium: number
  label: string
}

export interface NeedsSummary {
  health_insurance: {
    recommended_cover: number
    premium_estimate: number
    tiers: NeedsTier[]
  }
  term_cover: { cover: number; years: number; premium: number }
  critical_illness: { cover: number; years: number; premium: number }
  disability_income: { monthly_benefit: number; years: number; premium: number }
}

// ── UW Exclusion ─────────────────────────────────────────────────────────────
export interface UWExclusion {
  condition: string
  type: 'permanent' | 'temporary'
  duration_months?: number
  notes?: string
  description?: string
}

// ── STP Result ───────────────────────────────────────────────────────────────
export interface STPResult {
  decision: 'APPROVED' | 'REFERRED'
  stp_score: number
  message: string
  documents_required: string[]
  pivc_required: boolean
  biometric_required: boolean
  additional_info?: Record<string, unknown>
}

// ── Biometric Vitals ─────────────────────────────────────────────────────────
export interface NuralXVitals {
  heart_rate: number
  respiratory_rate: number
  blood_pressure_systolic: number
  blood_pressure_diastolic: number
  oxygen_saturation: number
  stress_index: number
  risk_score: number
}

// ── Customer Session JWT payload ──────────────────────────────────────────────
export interface CustomerSession {
  sub: string          // user.id
  application_id: string
  insurer_id: string
  role: 'customer'
  iat: number
  exp: number
}

// ── UW/Admin Session JWT payload ─────────────────────────────────────────────
export interface StaffSession {
  sub: string
  email: string
  name: string
  role: 'underwriter' | 'insurer_admin' | 'superadmin'
  insurer_id: string | null
  impersonated_by?: string          // superadmin user ID when impersonating
  impersonation_session_id?: string // impersonation_sessions.id
  iat: number
  exp: number
}

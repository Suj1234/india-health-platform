export interface InsurerConfig {
  // Branding
  primary_color: string
  secondary_color: string
  logo_url?: string
  favicon_url?: string

  // Contact
  contact_email: string
  contact_phone: string
  website: string
  grievance_email: string
  grievance_phone: string

  // IRDAI / Legal
  irdai_registration: string
  cin: string
  gstin: string
  registered_office_address: string

  // Product thresholds
  financial_docs_threshold_sum_insured: number
  biometric_threshold_sum_insured: number
  stp_auto_biometric_age: number
  payment_expiry_hours_stp: number
  payment_expiry_days_uw: number

  // Feature flags
  skip_needs_analysis: boolean
  skip_pivc: boolean
  skip_nuralx: boolean
  require_voter_or_passport: boolean

  // Policy settings
  policy_number_prefix: string
  policy_duration_months: number
  free_look_days: number

  // Product options
  sum_insured_options: number[]

  // Standard exclusions
  standard_exclusions: Array<{
    name: string
    description: string
    waiting_period_days: number
  }>

  // Email
  email_sender_name: string
  email_reply_to: string

  // Riders
  available_riders: Array<{
    code: string
    name: string
    description: string
    is_active: boolean
  }>
}

export interface IAdoreCredentials {
  base_url: string
  org_key: string
  hmac_key: string
  income_api_url?: string
}

export interface KarzaCredentials {
  base_url: string
  api_key: string
}

export interface PMWCredentials {
  base_url: string
  api_key: string
}

export interface QuoteApiCredentials {
  base_url: string
  api_key: string
  insurer_code?: string
}

export interface NuralXCredentials {
  base_url: string
  email: string
  password: string
  callback_url: string
}

export interface PIVCCredentials {
  base_url: string
  api_key: string
}

export interface STPCredentials {
  base_url: string
  api_key: string
  insurer_code?: string
}

export type ApiCredentials =
  | IAdoreCredentials
  | KarzaCredentials
  | PMWCredentials
  | QuoteApiCredentials
  | NuralXCredentials
  | PIVCCredentials
  | STPCredentials

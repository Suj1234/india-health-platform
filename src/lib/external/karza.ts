import type { KarzaCredentials } from '@/types/insurer'
import { allowInsecureTlsIfEnabled } from '../server-network'

allowInsecureTlsIfEnabled()

function karzaHeaders(creds: KarzaCredentials): HeadersInit {
  return {
    'x-karza-key': creds.api_key,
    'Content-Type': 'application/json',
  }
}

async function karzaFetch<T>(creds: KarzaCredentials, path: string, body: object, timeoutMs = 30000): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const res = await fetch(`${creds.base_url}${path}`, {
      method: 'POST',
      headers: karzaHeaders(creds),
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`Karza API ${path} failed: ${res.status} ${await res.text()}`)
    return res.json() as Promise<T>
  } finally {
    clearTimeout(timeout)
  }
}

export async function verifyPan(
  creds: KarzaCredentials,
  params: { pan: string; name: string; dob: string }
): Promise<{ statusCode: number; result: { name: string; status: string; nameMatchScore: number } }> {
  return karzaFetch(creds, '/v2/pan-verification', {
    pan: params.pan,
    name: params.name,
    dob: params.dob,
  })
}

export async function verifyVoterId(
  creds: KarzaCredentials,
  params: { voter_id: string; name: string }
): Promise<{ statusCode: number; result: { name: string; status: string; nameMatchScore: number } }> {
  return karzaFetch(creds, '/v2/voter-verification', {
    epicNo: params.voter_id,
    name: params.name,
  })
}

export async function verifyPassport(
  creds: KarzaCredentials,
  params: { passport_number: string; dob: string; name: string }
): Promise<{ statusCode: number; result: { name: string; status: string; nameMatchScore: number; dobMatch: boolean } }> {
  return karzaFetch(creds, '/v2/passport-verification', {
    fileNo: params.passport_number,
    dob: params.dob,
    name: params.name,
  })
}

export async function submitOcrDocument(
  creds: KarzaCredentials,
  params: { document_type: string; document_url: string; application_id: string }
): Promise<{ jobId: string; status: string }> {
  return karzaFetch(creds, '/v3/ocr/submit', {
    docType: params.document_type,
    docUrl: params.document_url,
    clientRef: params.application_id,
  })
}

// ── Karza Mobile OTP types ───────────────────────────────────────────────────

export interface KarzaMobileOtpResponse {
  'status-code': string
  request_id: string
  result: object
  message?: string
  clientData?: { caseId?: string }
}

export interface KarzaMobileStatusResponse {
  'status-code': string
  request_id: string
  result: object
  sim_details?: {
    otp_validated: boolean
    provider?: string
  }
  clientData?: { caseId?: string }
}

export interface KarzaMobileDetailsResult {
  contact?: {
    address?: string | null
    alt_contact?: string | null
    email_id?: string | null
    work_email?: string | null
  }
  device?: {
    '3g_support'?: string
    device_activation_date?: string | null
    imei?: string | null
    model?: string
  }
  history?: Array<{ amount?: string; payment_date?: string; payment_type?: string }>
  identity?: { date_of_birth?: string | null; gender?: string | null; name?: string | null }
  profile?: Record<string, unknown>
  sim_details?: {
    activation_date?: string | null
    last_activity_date?: string | null
    otp_validated?: boolean
    provider?: string
    type?: string
  }
}

export interface KarzaMobileDetailsResponse {
  'status-code': string
  request_id: string
  result: KarzaMobileDetailsResult
  clientData?: { caseId?: string }
}

// ── Karza Mobile OTP functions ───────────────────────────────────────────────

export async function sendMobileOtp(
  creds: KarzaCredentials,
  params: { mobile: string; caseId?: string }
): Promise<KarzaMobileOtpResponse> {
  return karzaFetch(creds, '/v2/mobile/otp', {
    consent: 'Y',
    mobile: params.mobile,
    ...(params.caseId ? { clientData: { caseId: params.caseId } } : {}),
  })
}

export async function verifyMobileOtpStatus(
  creds: KarzaCredentials,
  params: { request_id: string; otp: string; caseId?: string }
): Promise<KarzaMobileStatusResponse> {
  return karzaFetch(creds, '/v2/mobile/status', {
    request_id: params.request_id,
    otp: params.otp,
    ...(params.caseId ? { clientData: { caseId: params.caseId } } : {}),
  })
}

export async function getMobileDetails(
  creds: KarzaCredentials,
  params: { request_id: string; caseId?: string }
): Promise<KarzaMobileDetailsResponse> {
  return karzaFetch(creds, '/v2/mobile/details', {
    request_id: params.request_id,
    ...(params.caseId ? { clientData: { caseId: params.caseId } } : {}),
  })
}

export async function pollOcrJob(
  creds: KarzaCredentials,
  jobId: string
): Promise<{ status: string; result?: Record<string, string>; confidence?: number }> {
  const res = await fetch(`${creds.base_url}/v3/ocr/status/${jobId}`, {
    headers: karzaHeaders(creds),
  })
  if (!res.ok) throw new Error(`Karza OCR poll failed: ${res.status}`)
  return res.json() as Promise<{ status: string; result?: Record<string, string>; confidence?: number }>
}

// ── Mobile Form Prefill ───────────────────────────────────────────────────────

export interface KarzaMobilePrefillAddress {
  line_1: string
  line_2: string
  street_name: string
  zip: string
  city: string
  state: string
  country: string
  full: string
}

export interface KarzaMobilePrefillResult {
  mobileNumber: string
  pan: string
  panDetails: {
    fullName: string
    splitName: string[]
    address: KarzaMobilePrefillAddress
    gender: string
    dob: string
    aadhaarLink: boolean
  }
}

export interface KarzaMobilePrefillResponse {
  requestId: string
  result: KarzaMobilePrefillResult
  statusCode: number
  clientData?: { caseId: string }
}

export async function mobilePrefill(
  creds: KarzaCredentials,
  params: { mobile: string; caseId?: string }
): Promise<KarzaMobilePrefillResponse> {
  return karzaFetch(creds, '/v3/mobile-form-prefill', {
    mobile: params.mobile,
    consent: 'Y',
    ...(params.caseId ? { clientData: { caseId: params.caseId } } : {}),
  })
}

// ── PAN Profile ───────────────────────────────────────────────────────────────

export interface KarzaPanProfileAddress {
  buildingName: string
  locality: string
  streetName: string
  pinCode: string
  city: string
  state: string
  country: string
}

export interface KarzaPanProfileResult {
  pan: string
  name: string
  firstName: string
  middleName: string
  lastName: string
  gender: string
  aadhaarLinked: boolean
  aadhaarMatch: boolean | null
  dob: string
  address: KarzaPanProfileAddress
  mobileNo: string | null
  emailId: string | null
  status: string
  issueDate: string
  isSalaried: boolean | null
  isDirector: boolean | null
  isSoleProp: boolean | null
}

export interface KarzaPanProfileResponse {
  requestId: string
  result: KarzaPanProfileResult
  statusCode: number
  clientData?: { caseId: string }
}

export async function panProfile(
  creds: KarzaCredentials,
  params: { pan: string; name?: string; dob?: string; caseId?: string }
): Promise<KarzaPanProfileResponse> {
  return karzaFetch(creds, '/v3/pan-profile', {
    pan: params.pan,
    ...(params.name ? { name: params.name } : {}),
    ...(params.dob ? { dob: params.dob } : {}),
    getContactDetails: 'Y',
    PANStatus: 'Y',
    isSalaried: 'Y',
    isDirector: 'Y',
    isSoleProp: 'Y',
    consent: 'Y',
    ...(params.caseId ? { clientData: { caseId: params.caseId } } : {}),
  })
}

// ── Employment Verification Advanced ─────────────────────────────────────────

export interface KarzaEmploymentNameLookup {
  organizationName: string
  isNameExact: boolean
  isEmployed: boolean
  isRecent: boolean
  employeeName: string
}

export interface KarzaEmploymentPersonalInfo {
  name: string
  dateOfBirth: string
  gender: string
  fatherHusbandName: string
  relation: string   // 'FATHER' | 'HUSBAND' — determines whether fatherHusbandName is the father's name
  mobileNumber: string
  pan: string
}

export interface KarzaEmploymentResult {
  nameLookup?: KarzaEmploymentNameLookup
  personalInfo?: KarzaEmploymentPersonalInfo
  summary?: {
    nameLookup: { matchName: string; isUnique: boolean; isLatest: boolean; result: boolean }
    waiveFi: boolean
  }
  failures?: unknown[]
}

export interface KarzaEmploymentResponse {
  result: KarzaEmploymentResult
  request_id: string
  'status-code': string
  clientData?: { caseId: string }
}

export async function employmentVerification(
  creds: KarzaCredentials,
  params: { pan: string; employeeName?: string; mobile?: string; caseId?: string }
): Promise<KarzaEmploymentResponse> {
  return karzaFetch(creds, '/v2/employment-verification-advanced', {
    pan: params.pan,
    runPanFlow: true,
    isLatestEmployer: true,
    showFailures: false,
    ...(params.employeeName ? { employeeName: params.employeeName } : {}),
    ...(params.mobile ? { mobile: params.mobile } : {}),
    consent: 'Y',
    ...(params.caseId ? { clientData: { caseId: params.caseId } } : {}),
  }, 70000)
}

// ── Email Verification ────────────────────────────────────────────────────────

export interface KarzaEmailVerificationData {
  disposable: boolean
  webmail: boolean
  result: string
  accept_all: boolean
  smtp_check: boolean
  regexp: boolean
  mx_records: boolean
  email: string
}

export interface KarzaEmailVerificationResultSummary {
  email_valid: boolean
  org_domain_match: boolean
  indv_flag: boolean
  overall_result: string
}

export interface KarzaEmailVerificationResult {
  data: KarzaEmailVerificationData
  result_summary: KarzaEmailVerificationResultSummary
}

export interface KarzaEmailVerificationResponse {
  result: KarzaEmailVerificationResult
  request_id: string
  'status-code': string
  clientData?: { caseId: string }
}

export async function emailVerification(
  creds: KarzaCredentials,
  params: { email: string; individualName?: string; organizationName?: string; caseId?: string }
): Promise<KarzaEmailVerificationResponse> {
  return karzaFetch(creds, '/v2/email-verification', {
    email: params.email,
    version: '3',
    consent: 'y',
    ...(params.individualName ? { individualName: params.individualName } : {}),
    ...(params.organizationName ? { organizationName: params.organizationName } : {}),
    ...(params.caseId ? { clientData: { caseId: params.caseId } } : {}),
  })
}

// ── OCR Plus KYC ─────────────────────────────────────────────────────────────

export interface KarzaOcrPlusDocument {
  documentType: string  // 'PAN' | 'AADHAAR_FRONT' | 'AADHAAR_BACK' | 'AADHAAR_E' | 'AADHAAR_FRONT_TOP' | 'AADHAAR_FRONT_BOTTOM'
  subType: string
  pageNo: number
  ocrData: {
    name?:    { value: string; confidence: number }
    dob?:     { value: string; confidence: number }
    pan?:     { value: string; confidence: number }
    father?:  { value: string; confidence: number }
    uid?:     { value: string; confidence: number }
    gender?:  { value: string; confidence: number }
    address?: { value: string; confidence: number }
    pincode?: { value: string; confidence: number }
    state?:   { value: string; confidence: number }
    district?: { value: string; confidence: number }
  }
  qualityChecks?: Array<{ score: number; flag: boolean; type: string }>
  tamperCheck?: { score: number; tamperRisk: string; status: string }
}

export interface KarzaOcrPlusResponse {
  requestId: string
  statusCode: number
  result: { documents: KarzaOcrPlusDocument[] }
  clientData?: { caseId?: string }
}

export async function ocrPlusKyc(
  creds: KarzaCredentials,
  params: { fileBuffer: Buffer; mimeType: string; applicationId: string }
): Promise<KarzaOcrPlusResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60000)

  try {
    const formData = new FormData()
    formData.append('file', new Blob([new Uint8Array(params.fileBuffer)], { type: params.mimeType }), 'document')
    formData.append('requiredOcr', 'true')
    formData.append('returnQualityChecks', 'true')
    formData.append('maskAadhaarText', 'EIGHT_DIGITS')
    formData.append('parseQRdata', 'true')
    formData.append('tamperDetection', 'true')
    formData.append('caseId', params.applicationId)

    const res = await fetch(`${creds.base_url}/v3/ocr-plus/kyc`, {
      method: 'POST',
      headers: { 'x-karza-key': creds.api_key },
      body: formData,
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`Karza OCR Plus failed: ${res.status} ${await res.text()}`)
    return res.json() as Promise<KarzaOcrPlusResponse>
  } finally {
    clearTimeout(timeout)
  }
}

// ── Email Fraud Check ─────────────────────────────────────────────────────────

export interface KarzaEmailFraudValidationDetails {
  statusId: string
  status: string
  domainExists: string
  emailExists?: string
  domainAge?: string
}

export interface KarzaEmailFraudRiskDetails {
  score: string
  fraudRisk: string
  adviceId: string
  advice: string
  riskBandId: string
  riskBand: string
  domainRiskLevelId: string
  domainRiskLevel: string
}

export interface KarzaEmailFraudResult {
  emailAndDomainValidationDetails: KarzaEmailFraudValidationDetails
  emailAndDomainRiskDetails: KarzaEmailFraudRiskDetails
}

export interface KarzaEmailFraudResponse {
  requestId: string
  result: KarzaEmailFraudResult[]
  statusCode: number
  clientData?: { caseId: string }
}

export async function emailFraud(
  creds: KarzaCredentials,
  params: { email: string; firstName?: string; lastName?: string; ipAddress?: string; caseId?: string }
): Promise<KarzaEmailFraudResponse> {
  return karzaFetch(creds, '/v3/email-fraud', {
    email: params.email,
    consent: 'Y',
    ...(params.ipAddress ? { ipAddress: params.ipAddress } : {}),
    ...(params.firstName ? { firstName: params.firstName } : {}),
    ...(params.lastName ? { lastName: params.lastName } : {}),
    ...(params.caseId ? { clientData: { caseId: params.caseId } } : {}),
  })
}

import type { KarzaCredentials } from '@/types/insurer'
import { allowInsecureTlsIfEnabled } from '../server-network'

allowInsecureTlsIfEnabled()

function karzaHeaders(creds: KarzaCredentials): HeadersInit {
  return {
    'x-karza-key': creds.api_key,
    'Content-Type': 'application/json',
  }
}

async function karzaFetch<T>(creds: KarzaCredentials, path: string, body: object): Promise<T> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

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

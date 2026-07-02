import type { PerfiosCredentials } from '@/types/insurer'
import { allowInsecureTlsIfEnabled } from '../server-network'

allowInsecureTlsIfEnabled()

function perfiosHeaders(creds: PerfiosCredentials): HeadersInit {
  return {
    'x-api-key': creds.api_key,
    'Content-Type': 'application/json',
  }
}

// ── Response types ────────────────────────────────────────────────────────────

export interface PerfiosDigilockerLinkResponse {
  requestId: string
  result: { link: string }
  statusCode: number
  clientData?: { caseId?: string }
}

export interface PerfiosDigilockerDocument {
  name: string
  date: string
  uri: string
  doctype: string      // 'ADHAR' | 'PANCR' | etc.
  description: string
  issuerId: string
  issuer: string
  mimes: string[]
  isParseable: boolean
}

export interface PerfiosDigilockerDocumentsResponse {
  requestId: string
  result: PerfiosDigilockerDocument[]
  statusCode: number
  clientData?: { caseId?: string }
}

export interface PerfiosDigilockerParsedIssuedTo {
  uid?: string
  name: string
  dob: string
  gender: string
  address?: {
    co?: string
    house?: string
    locality?: string
    vtc?: string
    district?: string
    state?: string
    pin?: string
    country?: string
    line1?: string
    line2?: string
  }
  photo?: { content: string; format: string }
}

export interface PerfiosDigilockerDownloadResult {
  documentUri: string
  parsedFile: {
    status: string
    xmlSignatureVerified?: boolean
    data: {
      type?: string
      number?: string
      status?: string
      issuedTo: PerfiosDigilockerParsedIssuedTo
      additionalData?: Record<string, unknown>
    }
  }
}

export interface PerfiosDigilockerDownloadResponse {
  requestId: string
  result: PerfiosDigilockerDownloadResult[]
  statusCode: number
  clientData?: { caseId?: string }
}

// ── API functions ─────────────────────────────────────────────────────────────

export async function generateDigilockerLink(
  creds: PerfiosCredentials,
  params: { redirectUrl: string; docType: 'ADHAR' | 'PANCR'; caseId: string }
): Promise<{ link: string; requestId: string }> {
  const res = await fetch(`${creds.base_url}/kyc/api/v1/digilocker/link`, {
    method: 'POST',
    headers: perfiosHeaders(creds),
    body: JSON.stringify({
      redirectUrl: params.redirectUrl,
      oAuthState: params.caseId,
      aadhaarFlowRequired: params.docType === 'ADHAR',
      pinlessAuth: true,
      customDocList: params.docType,
      consent: 'Y',
      clientData: { caseId: params.caseId },
    }),
  })

  if (!res.ok) throw new Error(`Perfios DigiLocker link failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as PerfiosDigilockerLinkResponse
  return { link: data.result.link, requestId: data.requestId }
}

export async function listDigilockerDocuments(
  creds: PerfiosCredentials,
  params: { requestId: string; caseId: string }
): Promise<PerfiosDigilockerDocument[]> {
  const res = await fetch(`${creds.base_url}/kyc/api/v1/digilocker/documents`, {
    method: 'POST',
    headers: perfiosHeaders(creds),
    body: JSON.stringify({
      accessRequestId: params.requestId,
      consent: 'Y',
      clientData: { caseId: params.caseId },
    }),
  })

  if (!res.ok) throw new Error(`Perfios DigiLocker documents failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as PerfiosDigilockerDocumentsResponse
  return data.result
}

export async function downloadDigilockerDocument(
  creds: PerfiosCredentials,
  params: { requestId: string; uri: string; caseId: string }
): Promise<PerfiosDigilockerDownloadResult> {
  const res = await fetch(`${creds.base_url}/kyc/api/v1/digilocker/download`, {
    method: 'POST',
    headers: perfiosHeaders(creds),
    body: JSON.stringify({
      accessRequestId: params.requestId,
      consent: 'Y',
      files: [{ uri: params.uri, pdfB64: false, parsed: true, xml: false }],
      clientData: { caseId: params.caseId },
    }),
  })

  if (!res.ok) throw new Error(`Perfios DigiLocker download failed: ${res.status} ${await res.text()}`)
  const data = await res.json() as PerfiosDigilockerDownloadResponse
  const docResult = data.result[0]
  if (!docResult) throw new Error('No document in DigiLocker download response')
  return docResult
}

import { createHmac } from 'crypto'
import { XMLParser } from 'fast-xml-parser'
import { Client as MinioClient } from 'minio'
import type { IAdoreCredentials } from '@/types/insurer'
import { allowInsecureTlsIfEnabled } from '../server-network'

allowInsecureTlsIfEnabled()

// ─── Consolidated Process types ───────────────────────────────────────────────

export interface IAdorePrefillData {
  pan: string
  name: string
  dob: string
  gender: 'male' | 'female' | 'other'
  address_line: string
  city: string
  state: string
  pincode: string
  occupation_type: 'salaried' | 'self_employed'
  employer_name: string | null
  hazardous_occupation: null
  father_name: null
}

// ─── Consolidated Process — auth ──────────────────────────────────────────────

function buildCPSignature(): string {
  const key = process.env.IADORE_CP_ORGANISATION_KEY ?? ''
  const passphrase = process.env.IADORE_CP_PASSPHRASE ?? ''
  const message = `PERFIOS-HMACSHA256 ${passphrase}`
  return createHmac('sha256', key).update(message).digest('base64')
}

function buildCPHeaders(): HeadersInit {
  return {
    accept: 'application/json',
    signature: buildCPSignature(),
    'x-secure-id': process.env.IADORE_CP_SECURE_ID ?? '',
    'x-secure-cred': process.env.IADORE_CP_SECURE_CRED ?? '',
    'x-organization-id': process.env.IADORE_CP_ORG_ID ?? '',
  }
}

function cpBaseUrl(): string {
  return process.env.IADORE_CP_BASE_URL ?? ''
}

function cpOrgId(): string {
  return process.env.IADORE_CP_ORG_ID ?? ''
}

// ─── Consolidated Process — API calls ─────────────────────────────────────────

export async function startConsolidatedProcess(params: {
  mobile: string
  pan?: string
  clientTxId?: string
}): Promise<{ txId: string }> {
  const form = new FormData()
  form.append('processType', 'DEMOGRAPHIC')
  form.append('clientTransactionId', params.clientTxId ?? `ihp-${Date.now()}`)
  form.append('mobileNumber', params.mobile)
  if (params.pan) form.append('panNumber', params.pan)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(
      `${cpBaseUrl()}/api/v1/iadore/${cpOrgId()}/consolidatedProcess`,
      { method: 'POST', headers: buildCPHeaders(), body: form, signal: controller.signal }
    )
    if (!res.ok) throw new Error(`iAdore CP start failed: ${res.status} ${await res.text()}`)
    const data = await res.json() as { perfiosTransactionId: string }
    return { txId: data.perfiosTransactionId }
  } finally {
    clearTimeout(timeout)
  }
}

export async function pollConsolidatedProcessStatus(txId: string): Promise<{ status: string }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15000)

  try {
    const res = await fetch(
      `${cpBaseUrl()}/api/v1/iadore/${cpOrgId()}/${txId}/status`,
      { headers: buildCPHeaders(), signal: controller.signal }
    )
    if (!res.ok) throw new Error(`iAdore CP status failed: ${res.status}`)
    return res.json() as Promise<{ status: string }>
  } finally {
    clearTimeout(timeout)
  }
}

// ─── MinIO XML download + parse ───────────────────────────────────────────────

function getMinioClient(): MinioClient {
  return new MinioClient({
    endPoint: process.env.IADORE_MINIO_ENDPOINT ?? '',
    port: parseInt(process.env.IADORE_MINIO_PORT ?? '9000', 10),
    useSSL: true,
    accessKey: process.env.IADORE_MINIO_ACCESS_KEY ?? '',
    secretKey: process.env.IADORE_MINIO_SECRET_KEY ?? '',
  })
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    stream.on('data', (chunk: Buffer) => chunks.push(chunk))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')))
    stream.on('error', reject)
  })
}

function safeText(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'object' && '#text' in (val as object))
    return String((val as Record<string, unknown>)['#text'] ?? '')
  return String(val)
}

function mapGender(raw: unknown): 'male' | 'female' | 'other' {
  const v = safeText(raw).toLowerCase()
  if (v === 'm' || v === 'male') return 'male'
  if (v === 'f' || v === 'female') return 'female'
  return 'other'
}

function mapOccupation(raw: unknown): 'salaried' | 'self_employed' {
  return safeText(raw).toLowerCase() === 'salaried' ? 'salaried' : 'self_employed'
}

export async function downloadAndParseConsolidatedReport(txId: string): Promise<IAdorePrefillData> {
  const minio = getMinioClient()
  const bucket = process.env.IADORE_MINIO_BUCKET ?? 'acme-india'
  const objectPath = `${txId}/IADORE_CROSS_ANALYSIS_REPORT_${txId}.xml`

  const xmlStream = await minio.getObject(bucket, objectPath)
  const xmlString = await streamToString(xmlStream)

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (tagName) => tagName === 'splitName',
  })
  const doc = parser.parse(xmlString) as Record<string, unknown>
  const report = doc['report'] as Record<string, unknown>
  const customerDetails = report['customerDetails'] as Record<string, unknown>
  const prefill = customerDetails['mobileFormPrefillDetails'] as Record<string, unknown>
  const prefillPanDetails = prefill['panDetails'] as Record<string, unknown>
  const prefillAddress = prefillPanDetails['address'] as Record<string, unknown>
  const custPanDetails = customerDetails['panDetails'] as Record<string, unknown>
  const employment = customerDetails['employmentDetails'] as Record<string, unknown>
  const nameLookup = employment?.['nameLookup'] as Record<string, unknown> | undefined

  return {
    pan: safeText(prefill['pan']),
    name: safeText(prefillPanDetails['fullName']),
    dob: safeText(prefillPanDetails['dob']),
    gender: mapGender(custPanDetails?.['gender'] ?? prefillPanDetails['gender']),
    address_line: safeText(prefillAddress['line1']),
    city: safeText(prefillAddress['city']),
    state: safeText(prefillAddress['state']),
    pincode: safeText(prefillAddress['zip']),
    occupation_type: mapOccupation(customerDetails['occupationType']),
    employer_name: nameLookup ? safeText(nameLookup['organizationName']) || null : null,
    hazardous_occupation: null,
    father_name: null,
  }
}

function makeIAdoreHeaders(creds: IAdoreCredentials, bodyString: string): HeadersInit {
  const timestamp = Date.now().toString()
  const signature = createHmac('sha256', creds.hmac_key)
    .update(creds.org_key + timestamp + bodyString)
    .digest('hex')

  return {
    'X-Perfios-Org-Key': creds.org_key,
    'X-Perfios-Timestamp': timestamp,
    'X-Perfios-Signature': signature,
  }
}

export async function startIAdoreJob(
  creds: IAdoreCredentials,
  params: { pan: string; mobile: string; email: string; name?: string; txnId: string }
): Promise<{ txnId: string; jobId: string; status: string }> {
  const formData = new FormData()
  formData.append('pan', params.pan)
  formData.append('mobile', params.mobile)
  formData.append('email', params.email)
  if (params.name) formData.append('name', params.name)
  formData.append('txn_id', params.txnId)

  const headers = makeIAdoreHeaders(creds, '')

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(`${creds.base_url}/v2/consolidated-demographic`, {
      method: 'POST',
      headers,
      body: formData,
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`iAdore start job failed: ${res.status} ${await res.text()}`)
    return res.json() as Promise<{ txnId: string; jobId: string; status: string }>
  } finally {
    clearTimeout(timeout)
  }
}

export async function pollIAdoreJob(
  creds: IAdoreCredentials,
  txnId: string
): Promise<{ status: string; report?: unknown }> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(`${creds.base_url}/v2/consolidated-demographic/status/${txnId}`, {
      headers: makeIAdoreHeaders(creds, ''),
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`iAdore poll failed: ${res.status}`)
    return res.json() as Promise<{ status: string; report?: unknown }>
  } finally {
    clearTimeout(timeout)
  }
}

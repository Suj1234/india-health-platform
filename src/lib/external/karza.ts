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

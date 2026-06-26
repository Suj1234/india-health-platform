import { createHmac } from 'crypto'
import type { IAdoreCredentials } from '@/types/insurer'
import { allowInsecureTlsIfEnabled } from '../server-network'

allowInsecureTlsIfEnabled()

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

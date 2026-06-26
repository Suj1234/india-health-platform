import type { NuralXCredentials } from '@/types/insurer'
import { allowInsecureTlsIfEnabled } from '../server-network'

allowInsecureTlsIfEnabled()

let nuralxAccessToken: { token: string; expiresAt: number } | null = null

async function getNuralXToken(creds: NuralXCredentials): Promise<string> {
  if (nuralxAccessToken && Date.now() < nuralxAccessToken.expiresAt) {
    return nuralxAccessToken.token
  }

  const res = await fetch(`${creds.base_url}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: creds.client_id, client_secret: creds.client_secret }),
  })

  if (!res.ok) throw new Error(`NuralX auth failed: ${res.status}`)
  const data = await res.json() as { access_token: string; expires_in: number }

  nuralxAccessToken = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }

  return nuralxAccessToken.token
}

export async function initiateScan(
  creds: NuralXCredentials,
  applicationId: string
): Promise<{ scan_id: string; scan_url: string }> {
  const token = await getNuralXToken(creds)

  const res = await fetch(`${creds.base_url}/scan/initiate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_reference: applicationId,
      callback_url: creds.callback_url,
    }),
  })

  if (!res.ok) throw new Error(`NuralX initiate scan failed: ${res.status}`)
  return res.json() as Promise<{ scan_id: string; scan_url: string }>
}

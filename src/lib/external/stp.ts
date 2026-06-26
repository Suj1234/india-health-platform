import type { STPCredentials } from '@/types/insurer'
import type { STPResult } from '@/types/application'
import { allowInsecureTlsIfEnabled } from '../server-network'

allowInsecureTlsIfEnabled()

export async function runSTPEngine(
  creds: STPCredentials,
  payload: Record<string, unknown>
): Promise<STPResult> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 30000)

  try {
    const res = await fetch(`${creds.base_url}/v1/evaluate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${creds.api_key}`,
        'Content-Type': 'application/json',
        ...(creds.insurer_code ? { 'X-Insurer-Code': creds.insurer_code } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!res.ok) throw new Error(`STP Engine failed: ${res.status} ${await res.text()}`)
    return res.json() as Promise<STPResult>
  } finally {
    clearTimeout(timeout)
  }
}

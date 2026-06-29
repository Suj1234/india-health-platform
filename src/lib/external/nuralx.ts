import type { NuralXCredentials } from '@/types/insurer'
import { allowInsecureTlsIfEnabled } from '../server-network'

allowInsecureTlsIfEnabled()

export interface NuralXPatient {
  name: string
  email: string | null
  phone: string | null
}

export interface NuralXScanResult {
  scan_id: string
  scan_url: string
}

export interface NuralXVitalsPayload {
  heart_rate: number | null
  respiratory_rate: number | null
  blood_pressure_systolic: number | null
  blood_pressure_diastolic: number | null
  oxygen_saturation: number | null
  stress_index: number | null
  wellness_index: number | null
  raw: Record<string, unknown>
}

// ── Step 1: generate-credentials ─────────────────────────────────────────────
async function generateClientCredentials(
  creds: NuralXCredentials
): Promise<{ client_id: string; client_secret: string }> {
  const url = `${creds.base_url}generate-credentials`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`NuralX generate-credentials failed (${res.status}): ${body}`)
  }

  // Response: { success, data: { organization_id, client_id, client_secret }, message }
  const data = await res.json() as {
    success: string
    data: { organization_id: string; client_id: string; client_secret: string }
    message?: string
  }

  return { client_id: data.data.client_id, client_secret: data.data.client_secret }
}

// ── Step 2: token ─────────────────────────────────────────────────────────────
async function generateAccessToken(
  baseUrl: string,
  clientId: string,
  clientSecret: string
): Promise<string> {
  const url = `${baseUrl}token`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`NuralX token failed (${res.status}): ${body}`)
  }

  // Response: { success, access_token, token_type, expires_in }
  const data = await res.json() as { access_token: string; expires_in: string }
  return data.access_token
}

// ── Step 3: patient-data ──────────────────────────────────────────────────────
async function addPatientData(
  baseUrl: string,
  accessToken: string,
  applicationId: string,
  patient: NuralXPatient,
  callbackUrl: string
): Promise<NuralXScanResult> {
  const url = `${baseUrl}patient-data`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      authorization: accessToken,
    },
    body: JSON.stringify({
      name: patient.name,
      email: patient.email,
      phone: patient.phone,
      client_transaction_ID: applicationId,
      call_back_URL: callbackUrl,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`NuralX patient-data failed (${res.status}): ${body}`)
  }

  // Response: { success, message, data: { device_user, license_usage, scan_access_url } }
  const data = await res.json() as {
    success: string
    data: {
      device_user: { id: string; client_transaction_ID: string }
      license_usage: { id: string; access_code: string }
      scan_access_url: string
    }
  }

  return {
    scan_id: data.data.license_usage?.id ?? data.data.device_user?.id ?? applicationId,
    scan_url: data.data.scan_access_url,
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function initiateScan(
  creds: NuralXCredentials,
  applicationId: string,
  patient: NuralXPatient
): Promise<NuralXScanResult> {
  const { client_id, client_secret } = await generateClientCredentials(creds)
  const accessToken = await generateAccessToken(creds.base_url, client_id, client_secret)
  return addPatientData(creds.base_url, accessToken, applicationId, patient, creds.callback_url)
}

// ── Map NuralX callback results to our schema ─────────────────────────────────

interface NuralXMetric<T> {
  value: T
  confidenceLevel?: number | null
}

interface NuralXCallbackResults {
  pulseRate?: NuralXMetric<number>
  respirationRate?: NuralXMetric<number>
  bloodPressure?: NuralXMetric<{ systolic: number; diastolic: number }>
  stressIndex?: NuralXMetric<number>
  wellnessIndex?: NuralXMetric<number>
  [key: string]: unknown
}

export function mapCallbackVitals(results: NuralXCallbackResults): NuralXVitalsPayload {
  return {
    heart_rate: results.pulseRate?.value ?? null,
    respiratory_rate: results.respirationRate?.value ?? null,
    blood_pressure_systolic: results.bloodPressure?.value?.systolic ?? null,
    blood_pressure_diastolic: results.bloodPressure?.value?.diastolic ?? null,
    oxygen_saturation: null, // NuralX does not return SpO2 directly — set from wellness proxy
    stress_index: results.stressIndex?.value ?? null,
    wellness_index: results.wellnessIndex?.value ?? null,
    raw: results as Record<string, unknown>,
  }
}

import { db } from './db'
import { insurers, insurerApiCredentials, apiCallLogs } from './db/schema'
import { eq, and } from 'drizzle-orm'

export type ExternalApiName =
  | 'iadore'
  | 'karza_tkyc'
  | 'karza_ocr'
  | 'karza_mobile_otp'
  | 'pmw'
  | 'quotes'
  | 'nuralx'
  | 'pivc'
  | 'stp'

interface CallOptions<T> {
  insurerId: string
  apiName: ExternalApiName
  applicationId?: string
  realFn: () => Promise<T>
  mockFn: () => T | Promise<T>
}

export async function callExternalAPI<T>(options: CallOptions<T>): Promise<T> {
  const { insurerId, apiName, applicationId, realFn, mockFn } = options

  // 1. Get insurer mode
  const insurer = await db.query.insurers.findFirst({
    where: eq(insurers.id, insurerId),
  })
  if (!insurer) throw new Error(`Insurer ${insurerId} not found`)

  // 2. Get credentials (insurer-level, then env-level fallback)
  const creds = await db.query.insurerApiCredentials.findFirst({
    where: and(
      eq(insurerApiCredentials.insurerId, insurerId),
      eq(insurerApiCredentials.apiName, apiName),
      eq(insurerApiCredentials.isActive, true)
    ),
  })

  const forceMock = insurer.mode === 'test'
  const noCredentials = !creds && !hasEnvCredentials(apiName)
  const shouldMock = forceMock || noCredentials

  const startTime = Date.now()
  let result: T
  let isMock = shouldMock
  let errorMessage: string | null = null

  if (shouldMock) {
    result = await mockFn()
  } else {
    try {
      result = await realFn()
    } catch (err) {
      console.warn(`[api-router] ${apiName} live call failed, using mock fallback:`, err)
      result = await mockFn()
      isMock = true
      errorMessage = err instanceof Error ? err.message : String(err)
    }
  }

  // Log every call (best-effort, never throw)
  db.insert(apiCallLogs)
    .values({
      applicationId: applicationId ?? null,
      insurerId,
      apiName,
      isMock,
      durationMs: Date.now() - startTime,
      errorMessage,
      requestSummary: { mode: insurer.mode, had_credentials: !!creds },
      responseSummary: { success: !errorMessage },
    })
    .catch((logErr) => console.error('[api-router] Failed to log API call:', logErr))

  return result
}

function hasEnvCredentials(apiName: ExternalApiName): boolean {
  switch (apiName) {
    case 'iadore':
      return !!(process.env.IADORE_BASE_URL && process.env.IADORE_ORG_KEY)
    case 'karza_tkyc':
    case 'karza_ocr':
    case 'karza_mobile_otp':
      return !!(process.env.KARZA_BASE_URL && process.env.KARZA_API_KEY)
    case 'pmw':
      return !!(process.env.PMW_BASE_URL && process.env.PMW_API_KEY)
    case 'quotes':
      return !!(process.env.QUOTE_API_URL && process.env.QUOTE_API_KEY)
    case 'nuralx':
      return !!(process.env.NURALX_BASE_URL && process.env.NURALX_EMAIL)
    case 'pivc':
      return !!(process.env.PIVC_BASE_URL && process.env.PIVC_API_KEY)
    case 'stp':
      return !!(process.env.STP_API_URL && process.env.STP_API_KEY)
    default:
      return false
  }
}

export async function getInsurerCredentials(
  insurerId: string,
  apiName: ExternalApiName
): Promise<Record<string, unknown> | null> {
  const creds = await db.query.insurerApiCredentials.findFirst({
    where: and(
      eq(insurerApiCredentials.insurerId, insurerId),
      eq(insurerApiCredentials.apiName, apiName),
      eq(insurerApiCredentials.isActive, true)
    ),
  })
  return (creds?.credentials as Record<string, unknown>) ?? null
}

export async function getInsurerById(id: string) {
  return db.query.insurers.findFirst({ where: eq(insurers.id, id) })
}

export async function getInsurerBySlug(slug: string) {
  return db.query.insurers.findFirst({ where: eq(insurers.slug, slug) })
}

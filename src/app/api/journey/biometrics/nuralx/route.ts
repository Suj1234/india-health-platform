import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, biometricSessions, insurers } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI, getInsurerCredentials } from '@/lib/api-router'
import { initiateScan } from '@/lib/external/nuralx'
import { mockNuralXScanInitiate } from '@/lib/mock/nuralx.mock'
import type { NuralXCredentials } from '@/types/insurer'

function buildCredsFromEnv(): NuralXCredentials | null {
  const base_url = process.env.NURALX_BASE_URL
  const email = process.env.NURALX_EMAIL
  const password = process.env.NURALX_PASSWORD
  const callback_url = process.env.NURALX_CALLBACK_URL
  if (!base_url || !email || !password || !callback_url) return null
  return { base_url, email, password, callback_url }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    // Resolve NuralX credentials: DB-level first, env fallback
    const dbCreds = await getInsurerCredentials(app.insurerId, 'nuralx')
    const creds = (dbCreds as NuralXCredentials | null) ?? buildCredsFromEnv()

    // Determine if this will be a mocked session (test mode OR no credentials)
    const [insurer] = await db.select({ mode: insurers.mode }).from(insurers).where(eq(insurers.id, app.insurerId)).limit(1)
    const isMockSession = insurer?.mode === 'test' || !creds

    const patient = {
      name: app.name ?? 'Unknown',
      email: app.email ?? null,
      phone: app.mobile ?? null,
    }

    const result = await callExternalAPI<{ scan_id: string; scan_url: string }>({
      insurerId: app.insurerId,
      applicationId: app.id,
      apiName: 'nuralx',
      realFn: async () => {
        if (!creds) throw new Error('NuralX credentials not configured')
        return initiateScan(creds, app.id, patient)
      },
      mockFn: () => mockNuralXScanInitiate(session.application_id),
    })

    // Upsert biometric session — replace any prior session for this application
    const [existing] = await db
      .select({ id: biometricSessions.id })
      .from(biometricSessions)
      .where(eq(biometricSessions.applicationId, session.application_id))
      .limit(1)

    if (existing) {
      await db
        .update(biometricSessions)
        .set({
          sessionId: result.scan_id,
          scanUrl: result.scan_url,
          status: 'initiated',
          isMock: isMockSession,
          result: null,
          completedAt: null,
          updatedAt: new Date(),
        })
        .where(eq(biometricSessions.id, existing.id))
    } else {
      await db.insert(biometricSessions).values({
        applicationId: session.application_id,
        sessionType: 'nuralx',
        sessionId: result.scan_id,
        scanUrl: result.scan_url,
        status: 'initiated',
        isMock: isMockSession,
      })
    }

    return NextResponse.json({
      success: true,
      scan_url: result.scan_url,
      scan_id: result.scan_id,
      is_mock: isMockSession,
    })
  } catch (err) {
    console.error('[biometrics/nuralx] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

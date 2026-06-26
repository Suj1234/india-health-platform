import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, biometricSessions } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI } from '@/lib/api-router'
import { mockNuralXScanInitiate } from '@/lib/mock/nuralx.mock'

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db.select().from(applications).where(eq(applications.id, session.application_id)).limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const result = await callExternalAPI<{ scan_id: string; scan_url: string }>({
      insurerId: app.insurerId,
      apiName: 'nuralx',
      realFn: async () => mockNuralXScanInitiate(session.application_id),
      mockFn: () => mockNuralXScanInitiate(session.application_id),
    })

    await db.insert(biometricSessions).values({
      applicationId: session.application_id,
      sessionType: 'nuralx',
      sessionId: result.scan_id,
      scanUrl: result.scan_url,
      status: 'initiated',
    })

    await db
      .update(applications)
      .set({ status: 'biometrics_done', updatedAt: new Date() })
      .where(eq(applications.id, session.application_id))

    return NextResponse.json({
      success: true,
      scan_url: result.scan_url,
      email_sent_to: app.email,
    })
  } catch (err) {
    console.error('[biometrics/nuralx] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

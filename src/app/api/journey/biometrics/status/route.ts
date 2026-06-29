import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { biometricSessions } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [biometric] = await db
      .select({
        status: biometricSessions.status,
        result: biometricSessions.result,
        scanUrl: biometricSessions.scanUrl,
        isMock: biometricSessions.isMock,
        completedAt: biometricSessions.completedAt,
        createdAt: biometricSessions.createdAt,
      })
      .from(biometricSessions)
      .where(eq(biometricSessions.applicationId, session.application_id))
      .limit(1)

    if (!biometric) {
      return NextResponse.json({ success: true, status: 'not_started' })
    }

    return NextResponse.json({
      success: true,
      status: biometric.status,           // 'initiated' | 'completed' | 'timeout'
      vitals: biometric.result ?? null,
      scan_url: biometric.scanUrl,
      is_mock: biometric.isMock,
      completed_at: biometric.completedAt,
    })
  } catch (err) {
    console.error('[biometrics/status] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await db
      .update(applications)
      .set({ status: 'biometrics_done', currentStep: 12, updatedAt: new Date() })
      .where(eq(applications.id, session.application_id))

    return NextResponse.json({ success: true, skipped: true })
  } catch (err) {
    console.error('[biometrics/skip] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

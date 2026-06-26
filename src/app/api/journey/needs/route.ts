import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db
      .select({ needsSummary: applications.needsSummary })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    return NextResponse.json({ success: true, needs_summary: app.needsSummary })
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

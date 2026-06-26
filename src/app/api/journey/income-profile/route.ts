import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import type { IncomeProfile } from '@/types/application'

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db
      .select({ incomeProfile: applications.incomeProfile, customerDeclaredIncome: applications.customerDeclaredIncome })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    const profile = app.incomeProfile as IncomeProfile | null
    return NextResponse.json({
      success: true,
      selected_annual_income: profile?.selected_annual_income ?? app.customerDeclaredIncome ?? 0,
      income_profile: profile,
    })
  } catch {
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, quotes } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import type { QuoteRider } from '@/types/application'

const RIDER_NAMES: Record<string, string> = {
  CI: 'Critical Illness',
  PA: 'Personal Accident',
  PWB: 'Premium Waiver Benefit',
  HDC: 'Hospital Daily Cash',
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db
      .select({ selectedQuoteId: applications.selectedQuoteId, finalPremium: applications.finalPremium })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    if (!app.selectedQuoteId) return NextResponse.json({ success: false, error: 'No quote selected' }, { status: 404 })

    const [q] = await db
      .select({
        planName: quotes.planName,
        sumInsured: quotes.sumInsured,
        annualPremium: quotes.annualPremium,
        gstAmount: quotes.gstAmount,
        totalPremium: quotes.totalPremium,
        riders: quotes.riders,
      })
      .from(quotes)
      .where(eq(quotes.id, app.selectedQuoteId))
      .limit(1)

    if (!q) return NextResponse.json({ success: false, error: 'Quote not found' }, { status: 404 })

    const allRiders = (q.riders as QuoteRider[]) ?? []
    const selectedRiders = allRiders.filter((r) => r.selected)

    const riderPremiumTotal = selectedRiders.reduce((sum, r) => sum + r.annual_premium, 0)
    const basePlanPremium = Number(q.annualPremium) - riderPremiumTotal

    return NextResponse.json({
      success: true,
      plan_name: q.planName,
      sum_insured: Number(q.sumInsured),
      base_premium: Math.round(basePlanPremium),
      riders: selectedRiders.map((r) => ({
        code: r.code,
        name: RIDER_NAMES[r.code] ?? r.code,
        premium: r.annual_premium,
      })),
      gst_amount: Number(q.gstAmount),
      total_premium: Number(q.totalPremium),
    })
  } catch (err) {
    console.error('[payment/summary] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

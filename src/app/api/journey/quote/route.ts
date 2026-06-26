import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, quotes } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'

const schema = z.object({
  plan_code: z.string().min(1),
  sum_insured: z.number().positive(),
  riders: z.array(z.object({
    code: z.string(),
    sa: z.number().nullable().optional(),
  })).default([]),
  payment_frequency: z.enum(['annual', 'half-yearly', 'quarterly', 'monthly']).default('annual'),
  total_premium: z.number().positive(),
})

const RIDER_PREMIUMS: Record<string, number> = {
  CI: 0,       // rate-based, computed from SA
  PA: 0,       // rate-based, computed from SA
  PWB: 420,
  HDC: 1200,
}
const RIDER_RATES: Record<string, number> = {
  CI: 0.36,
  PA: 0.13,
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 })
    }

    const [app] = await db.select().from(applications).where(eq(applications.id, session.application_id)).limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    const allowedStatuses = ['medical_done', 'quote_selected']
    if (!allowedStatuses.includes(app.status)) {
      return NextResponse.json({ success: false, error: 'Invalid application status', code: 'INVALID_STATUS' }, { status: 409 })
    }

    const { plan_code, sum_insured, riders, payment_frequency, total_premium } = parsed.data

    // Build rider details with computed premiums
    const riderDetails = riders.map((r) => {
      const rate = RIDER_RATES[r.code]
      const annual_premium = rate && r.sa
        ? Math.round(r.sa * rate / 100)
        : (RIDER_PREMIUMS[r.code] ?? 0)
      const gst = Math.round(annual_premium * 0.18)
      return {
        code: r.code,
        sa: r.sa ?? null,
        annual_premium,
        gst,
        total: annual_premium + gst,
        selected: true,
      }
    })

    const gstAmount = Math.round(total_premium * 0.18 / 1.18)
    const basePremium = total_premium - gstAmount

    // Delete any existing quote for this application and insert fresh
    await db.delete(quotes).where(eq(quotes.applicationId, session.application_id))

    const [inserted] = await db
      .insert(quotes)
      .values({
        applicationId: session.application_id,
        insurerId: app.insurerId,
        planType: 'standard',
        planName: 'Standard Care',
        planCode: plan_code,
        sumInsured: sum_insured.toString(),
        annualPremium: basePremium.toString(),
        gstAmount: gstAmount.toString(),
        totalPremium: total_premium.toString(),
        riders: riderDetails as unknown as Record<string, unknown>[],
        isSelected: true,
      })
      .returning()

    await db
      .update(applications)
      .set({
        selectedQuoteId: inserted!.id,
        finalPremium: total_premium.toString(),
        status: 'quote_selected',
        currentStep: 5,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, session.application_id))

    return NextResponse.json({
      success: true,
      quote_id: inserted!.id,
      final_premium: total_premium,
      payment_frequency,
      next_step: 5,
    })
  } catch (err) {
    console.error('[journey/quote] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

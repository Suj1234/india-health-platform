import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, quotes } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import type { QuoteOption } from '@/types/application'

const schema = z.object({
  quote_id: z.string().uuid(),
  selected_riders: z.array(z.string()).default([]),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 })
    }

    const { quote_id, selected_riders } = parsed.data

    const [quote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.id, quote_id))
      .limit(1)

    if (!quote || quote.applicationId !== session.application_id) {
      return NextResponse.json({ success: false, error: 'Quote not found' }, { status: 404 })
    }

    const riders = (quote.riders as QuoteOption['riders']) ?? []
    const selectedRiderTotal = riders
      .filter((r) => selected_riders.includes(r.code))
      .reduce((sum, r) => sum + r.total, 0)

    const finalPremium = Number(quote.totalPremium) + selectedRiderTotal

    // Mark quote as selected (store selected rider codes in riders JSONB)
    const updatedRiders = (quote.riders as QuoteOption['riders'] ?? []).map((r) => ({
      ...r,
      selected: selected_riders.includes(r.code),
    }))
    await db
      .update(quotes)
      .set({ isSelected: true, riders: updatedRiders as unknown as Record<string, unknown>[] })
      .where(eq(quotes.id, quote_id))

    // Update application
    await db
      .update(applications)
      .set({
        selectedQuoteId: quote_id,
        finalPremium: finalPremium.toString(),
        status: 'quote_selected',
        currentStep: 7,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, session.application_id))

    return NextResponse.json({ success: true, final_premium: finalPremium, next_step: 7 })
  } catch (err) {
    console.error('[journey/select-quote] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

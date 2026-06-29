import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, quotes } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import type { IAdoreSummary, QuoteRider } from '@/types/application'

export async function GET(_req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db
      .select({
        name: applications.name,
        dob: applications.dob,
        gender: applications.gender,
        pan: applications.pan,
        mobile: applications.mobile,
        email: applications.email,
        coverType: applications.coverType,
        iadoreSummary: applications.iadoreSummary,
        selectedQuoteId: applications.selectedQuoteId,
      })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    const summary = app.iadoreSummary as IAdoreSummary | null

    let quote = null
    if (app.selectedQuoteId) {
      const [q] = await db
        .select({
          planName: quotes.planName,
          sumInsured: quotes.sumInsured,
          totalPremium: quotes.totalPremium,
          riders: quotes.riders,
        })
        .from(quotes)
        .where(eq(quotes.id, app.selectedQuoteId))
        .limit(1)

      if (q) {
        const riderRows = (q.riders as QuoteRider[]) ?? []
        quote = {
          plan_name: q.planName,
          sum_insured: Number(q.sumInsured),
          total_premium: Number(q.totalPremium),
          selected_riders: riderRows.filter((r) => r.selected).map((r) => r.code),
        }
      }
    }

    return NextResponse.json({
      success: true,
      cover_type: app.coverType ?? 'individual',
      proposer: {
        name: app.name ?? null,
        dob: app.dob ?? null,
        gender: app.gender ?? null,
        pan: app.pan ?? null,
        mobile: app.mobile,
        email: app.email ?? null,
        address: summary?.address ?? null,
        occupation_type: summary?.occupation_type ?? null,
        employer_name: summary?.employer_name ?? null,
      },
      quote,
    })
  } catch (err) {
    console.error('[journey/proposal GET] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

const schema = z.object({
  nominee_name: z.string().min(1),
  nominee_relation: z.string().min(1),
  nominee_dob: z.string().min(1),
  declaration_accepted: z.literal(true),
  consent_data_sharing: z.literal(true),
  consent_health_declaration: z.literal(true),
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

    const [app] = await db.select().from(applications).where(eq(applications.id, session.application_id)).limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (!['medical_done', 'quote_selected'].includes(app.status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 409 })
    }

    const proposalData = {
      name: app.name ?? '',
      dob: app.dob ?? '',
      gender: app.gender ?? '',
      nominee_name: parsed.data.nominee_name,
      nominee_relation: parsed.data.nominee_relation,
      nominee_dob: parsed.data.nominee_dob,
      nominee_share: 100,
      declaration_accepted: true,
      consent_data_sharing: true,
      consent_health_declaration: true,
    }

    await db
      .update(applications)
      .set({
        proposalData: proposalData as unknown as Record<string, unknown>,
        status: 'proposal_submitted',
        currentStep: 9,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, session.application_id))

    return NextResponse.json({ success: true, next_step: 9 })
  } catch (err) {
    console.error('[journey/proposal] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

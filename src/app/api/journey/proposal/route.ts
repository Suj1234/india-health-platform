import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'

const schema = z.object({
  proposal_data: z.object({
    name: z.string().min(1),
    dob: z.string(),
    gender: z.string(),
    address: z.object({
      line1: z.string(),
      city: z.string(),
      state: z.string(),
      pincode: z.string(),
    }).partial(),
    marital_status: z.enum(['single', 'married', 'divorced', 'widowed']),
    occupation_type: z.string(),
    annual_income: z.number(),
    nominee_name: z.string().min(1),
    nominee_relation: z.string(),
    nominee_dob: z.string(),
    nominee_share: z.number().default(100),
    declaration_accepted: z.literal(true),
    consent_data_sharing: z.literal(true),
    consent_health_declaration: z.literal(true),
  }),
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
    if (app.status !== 'medical_done') {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 409 })
    }

    const proposalData = { ...parsed.data.proposal_data, nominee_share: 100 }

    await db
      .update(applications)
      .set({
        proposalData: proposalData as unknown as Record<string, unknown>,
        name: proposalData.name,
        email: app.email,
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

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, underwriterActions } from '@/lib/db/schema'
import { getStaffSession } from '@/lib/auth'
import { createPaymentLinkToken } from '@/lib/auth'
import { sendUwApprovedEmail } from '@/lib/brevo'

const schema = z.object({
  customer_message: z.string().min(1),
  internal_notes: z.string().optional(),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getStaffSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 })
    }

    const [app] = await db.select().from(applications).where(eq(applications.id, id)).limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    if (session.role !== 'superadmin' && session.insurer_id && app.insurerId !== session.insurer_id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    if (!['uw_pending', 'uw_more_docs', 'docs_requested'].includes(app.status)) {
      return NextResponse.json({ success: false, error: 'Application not in reviewable state' }, { status: 409 })
    }

    const { customer_message, internal_notes } = parsed.data

    const paymentToken = await createPaymentLinkToken({ applicationId: id, uwDecision: 'approved' })
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const paymentLink = `${baseUrl}/resume?token=${paymentToken}`

    await db.update(applications).set({
      status: 'uw_approved',
      uwDecision: 'approved',
      uwDecidedAt: new Date(),
      uwDecidedBy: session.sub,
      uwNotes: internal_notes ?? null,
      paymentLinkToken: paymentToken,
      paymentLinkExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      updatedAt: new Date(),
    }).where(eq(applications.id, id))

    await db.insert(underwriterActions).values({
      applicationId: id,
      underwriterId: session.sub,
      action: 'approved',
      customerMessage: customer_message,
      internalNotes: internal_notes ?? null,
      customerNotifiedAt: new Date(),
    })

    if (app.email && app.name) {
      const premium = Number(app.finalPremium ?? app.uwRevisedPremium ?? 0)
      await sendUwApprovedEmail({
        email: app.email,
        name: app.name,
        applicationNumber: app.applicationNumber,
        planName: '—',
        premium,
        paymentLink,
        insurerName: 'CareShield Insurance',
        expiryDays: 7,
      }).catch((e) => console.error('[approve] email failed:', e))
    }

    return NextResponse.json({ success: true, payment_link: paymentLink })
  } catch (err) {
    console.error('[underwriter/approve] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

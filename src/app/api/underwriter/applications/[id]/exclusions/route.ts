import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, underwriterActions } from '@/lib/db/schema'
import { getStaffSession } from '@/lib/auth'
import { createPaymentLinkToken } from '@/lib/auth'
import { sendEmail } from '@/lib/brevo'

const exclusionSchema = z.object({
  condition: z.string().min(1),
  type: z.enum(['permanent', 'temporary']),
  duration_months: z.number().optional(),
  description: z.string().optional(),
})

const schema = z.object({
  exclusions: z.array(exclusionSchema).min(1),
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

    const { exclusions, customer_message, internal_notes } = parsed.data

    const paymentToken = await createPaymentLinkToken({ applicationId: id, uwDecision: 'approved_with_exclusion' })
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const paymentLink = `${baseUrl}/resume?token=${paymentToken}`

    await db.update(applications).set({
      status: 'uw_approved',
      uwDecision: 'approved_with_exclusion',
      uwExclusions: exclusions as unknown as Record<string, unknown>[],
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
      action: 'approved_with_exclusion',
      exclusions: exclusions as unknown as Record<string, unknown>[],
      customerMessage: customer_message,
      internalNotes: internal_notes ?? null,
      customerNotifiedAt: new Date(),
    })

    if (app.email && app.name) {
      const exclusionList = exclusions.map((e) =>
        `• ${e.condition} (${e.type === 'permanent' ? 'Permanent exclusion' : `Temporary — ${e.duration_months} months`})`
      ).join('\n')
      await sendEmail({
        to: app.email,
        toName: app.name,
        subject: `CareShield Insurance — Your application is approved with exclusions`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0D5C63;">CareShield Insurance</h2>
            <p>Dear ${app.name},</p>
            <p>Your health insurance application (Ref: ${app.applicationNumber}) has been approved with the following exclusions:</p>
            <div style="background: #fef9c3; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #fde68a;">
              <pre style="margin: 0; font-family: Arial, sans-serif; color: #92400e; font-size: 14px; white-space: pre-wrap;">${exclusionList}</pre>
            </div>
            <p>${customer_message}</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${paymentLink}" style="background: #0D5C63; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600;">Review & Proceed to Payment →</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">This link is valid for 7 days. — CareShield Insurance Team</p>
          </div>
        `,
      }).catch((e) => console.error('[exclusions] email failed:', e))
    }

    return NextResponse.json({ success: true, payment_link: paymentLink })
  } catch (err) {
    console.error('[underwriter/exclusions] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

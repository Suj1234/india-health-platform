import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, underwriterActions } from '@/lib/db/schema'
import { getStaffSession } from '@/lib/auth'
import { createPaymentLinkToken } from '@/lib/auth'
import { sendEmail } from '@/lib/brevo'

const schema = z.object({
  loading_type: z.enum(['percentage', 'flat']),
  loading_value: z.number().positive(),
  original_premium: z.number().positive(),
  revised_premium: z.number().positive(),
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
    if (session.role !== 'super_admin' && session.insurer_id && app.insurerId !== session.insurer_id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }
    if (!['uw_pending', 'uw_more_docs', 'docs_requested'].includes(app.status)) {
      return NextResponse.json({ success: false, error: 'Application not in reviewable state' }, { status: 409 })
    }

    const { loading_type, loading_value, original_premium, revised_premium, customer_message, internal_notes } = parsed.data

    const loadingPercent = loading_type === 'percentage' ? loading_value : (loading_value / original_premium) * 100
    const loadingAmount = loading_type === 'flat' ? loading_value : (original_premium * loading_value) / 100

    const paymentToken = await createPaymentLinkToken({ applicationId: id, uwDecision: 'approved_with_loading' })
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const paymentLink = `${baseUrl}/resume?token=${paymentToken}`

    await db.update(applications).set({
      status: 'uw_approved',
      uwDecision: 'approved_with_loading',
      uwLoadingPercent: loadingPercent.toString(),
      uwLoadingAmount: loadingAmount.toString(),
      uwRevisedPremium: revised_premium.toString(),
      finalPremium: revised_premium.toString(),
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
      action: 'approved_with_loading',
      loadingType: loading_type,
      loadingPercent: loadingPercent.toString(),
      loadingAmount: loadingAmount.toString(),
      revisedPremium: revised_premium.toString(),
      customerMessage: customer_message,
      internalNotes: internal_notes ?? null,
      customerNotifiedAt: new Date(),
    })

    if (app.email && app.name) {
      await sendEmail({
        to: app.email,
        toName: app.name,
        subject: `CareShield Insurance — Your application is approved with revised premium`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0D5C63;">CareShield Insurance</h2>
            <p>Dear ${app.name},</p>
            <p>Your application (Ref: ${app.applicationNumber}) has been approved.</p>
            <div style="background: #fff7ed; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #fed7aa;">
              <p style="margin: 0 0 12px; color: #92400e; font-weight: 600;">Premium Revision Details</p>
              <p style="margin: 4px 0; color: #64748b; font-size: 14px;">Original Premium: ₹${original_premium.toLocaleString('en-IN')}</p>
              <p style="margin: 4px 0; color: #64748b; font-size: 14px;">Loading (${loading_type === 'percentage' ? `${loading_value}%` : `₹${loading_value.toLocaleString('en-IN')} flat`}): ₹${loadingAmount.toLocaleString('en-IN')}</p>
              <p style="margin: 8px 0 0; color: #1a1f2e; font-size: 18px; font-weight: 700;">Revised Premium: ₹${revised_premium.toLocaleString('en-IN')}/year</p>
            </div>
            <p>${customer_message}</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${paymentLink}" style="background: #0D5C63; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600;">Review & Proceed to Payment →</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">This link is valid for 7 days. — CareShield Insurance Team</p>
          </div>
        `,
      }).catch((e) => console.error('[loading] email failed:', e))
    }

    return NextResponse.json({ success: true, revised_premium, payment_link: paymentLink })
  } catch (err) {
    console.error('[underwriter/loading] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

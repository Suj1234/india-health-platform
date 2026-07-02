import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, underwriterActions } from '@/lib/db/schema'
import { getStaffSession } from '@/lib/auth'
import { sendEmail } from '@/lib/brevo'

const REJECTION_REASONS = [
  'high_risk_medical',
  'multiple_ped',
  'fraud_risk',
  'age_limit',
  'hazardous_occupation',
  'insufficient_docs',
  'prior_claim_history',
  'customer_declined_info',
  'other',
] as const

const schema = z.object({
  rejection_reason: z.enum(REJECTION_REASONS),
  rejection_reason_text: z.string().optional(),
  customer_message: z.string().min(1),
  internal_notes: z.string().min(1),
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
    if (!['uw_pending', 'uw_more_docs'].includes(app.status)) {
      return NextResponse.json({ success: false, error: 'Application not in reviewable state' }, { status: 409 })
    }

    const { rejection_reason, rejection_reason_text, customer_message, internal_notes } = parsed.data
    const finalReason = rejection_reason === 'other' ? (rejection_reason_text ?? rejection_reason) : rejection_reason

    await db.update(applications).set({
      status: 'uw_rejected',
      uwDecision: 'rejected',
      uwRejectionReason: finalReason,
      uwNotes: internal_notes,
      uwDecidedAt: new Date(),
      uwDecidedBy: session.sub,
      updatedAt: new Date(),
    }).where(eq(applications.id, id))

    await db.insert(underwriterActions).values({
      applicationId: id,
      underwriterId: session.sub,
      action: 'rejected',
      rejectionReasonCode: rejection_reason,
      rejectionReasonText: finalReason,
      customerMessage: customer_message,
      internalNotes: internal_notes,
      customerNotifiedAt: new Date(),
    })

    if (app.email && app.name) {
      await sendEmail({
        to: app.email,
        toName: app.name,
        subject: `CareShield Insurance — Update on your health insurance application`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0D5C63;">CareShield Insurance</h2>
            <p>Dear ${app.name},</p>
            <p>We regret to inform you that after careful evaluation of your health insurance application (Ref: ${app.applicationNumber}), we are unable to offer coverage at this time.</p>
            <div style="background: #fef2f2; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #fecaca;">
              <p style="margin: 0; color: #991b1b;">${customer_message}</p>
            </div>
            <p>If you have any questions, please contact us at support@careshield.in or call 1800-XXX-XXXX.</p>
            <p>We appreciate your interest in CareShield Insurance.</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— CareShield Insurance Team</p>
          </div>
        `,
      }).catch((e) => console.error('[reject] email failed:', e))
    }

    return NextResponse.json({ success: true, status: 'uw_rejected' })
  } catch (err) {
    console.error('[underwriter/reject] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

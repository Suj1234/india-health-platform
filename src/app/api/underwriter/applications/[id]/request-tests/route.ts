import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, underwriterActions } from '@/lib/db/schema'
import { getStaffSession } from '@/lib/auth'
import { sendEmail } from '@/lib/brevo'

const testSchema = z.object({
  test_name: z.string().min(1),
  lab_preference: z.string().optional(),
  notes: z.string().optional(),
})

const schema = z.object({
  requested_tests: z.array(testSchema).min(1),
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
    if (!['uw_pending'].includes(app.status)) {
      return NextResponse.json({ success: false, error: 'Application not in pending state' }, { status: 409 })
    }

    const { requested_tests, customer_message, internal_notes } = parsed.data

    await db.update(applications).set({
      status: 'uw_more_docs',
      uwDecidedBy: session.sub,
      updatedAt: new Date(),
    }).where(eq(applications.id, id))

    await db.insert(underwriterActions).values({
      applicationId: id,
      underwriterId: session.sub,
      action: 'medical_test_requested',
      requestedTests: requested_tests as unknown as Record<string, unknown>[],
      customerMessage: customer_message,
      internalNotes: internal_notes ?? null,
      customerNotifiedAt: new Date(),
    })

    if (app.email && app.name) {
      const testList = requested_tests.map((t) =>
        `• ${t.test_name}${t.lab_preference ? ` — Lab: ${t.lab_preference}` : ''}${t.notes ? `\n  Note: ${t.notes}` : ''}`
      ).join('\n')
      await sendEmail({
        to: app.email,
        toName: app.name,
        subject: `CareShield Insurance — Medical tests required for your application`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0D5C63;">CareShield Insurance</h2>
            <p>Dear ${app.name},</p>
            <p>To complete the underwriting review of your application (Ref: ${app.applicationNumber}), we require the following medical tests:</p>
            <div style="background: #f0fdf4; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #bbf7d0;">
              <pre style="margin: 0; font-family: Arial, sans-serif; color: #064e3b; font-size: 14px; white-space: pre-wrap;">${testList}</pre>
            </div>
            <p>${customer_message}</p>
            <p>Please upload the test reports within 7 days using the secure portal link in your email.</p>
            <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">— CareShield Insurance Team</p>
          </div>
        `,
      }).catch((e) => console.error('[request-tests] email failed:', e))
    }

    return NextResponse.json({ success: true, status: 'uw_more_docs' })
  } catch (err) {
    console.error('[underwriter/request-tests] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

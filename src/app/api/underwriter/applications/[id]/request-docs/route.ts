import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, underwriterActions } from '@/lib/db/schema'
import { getStaffSession } from '@/lib/auth'
import { sendEmail } from '@/lib/brevo'

const docRequestSchema = z.object({
  document_type: z.string().min(1),
  description: z.string().min(1),
  mandatory: z.boolean().default(true),
})

const schema = z.object({
  requested_documents: z.array(docRequestSchema).min(1),
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

    const { requested_documents, customer_message, internal_notes } = parsed.data

    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
    const uploadLink = `${baseUrl}/apply/10`

    await db.update(applications).set({
      status: 'uw_more_docs',
      uwDecidedBy: session.sub,
      updatedAt: new Date(),
    }).where(eq(applications.id, id))

    await db.insert(underwriterActions).values({
      applicationId: id,
      underwriterId: session.sub,
      action: 'more_docs_requested',
      requestedDocuments: requested_documents as unknown as Record<string, unknown>[],
      customerMessage: customer_message,
      internalNotes: internal_notes ?? null,
      customerNotifiedAt: new Date(),
    })

    if (app.email && app.name) {
      const docList = requested_documents.map((d) =>
        `• ${d.document_type}${d.mandatory ? ' (Required)' : ' (Optional)'} — ${d.description}`
      ).join('\n')
      await sendEmail({
        to: app.email,
        toName: app.name,
        subject: `CareShield Insurance — Additional documents required for your application`,
        htmlContent: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
            <h2 style="color: #0D5C63;">CareShield Insurance</h2>
            <p>Dear ${app.name},</p>
            <p>To complete the review of your application (Ref: ${app.applicationNumber}), we require the following documents:</p>
            <div style="background: #f0f9ff; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #bae6fd;">
              <pre style="margin: 0; font-family: Arial, sans-serif; color: #0c4a6e; font-size: 14px; white-space: pre-wrap;">${docList}</pre>
            </div>
            <p>${customer_message}</p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${uploadLink}" style="background: #0D5C63; color: white; padding: 14px 32px; border-radius: 10px; text-decoration: none; font-weight: 600;">Upload Documents →</a>
            </div>
            <p style="color: #94a3b8; font-size: 12px;">Please upload within 7 days. — CareShield Insurance Team</p>
          </div>
        `,
      }).catch((e) => console.error('[request-docs] email failed:', e))
    }

    return NextResponse.json({ success: true, status: 'uw_more_docs', upload_link: uploadLink })
  } catch (err) {
    console.error('[underwriter/request-docs] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

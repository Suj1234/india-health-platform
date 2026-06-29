import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, payments, policies } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { verifyRazorpaySignature } from '@/lib/razorpay'
import { generatePolicyPdf } from '@/lib/pdf'
import { uploadPolicyPdf } from '@/lib/cloudinary'
import { sendPolicyEmail } from '@/lib/brevo'
import { generatePolicyNumber } from '@/lib/utils'
import type { QuoteOption } from '@/types/application'
import { quotes } from '@/lib/db/schema'

const schema = z.object({
  razorpay_payment_id: z.string().min(1),
  razorpay_order_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid payment data' }, { status: 400 })
    }

    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = parsed.data

    // CRITICAL: Verify Razorpay signature
    const valid = verifyRazorpaySignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
    })

    if (!valid) {
      console.error('[payment/verify] SIGNATURE MISMATCH — potential fraud attempt')
      return NextResponse.json({ success: false, error: 'Payment verification failed' }, { status: 400 })
    }

    const [app] = await db.select().from(applications).where(eq(applications.id, session.application_id)).limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    // Update payment record
    await db
      .update(payments)
      .set({
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        signatureVerified: true,
        status: 'paid',
        updatedAt: new Date(),
      })
      .where(eq(payments.razorpayOrderId, razorpay_order_id))

    // Get payment ID for policy
    const [paidPayment] = await db
      .select({ id: payments.id })
      .from(payments)
      .where(eq(payments.razorpayOrderId, razorpay_order_id))
      .limit(1)

    await db
      .update(applications)
      .set({ status: 'payment_done', updatedAt: new Date() })
      .where(eq(applications.id, session.application_id))

    // Issue policy
    const policyNumber = generatePolicyNumber()
    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setFullYear(endDate.getFullYear() + 1)

    const [selectedQuote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.applicationId, session.application_id))
      .limit(1)

    const proposalData = app.proposalData as { nominee_name?: string; nominee_relation?: string } | null
    const basePremium = Number(selectedQuote?.annualPremium ?? 0)
    const gstAmt = Number(selectedQuote?.gstAmount ?? 0)
    const totalPremium = basePremium + gstAmt

    // Generate policy PDF
    const cloudinaryReady = !!(
      process.env.CLOUDINARY_API_KEY?.length &&
      process.env.CLOUDINARY_API_SECRET?.length &&
      process.env.CLOUDINARY_CLOUD_NAME?.length &&
      !process.env.CLOUDINARY_API_KEY.includes('REPLACE')
    )
    console.log(`[payment/verify] Cloudinary configured: ${cloudinaryReady} | cloud: ${process.env.CLOUDINARY_CLOUD_NAME ?? 'MISSING'}`)

    let policyDocumentUrl = ''
    try {
      const pdfBytes = await generatePolicyPdf({
        policyNumber,
        planName: selectedQuote?.planName ?? 'CareShield Health',
        planCode: selectedQuote?.planCode ?? '',
        sumInsured: Number(selectedQuote?.sumInsured ?? 0),
        basePremium,
        loadingPercent: app.uwLoadingPercent ? Number(app.uwLoadingPercent) : undefined,
        loadingAmount: app.uwLoadingAmount ? Number(app.uwLoadingAmount) : undefined,
        finalPremium: Number(app.finalPremium ?? basePremium),
        gstAmount: gstAmt,
        totalPremiumPaid: totalPremium,
        policyStartDate: startDate.toLocaleDateString('en-IN'),
        policyEndDate: endDate.toLocaleDateString('en-IN'),
        insuredName: app.name ?? 'Insured',
        insuredDob: app.dob ?? '',
        insuredPan: app.pan ?? '',
        nomineeName: proposalData?.nominee_name ?? '',
        nomineeRelation: proposalData?.nominee_relation ?? '',
        exclusions: [],
        insurerName: 'CareShield Insurance Ltd.',
        irdaiRegistration: 'IRDAI/HLT/142/2026',
        gstin: '27AAACT1234F1Z5',
        registeredOffice: 'CareShield Tower, BKC, Mumbai 400051',
        grievanceEmail: 'grievance@careshield.in',
        grievancePhone: '1800-123-4567',
        contactPhone: '1800-123-4567',
        contactEmail: 'support@careshield.in',
        freeLookDays: 15,
      })

      const uploadResult = await uploadPolicyPdf({
        pdfBuffer: Buffer.from(pdfBytes),
        insurerSlug: 'careshield-india',
        policyNumber,
      })
      policyDocumentUrl = uploadResult.secure_url
      console.log(`[payment/verify] Policy PDF uploaded — public_id: ${uploadResult.public_id} | url: ${policyDocumentUrl}`)
    } catch (pdfErr) {
      console.error('[payment/verify] PDF generation/upload failed:', pdfErr)
    }

    const [policy] = await db
      .insert(policies)
      .values({
        applicationId: session.application_id,
        paymentId: paidPayment!.id,
        insurerId: app.insurerId,
        customerId: app.customerId ?? session.sub,
        quoteId: app.selectedQuoteId ?? undefined,
        policyNumber,
        planCode: selectedQuote?.planCode ?? '',
        planName: selectedQuote?.planName ?? '',
        sumInsured: (selectedQuote?.sumInsured ?? '0').toString(),
        basePremium: basePremium.toString(),
        finalPremium: basePremium.toString(),
        gstAmount: gstAmt.toString(),
        totalPremiumPaid: totalPremium.toString(),
        policyStartDate: startDate.toISOString().split('T')[0]!,
        policyEndDate: endDate.toISOString().split('T')[0]!,
        insuredName: app.name ?? '',
        insuredDob: app.dob ?? startDate.toISOString().split('T')[0]!,
        insuredPan: app.pan ?? '',
        nomineeName: proposalData?.nominee_name ?? '',
        nomineeRelation: proposalData?.nominee_relation ?? '',
        policyDocumentUrl,
        status: 'active',
        freeLookExpiresAt: new Date(startDate.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
      })
      .returning()

    await db
      .update(applications)
      .set({
        policyId: policy!.id,
        policyNumber,
        policyIssuedAt: new Date(),
        status: 'policy_issued',
        updatedAt: new Date(),
      })
      .where(eq(applications.id, session.application_id))

    // Send policy email
    if (app.email && app.name) {
      try {
        await sendPolicyEmail({
          email: app.email,
          name: app.name,
          policyNumber,
          planName: selectedQuote?.planName ?? 'CareShield Health',
          sumInsured: Number(selectedQuote?.sumInsured ?? 0),
          premium: Number(app.finalPremium ?? 0),
          startDate: startDate.toLocaleDateString('en-IN'),
          endDate: endDate.toLocaleDateString('en-IN'),
          policyDocUrl: policyDocumentUrl,
          insurerName: 'CareShield',
        })
      } catch (emailErr) {
        console.error('[payment/verify] Policy email failed:', emailErr)
      }
    }

    return NextResponse.json({ success: true, policy_number: policyNumber, next_step: 15 })
  } catch (err) {
    console.error('[payment/verify] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

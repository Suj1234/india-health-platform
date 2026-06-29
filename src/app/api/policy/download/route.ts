import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, policies, quotes } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { generatePolicyPdf } from '@/lib/pdf'

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app || app.status !== 'policy_issued' || !app.policyId) {
      return new NextResponse('Policy not found', { status: 404 })
    }

    const [policy] = await db
      .select()
      .from(policies)
      .where(eq(policies.id, app.policyId))
      .limit(1)

    if (!policy) return new NextResponse('Policy not found', { status: 404 })

    const [selectedQuote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.applicationId, session.application_id))
      .limit(1)

    const proposalData = app.proposalData as { nominee_name?: string; nominee_relation?: string } | null

    // Regenerate PDF fresh from DB — avoids Cloudinary access/auth issues entirely
    const pdfBuffer = await generatePolicyPdf({
      policyNumber: policy.policyNumber,
      planName: policy.planName ?? selectedQuote?.planName ?? 'CareShield Health',
      planCode: policy.planCode ?? selectedQuote?.planCode ?? '',
      sumInsured: Number(policy.sumInsured),
      basePremium: Number(policy.basePremium),
      loadingPercent: app.uwLoadingPercent ? Number(app.uwLoadingPercent) : undefined,
      loadingAmount: app.uwLoadingAmount ? Number(app.uwLoadingAmount) : undefined,
      finalPremium: Number(policy.finalPremium),
      gstAmount: Number(policy.gstAmount),
      totalPremiumPaid: Number(policy.totalPremiumPaid),
      policyStartDate: new Date(policy.policyStartDate!).toLocaleDateString('en-IN'),
      policyEndDate: new Date(policy.policyEndDate!).toLocaleDateString('en-IN'),
      insuredName: policy.insuredName ?? app.name ?? '',
      insuredDob: policy.insuredDob ?? app.dob ?? '',
      insuredPan: policy.insuredPan ?? app.pan ?? '',
      nomineeName: policy.nomineeName ?? proposalData?.nominee_name ?? '',
      nomineeRelation: policy.nomineeRelation ?? proposalData?.nominee_relation ?? '',
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

    const filename = `${policy.policyNumber}.pdf`
    console.log('[policy/download] Generated PDF:', filename, `(${pdfBuffer.byteLength} bytes)`)

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[policy/download] Error:', err)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

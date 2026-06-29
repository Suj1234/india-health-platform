export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, quotes, medicalQuestionnaires, idVerifications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI } from '@/lib/api-router'
import { mockStpDecision } from '@/lib/mock/stp.mock'
import { sendUnderReviewEmail, sendUwApprovedEmail } from '@/lib/brevo'
import { createPaymentLinkToken } from '@/lib/auth'
import type { IAdoreSummary, STPResult, QuoteOption } from '@/types/application'

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db.select().from(applications).where(eq(applications.id, session.application_id)).limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    if (!['proposal_submitted', 'docs_uploaded'].includes(app.status)) {
      return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 409 })
    }

    // Gather data for STP
    const iadoreSummary = app.iadoreSummary as IAdoreSummary | null
    const dob = app.dob ?? '1990-01-01'
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))

    const [medicalRecord] = await db
      .select()
      .from(medicalQuestionnaires)
      .where(eq(medicalQuestionnaires.applicationId, session.application_id))
      .limit(1)

    const [selectedQuote] = await db
      .select()
      .from(quotes)
      .where(eq(quotes.applicationId, session.application_id))
      .limit(1)

    const [panVerification] = await db
      .select()
      .from(idVerifications)
      .where(eq(idVerifications.applicationId, session.application_id))
      .limit(1)

    const stpPayload = {
      pan: app.pan ?? '',
      name: app.name ?? '',
      dob: app.dob ?? '',
      gender: app.gender ?? '',
      age,
      occupation_type: iadoreSummary?.occupation_type ?? 'other',
      annual_income: app.customerDeclaredIncome ?? 0,
      bureau_score: iadoreSummary?.bureau_score ?? null,
      litigation_count: iadoreSummary?.litigation_count ?? 0,
      company_is_hazardous: iadoreSummary?.company_is_hazardous ?? false,
      plan_code: selectedQuote?.planCode ?? '',
      plan_type: selectedQuote?.planType ?? 'standard',
      sum_insured: Number(selectedQuote?.sumInsured ?? 0),
      annual_premium: Number(selectedQuote?.annualPremium ?? 0),
      bmi: Number(medicalRecord?.bmi ?? 25),
      is_smoker: medicalRecord?.isSmoker ?? false,
      alcohol_consumption: medicalRecord?.alcoholConsumption ?? 'none',
      ped_conditions: (medicalRecord?.riskFlags as string[] | null) ?? [],
      risk_score: Number(medicalRecord?.riskScore ?? 80),
      pan_verified: panVerification?.verificationStatus === 'verified',
      pan_match_score: Number(panVerification?.matchScore ?? 0),
    }

    const stpInput = {
      riskScore: stpPayload.risk_score,
      hasPed: stpPayload.ped_conditions.length > 0,
      isSmoker: stpPayload.is_smoker,
      litigation_count: stpPayload.litigation_count,
      company_is_hazardous: stpPayload.company_is_hazardous,
      bmi: stpPayload.bmi,
      sum_insured: stpPayload.sum_insured,
      age: stpPayload.age,
      bureau_score: stpPayload.bureau_score,
    }

    const stpResult = await callExternalAPI<STPResult>({
      insurerId: app.insurerId,
      apiName: 'stp',
      realFn: async () => mockStpDecision(stpInput),
      mockFn: () => mockStpDecision(stpInput),
    })

    const approved = stpResult.decision === 'APPROVED'

    await db
      .update(applications)
      .set({
        stpPayload: stpPayload as unknown as Record<string, unknown>,
        stpResult: stpResult as unknown as Record<string, unknown>,
        stpDecision: approved ? 'approved' : 'referred',
        stpScore: stpResult.stp_score.toString(),
        stpMessage: stpResult.message,
        stpEvaluatedAt: new Date(),
        status: approved ? 'stp_evaluated' : 'uw_pending',
        currentStep: 12,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, session.application_id))

    // Send emails
    if (!approved && app.email && app.name) {
      try {
        await sendUnderReviewEmail({
          email: app.email,
          name: app.name,
          applicationNumber: app.applicationNumber,
          planName: selectedQuote?.planName ?? 'Health Insurance',
          insurerName: 'CareShield',
          contactEmail: 'support@careshield.in',
        })
      } catch (emailErr) {
        console.error('[stp] Email failed:', emailErr)
      }
    }

    return NextResponse.json({
      success: true,
      decision: approved ? 'approved' : 'referred',
      stp_score: stpResult.stp_score,
      message: stpResult.message,
    })
  } catch (err) {
    console.error('[journey/stp] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

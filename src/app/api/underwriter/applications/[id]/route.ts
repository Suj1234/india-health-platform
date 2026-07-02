import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import {
  applications,
  quotes,
  medicalQuestionnaires,
  documents,
  idVerifications,
  biometricSessions,
  underwriterActions,
  users,
} from '@/lib/db/schema'
import { getStaffSession } from '@/lib/auth'
import { getSignedUrl } from '@/lib/cloudinary'
import type { IAdoreSummary, IncomeProfile } from '@/types/application'
import type { IAdoreReport } from '@/lib/mock/iadore.mock'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getStaffSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const [app] = await db.select().from(applications).where(eq(applications.id, id)).limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    if (session.role !== 'superadmin' && session.insurer_id && app.insurerId !== session.insurer_id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const [selectedQuote] = await db
      .select()
      .from(quotes)
      .where(and(eq(quotes.applicationId, id), eq(quotes.isSelected, true)))
      .limit(1)

    const [medical] = await db
      .select()
      .from(medicalQuestionnaires)
      .where(eq(medicalQuestionnaires.applicationId, id))
      .limit(1)

    const docs = await db
      .select()
      .from(documents)
      .where(eq(documents.applicationId, id))

    const idVerifs = await db
      .select()
      .from(idVerifications)
      .where(eq(idVerifications.applicationId, id))

    const [biometric] = await db
      .select()
      .from(biometricSessions)
      .where(eq(biometricSessions.applicationId, id))
      .limit(1)

    const uwHistory = await db
      .select({
        id: underwriterActions.id,
        action: underwriterActions.action,
        customerMessage: underwriterActions.customerMessage,
        internalNotes: underwriterActions.internalNotes,
        loadingType: underwriterActions.loadingType,
        loadingPercent: underwriterActions.loadingPercent,
        revisedPremium: underwriterActions.revisedPremium,
        exclusions: underwriterActions.exclusions,
        rejectionReasonCode: underwriterActions.rejectionReasonCode,
        requestedDocuments: underwriterActions.requestedDocuments,
        requestedTests: underwriterActions.requestedTests,
        createdAt: underwriterActions.createdAt,
        underwriterName: users.name,
      })
      .from(underwriterActions)
      .leftJoin(users, eq(underwriterActions.underwriterId, users.id))
      .where(eq(underwriterActions.applicationId, id))
      .orderBy(underwriterActions.createdAt)

    // Generate signed Cloudinary URLs for documents
    const docsWithUrls = await Promise.all(
      docs.map(async (doc) => {
        let signedUrl = doc.cloudinaryUrl
        try {
          signedUrl = await getSignedUrl(doc.cloudinaryUrl)
        } catch {}
        return { ...doc, signedUrl }
      })
    )

    const iadore = app.iadoreSummary as IAdoreSummary | null
    const iadoreReport = app.iadoreReport as IAdoreReport | null
    const income = app.incomeProfile as IncomeProfile | null
    const proposal = app.proposalData as Record<string, unknown> | null

    const dob = app.dob ? new Date(app.dob) : null
    const age = dob
      ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      : null

    return NextResponse.json({
      success: true,
      application: {
        id: app.id,
        application_number: app.applicationNumber,
        status: app.status,
        current_step: app.currentStep,
        created_at: app.createdAt,
        updated_at: app.updatedAt,
        stp_decision: app.stpDecision,
        stp_score: app.stpScore ? Number(app.stpScore) : null,
        stp_message: app.stpMessage,
        stp_evaluated_at: app.stpEvaluatedAt,
        uw_decision: app.uwDecision,
        uw_decided_at: app.uwDecidedAt,
        uw_loading_percent: app.uwLoadingPercent,
        uw_revised_premium: app.uwRevisedPremium,
        uw_exclusions: app.uwExclusions,
        uw_rejection_reason: app.uwRejectionReason,
        final_premium: app.finalPremium ? Number(app.finalPremium) : null,
      },
      customer: {
        name: app.name,
        dob: app.dob,
        age,
        gender: app.gender,
        pan: app.pan,
        mobile: app.mobile,
        email: app.email,
        address: iadore?.address ?? null,
        occupation_type: iadore?.occupation_type ?? null,
        employer_name: iadore?.employer_name ?? null,
        bureau_score: iadore?.bureau_score ?? null,
        company_checks: {
          hazardous_biz: iadore?.company_is_hazardous ?? false,
          gst_registered: iadore?.gst_registered ?? false,
          litigation_count: iadore?.litigation_count ?? 0,
        },
      },
      income: {
        customer_declared: app.customerDeclaredIncome,
        sources: income?.sources ?? {},
        selected_annual_income: income?.selected_annual_income ?? null,
        cross_analysis: income?.cross_analysis ?? [],
      },
      proposal: {
        marital_status: proposal?.['marital_status'] ?? null,
        nominee_name: proposal?.['nominee_name'] ?? null,
        nominee_relation: proposal?.['nominee_relation'] ?? null,
        nominee_dob: proposal?.['nominee_dob'] ?? null,
      },
      selected_quote: selectedQuote
        ? {
            id: selectedQuote.id,
            plan_type: selectedQuote.planType,
            plan_name: selectedQuote.planName,
            plan_code: selectedQuote.planCode,
            sum_insured: Number(selectedQuote.sumInsured),
            annual_premium: Number(selectedQuote.annualPremium),
            gst_amount: Number(selectedQuote.gstAmount),
            total_premium: Number(selectedQuote.totalPremium),
            riders: selectedQuote.riders,
            benefits: selectedQuote.benefits,
          }
        : null,
      medical: medical
        ? {
            height_cm: medical.heightCm ? Number(medical.heightCm) : null,
            weight_kg: medical.weightKg ? Number(medical.weightKg) : null,
            bmi: medical.bmi ? Number(medical.bmi) : null,
            is_smoker: medical.isSmoker,
            cigarettes_per_day: medical.cigarettesPerDay,
            smoking_years: medical.smokingYears,
            alcohol_consumption: medical.alcoholConsumption,
            has_diabetes: medical.hasDiabetes,
            has_hypertension: medical.hasHypertension,
            has_heart_disease: medical.hasHeartDisease,
            has_cancer: medical.hasCancer,
            has_kidney_disease: medical.hasKidneyDisease,
            has_liver_disease: medical.hasLiverDisease,
            has_neurological_disorder: medical.hasNeurologicalDisorder,
            has_thyroid_disorder: medical.hasThyroidDisorder,
            has_hiv_aids: medical.hasHivAids,
            has_mental_health: medical.hasMentalHealth,
            has_respiratory_disorder: medical.hasRespiratoryDisorder,
            has_musculoskeletal: medical.hasMusculoskeletal,
            has_other_condition: medical.hasOtherCondition,
            other_condition_details: medical.otherConditionDetails,
            ped_details: medical.pedDetails,
            has_had_surgery: medical.hasHadSurgery,
            surgery_details: medical.surgeryDetails,
            has_family_history: medical.hasFamilyHistory,
            family_history: medical.familyHistory,
            is_on_medication: medical.isOnMedication,
            current_medications: medical.currentMedications,
            has_existing_insurance: medical.hasExistingHealthInsurance,
            had_claim_last_3_years: medical.hadClaimLast3Years,
            was_ever_declined: medical.wasEverDeclined,
            risk_flags: medical.riskFlags,
            risk_score: medical.riskScore,
          }
        : null,
      documents: docsWithUrls.map((d) => ({
        id: d.id,
        document_type: d.documentType,
        category: d.category,
        file_name: d.fileName,
        mime_type: d.mimeType,
        file_size_bytes: d.fileSizeBytes,
        signed_url: d.signedUrl,
        ocr_status: d.ocrStatus,
        ocr_result: d.ocrResult,
        ocr_confidence: d.ocrConfidence,
        uploaded_at: d.uploadedAt,
      })),
      id_verifications: idVerifs.map((v) => ({
        id_type: v.idType,
        id_value: v.idValue,
        verification_status: v.verificationStatus,
        match_score: v.matchScore,
        verified_name: v.verifiedName,
        is_mock: v.isMock,
        verified_at: v.verifiedAt,
      })),
      biometrics: biometric
        ? {
            session_type: biometric.sessionType,
            status: biometric.status,
            result: biometric.result,
            completed_at: biometric.completedAt,
            is_mock: biometric.isMock,
          }
        : null,
      iadore_report: iadoreReport ?? null,
      uw_history: uwHistory.map((h) => ({
        id: h.id,
        action: h.action,
        customer_message: h.customerMessage,
        internal_notes: h.internalNotes,
        loading_type: h.loadingType,
        loading_percent: h.loadingPercent,
        revised_premium: h.revisedPremium,
        exclusions: h.exclusions,
        rejection_reason: h.rejectionReasonCode,
        requested_documents: h.requestedDocuments,
        requested_tests: h.requestedTests,
        created_at: h.createdAt,
        underwriter_name: h.underwriterName,
      })),
    })
  } catch (err) {
    console.error('[underwriter/applications/[id]] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

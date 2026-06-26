import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { insurers, users, applications, quotes, medicalQuestionnaires } from '@/lib/db/schema'
import type { IAdoreReport } from '@/lib/mock/iadore.mock'

const APP_NUMBERS = ['CS-2025-000101', 'CS-2025-000102', 'CS-2025-000103']

export async function GET() {
  return seedUw()
}

export async function POST() {
  return seedUw()
}

async function seedUw() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: false, error: 'Not available in production' }, { status: 403 })
  }

  try {
    // Resolve insurer
    const [insurer] = await db.select({ id: insurers.id }).from(insurers)
      .where(eq(insurers.slug, 'careshield-india')).limit(1)
    if (!insurer) {
      return NextResponse.json({ success: false, error: 'Insurer not found. Restart the dev server first.' }, { status: 404 })
    }
    const insurerId = insurer.id

    // Resolve underwriter
    const [uw] = await db.select({ id: users.id }).from(users)
      .where(eq(users.email, 'uw@careshield.in')).limit(1)
    const uwId = uw?.id ?? null

    // Skip if already seeded
    const existing = await db.select({ id: applications.id }).from(applications)
      .where(eq(applications.applicationNumber, APP_NUMBERS[0]!)).limit(1)
    if (existing.length > 0) {
      return NextResponse.json({ success: true, message: 'Already seeded — nothing to do.' })
    }

    // ── Case 1: Rajesh Kumar — uw_pending, high risk ──────────────────────
    const rajeshIAdore: IAdoreReport = {
      safetyScore: 32,
      safetyLevel: 'Very High',
      reportDate: new Date(Date.now() - 2 * 86400000).toISOString().split('T')[0]!,
      identityChecks: { panVerification: 'pass', nameMatch: 'pass', dobMatch: 'pass', aadhaarSeeding: 'pass', mobileAuth: 'pass', emailAuth: 'warn' },
      financialEvaluation: {
        riskLevel: 'Medium', creditScore: 720, creditScoreLabel: 'Good',
        annualIncomeFromBSA: 840000, avgMonthlyInflow: 70000,
        imputedIncome: 800000, incomeDeclared: 900000, incomeInconsistency: 'mild', bankName: 'HDFC Bank',
      },
      lifestyleAnalysis: {
        riskLevel: 'High', tobaccoSpending: true, alcoholSpending: true, gamblingTransactions: false,
        flagDetails: ['Tobacco/cigarette purchases detected (8+ txns/month)', 'Alcohol merchant transactions detected'],
      },
      medicalEvaluation: {
        bmi: 29.05, bmiCategory: 'Overweight',
        bloodPressureSystolic: 148, bloodPressureDiastolic: 94, bpStatus: 'high',
        pulseRate: 88, faceBiometricsPass: true,
        labResults: [
          { test: 'HbA1c', value: '8.2', unit: '%', referenceRange: '< 5.7', status: 'high' },
          { test: 'Fasting Blood Glucose', value: '152', unit: 'mg/dL', referenceRange: '70–99', status: 'high' },
          { test: 'Systolic BP', value: '148', unit: 'mmHg', referenceRange: '< 120', status: 'high' },
          { test: 'Total Cholesterol', value: '218', unit: 'mg/dL', referenceRange: '< 200', status: 'high' },
          { test: 'Hemoglobin', value: '13.8', unit: 'g/dL', referenceRange: '13.5–17.5', status: 'normal' },
        ],
        radiologyResults: [],
      },
      consistencyCheck: { faceMatchScore: 91.2, livenessScore: 84.6, documentConsistency: 'pass', addressConsistency: 'pass' },
      litigationCheck: { totalCases: 0, civilCases: 0, criminalCases: 0, cases: [] },
      fraudCheck: { ipConsistency: 'pass', deviceFingerprint: 'pass', panDatabaseCrosscheck: 'pass', behavioralAnomaly: false, flags: [] },
      insurancePortfolio: { existingPolicies: [], priorHealthClaims: 0, hasLapsedPolicy: false },
      uwRecommendation: {
        decision: 'load', loadingPercent: 40, loadingRange: '35–50%',
        keyTriggers: ['Active smoker (8 cig/day, 15 yrs)', 'Diabetes (HbA1c 8.2%)', 'Hypertension (BP 148/94)', 'Age > 50', 'High sum insured ₹10L'],
        notes: 'High-risk profile. Diabetes uncontrolled (HbA1c 8.2%) combined with hypertension and long-term smoking history. Recommend 40% loading with mandatory exclusion of cardiovascular complications.',
      },
    }

    const [rajesh] = await db.insert(applications).values({
      applicationNumber: APP_NUMBERS[0]!,
      insurerId,
      mobile: '9876500101',
      name: 'Rajesh Kumar',
      email: 'rajesh.kumar.sample@example.com',
      pan: 'BSPKR1234A',
      dob: '1973-04-15',
      gender: 'male',
      status: 'uw_pending',
      currentStep: 9,
      stpDecision: 'referred',
      stpScore: '31',
      stpMessage: 'Referred due to: pre-existing medical conditions, age above 50 with high sum insured.',
      stpEvaluatedAt: new Date(Date.now() - 2 * 86400000),
      createdAt: new Date(Date.now() - 2 * 86400000),
      updatedAt: new Date(Date.now() - 2 * 86400000),
      proposalData: { marital_status: 'married', nominee_name: 'Sunita Kumar', nominee_relation: 'spouse' },
      iadoreSummary: { occupation_type: 'salaried', bureau_score: 720, litigation_count: 0, company_is_hazardous: false },
      iadoreReport: rajeshIAdore,
    }).returning()

    await db.insert(quotes).values({
      applicationId: rajesh!.id, insurerId,
      planType: 'premium', planName: 'CareShield Premier', planCode: 'CSP-2025',
      sumInsured: '1000000', annualPremium: '18500', gstAmount: '3330', totalPremium: '21830',
      isSelected: true, benefits: [], exclusions: [], waitingPeriods: [], riders: [],
    })

    await db.insert(medicalQuestionnaires).values({
      applicationId: rajesh!.id,
      heightCm: '168', weightKg: '82', bmi: '29.05',
      isSmoker: true, cigarettesPerDay: 8, smokingYears: 15,
      alcoholConsumption: 'occasional',
      hasDiabetes: true, hasHypertension: true,
      hasFamilyHistory: true,
      familyHistory: [{ relation: 'father', condition: 'Heart disease' }],
      riskFlags: ['smoker', 'ped_diabetes', 'ped_hypertension', 'has_ped'],
      riskScore: 60, biometricRecommended: true, hasHadSurgery: false,
    })

    // ── Case 2: Priya Menon — uw_pending, heart disease ───────────────────
    const priyaIAdore: IAdoreReport = {
      safetyScore: 28,
      safetyLevel: 'Very High',
      reportDate: new Date(Date.now() - 1 * 86400000).toISOString().split('T')[0]!,
      identityChecks: { panVerification: 'pass', nameMatch: 'pass', dobMatch: 'pass', aadhaarSeeding: 'pass', mobileAuth: 'pass', emailAuth: 'pass' },
      financialEvaluation: {
        riskLevel: 'Medium', creditScore: 680, creditScoreLabel: 'Fair',
        annualIncomeFromBSA: 1420000, avgMonthlyInflow: 118333,
        imputedIncome: 1350000, incomeDeclared: 1800000, incomeInconsistency: 'mild', bankName: 'Axis Bank',
      },
      lifestyleAnalysis: {
        riskLevel: 'Low', tobaccoSpending: false, alcoholSpending: false, gamblingTransactions: false,
        flagDetails: [],
      },
      medicalEvaluation: {
        bmi: 33.25, bmiCategory: 'Obese',
        bloodPressureSystolic: 118, bloodPressureDiastolic: 76, bpStatus: 'normal',
        pulseRate: 92, faceBiometricsPass: true,
        labResults: [
          { test: 'Total Cholesterol', value: '262', unit: 'mg/dL', referenceRange: '< 200', status: 'high' },
          { test: 'LDL Cholesterol', value: '178', unit: 'mg/dL', referenceRange: '< 100', status: 'high' },
          { test: 'Troponin I', value: '0.08', unit: 'ng/mL', referenceRange: '< 0.04', status: 'high' },
          { test: 'Hemoglobin', value: '11.4', unit: 'g/dL', referenceRange: '12.0–15.5', status: 'low' },
          { test: 'Fasting Blood Glucose', value: '94', unit: 'mg/dL', referenceRange: '70–99', status: 'normal' },
        ],
        radiologyResults: [
          { test: 'Chest X-Ray', finding: 'Mild cardiomegaly noted', status: 'abnormal' },
          { test: 'ECG', finding: 'ST-segment changes consistent with prior ischemic event', status: 'abnormal' },
        ],
      },
      consistencyCheck: { faceMatchScore: 94.3, livenessScore: 88.1, documentConsistency: 'pass', addressConsistency: 'pass' },
      litigationCheck: { totalCases: 0, civilCases: 0, criminalCases: 0, cases: [] },
      fraudCheck: { ipConsistency: 'pass', deviceFingerprint: 'pass', panDatabaseCrosscheck: 'pass', behavioralAnomaly: false, flags: [] },
      insurancePortfolio: { existingPolicies: [], priorHealthClaims: 0, hasLapsedPolicy: false },
      uwRecommendation: {
        decision: 'load', loadingPercent: 55, loadingRange: '50–70%',
        keyTriggers: ['Cardiac history (elevated Troponin)', 'Obesity (BMI 33.2)', 'High LDL cholesterol (178 mg/dL)', 'ECG abnormality', 'Cardiomegaly on X-Ray'],
        notes: 'Significant cardiac risk indicators. Elevated Troponin and ECG changes suggest prior ischemic event. High BMI compounds cardiovascular risk. Recommend 55% loading with cardiac exclusions for 24 months.',
      },
    }

    const [priya] = await db.insert(applications).values({
      applicationNumber: APP_NUMBERS[1]!,
      insurerId,
      mobile: '9876500102',
      name: 'Priya Menon',
      email: 'priya.menon.sample@example.com',
      pan: 'DXKPM5678B',
      dob: '1987-11-22',
      gender: 'female',
      status: 'uw_pending',
      currentStep: 9,
      stpDecision: 'referred',
      stpScore: '42',
      stpMessage: 'Referred due to: pre-existing cardiac condition.',
      stpEvaluatedAt: new Date(Date.now() - 1 * 86400000),
      createdAt: new Date(Date.now() - 1 * 86400000),
      updatedAt: new Date(Date.now() - 1 * 86400000),
      proposalData: { marital_status: 'single', nominee_name: 'Lakshmi Menon', nominee_relation: 'parent' },
      iadoreSummary: { occupation_type: 'self_employed', bureau_score: 680, litigation_count: 0, company_is_hazardous: false },
      iadoreReport: priyaIAdore,
    }).returning()

    await db.insert(quotes).values({
      applicationId: priya!.id, insurerId,
      planType: 'standard', planName: 'CareShield Standard', planCode: 'CSS-2025',
      sumInsured: '500000', annualPremium: '11200', gstAmount: '2016', totalPremium: '13216',
      isSelected: true, benefits: [], exclusions: [], waitingPeriods: [], riders: [],
    })

    await db.insert(medicalQuestionnaires).values({
      applicationId: priya!.id,
      heightCm: '157', weightKg: '82', bmi: '33.25',
      isSmoker: false, alcoholConsumption: 'none',
      hasHeartDisease: true,
      riskFlags: ['bmi_over_32', 'ped_heart', 'has_ped'],
      riskScore: 55, biometricRecommended: true, hasHadSurgery: false, hasFamilyHistory: false,
    })

    // ── Case 3: Ankit Sharma — uw_approved with loading ───────────────────
    const basePremium = 14800
    const loadingAmt = Math.round(basePremium * 0.15)

    const ankitIAdore: IAdoreReport = {
      safetyScore: 58,
      safetyLevel: 'High',
      reportDate: new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]!,
      identityChecks: { panVerification: 'pass', nameMatch: 'pass', dobMatch: 'pass', aadhaarSeeding: 'pass', mobileAuth: 'pass', emailAuth: 'pass' },
      financialEvaluation: {
        riskLevel: 'Low', creditScore: 755, creditScoreLabel: 'Excellent',
        annualIncomeFromBSA: 2160000, avgMonthlyInflow: 180000,
        imputedIncome: 2100000, incomeDeclared: 2400000, incomeInconsistency: 'none', bankName: 'ICICI Bank',
      },
      lifestyleAnalysis: {
        riskLevel: 'Low', tobaccoSpending: false, alcoholSpending: true, gamblingTransactions: false,
        flagDetails: ['Occasional alcohol merchant transactions (2–3 txns/month)'],
      },
      medicalEvaluation: {
        bmi: 25.77, bmiCategory: 'Normal',
        bloodPressureSystolic: 118, bloodPressureDiastolic: 76, bpStatus: 'normal',
        pulseRate: 74, faceBiometricsPass: true,
        labResults: [
          { test: 'TSH (Thyroid)', value: '6.8', unit: 'mIU/L', referenceRange: '0.4–4.0', status: 'high' },
          { test: 'T4 (Thyroxine)', value: '0.72', unit: 'ng/dL', referenceRange: '0.8–1.8', status: 'low' },
          { test: 'Total Cholesterol', value: '192', unit: 'mg/dL', referenceRange: '< 200', status: 'normal' },
          { test: 'Fasting Blood Glucose', value: '88', unit: 'mg/dL', referenceRange: '70–99', status: 'normal' },
          { test: 'Hemoglobin', value: '14.6', unit: 'g/dL', referenceRange: '13.5–17.5', status: 'normal' },
        ],
        radiologyResults: [],
      },
      consistencyCheck: { faceMatchScore: 95.97, livenessScore: 80.88, documentConsistency: 'pass', addressConsistency: 'pass' },
      litigationCheck: { totalCases: 0, civilCases: 0, criminalCases: 0, cases: [] },
      fraudCheck: { ipConsistency: 'pass', deviceFingerprint: 'pass', panDatabaseCrosscheck: 'pass', behavioralAnomaly: false, flags: [] },
      insurancePortfolio: {
        existingPolicies: [{ type: 'Motor', insurer: 'New India Assurance', sumInsured: 500000, status: 'active' }],
        priorHealthClaims: 0, hasLapsedPolicy: false,
      },
      uwRecommendation: {
        decision: 'load', loadingPercent: 15, loadingRange: '10–20%',
        keyTriggers: ['Hypothyroidism (TSH 6.8 mIU/L)', 'On thyroid medication (Levothyroxine)'],
        notes: 'Thyroid disorder well-controlled on Levothyroxine. All other parameters within normal range. Low financial and lifestyle risk. Approved with 15% loading; annual thyroid review recommended.',
      },
    }

    const [ankit] = await db.insert(applications).values({
      applicationNumber: APP_NUMBERS[2]!,
      insurerId,
      mobile: '9876500103',
      name: 'Ankit Sharma',
      email: 'ankit.sharma.sample@example.com',
      pan: 'CZRPS9012C',
      dob: '1980-07-03',
      gender: 'male',
      status: 'uw_approved',
      currentStep: 10,
      stpDecision: 'referred',
      stpScore: '58',
      stpMessage: 'Referred due to: pre-existing medical conditions.',
      stpEvaluatedAt: new Date(Date.now() - 5 * 86400000),
      uwDecision: 'approved_with_loading',
      uwLoadingPercent: '15',
      uwLoadingAmount: String(loadingAmt),
      uwRevisedPremium: String(basePremium + loadingAmt),
      uwNotes: 'Thyroid disorder well-controlled. Approved with 15% loading.',
      uwDecidedAt: new Date(Date.now() - 3 * 3600000),
      uwDecidedBy: uwId ?? undefined,
      finalPremium: String(basePremium + loadingAmt),
      createdAt: new Date(Date.now() - 5 * 86400000),
      updatedAt: new Date(Date.now() - 3 * 3600000),
      proposalData: { marital_status: 'married', nominee_name: 'Rekha Sharma', nominee_relation: 'spouse' },
      iadoreSummary: { occupation_type: 'salaried', bureau_score: 755, litigation_count: 0, company_is_hazardous: false },
      iadoreReport: ankitIAdore,
    }).returning()

    await db.insert(quotes).values({
      applicationId: ankit!.id, insurerId,
      planType: 'standard', planName: 'CareShield Standard', planCode: 'CSS-2025',
      sumInsured: '750000', annualPremium: String(basePremium),
      gstAmount: String(Math.round(basePremium * 0.18)),
      totalPremium: String(Math.round(basePremium * 1.18)),
      isSelected: true, benefits: [], exclusions: [], waitingPeriods: [], riders: [],
    })

    await db.insert(medicalQuestionnaires).values({
      applicationId: ankit!.id,
      heightCm: '174', weightKg: '78', bmi: '25.77',
      isSmoker: false, alcoholConsumption: 'occasional',
      hasThyroidDisorder: true,
      riskFlags: ['ped_thyroid', 'has_ped'],
      riskScore: 85, biometricRecommended: false, hasHadSurgery: false, hasFamilyHistory: false,
    })

    return NextResponse.json({
      success: true,
      message: 'Seeded 3 sample UW applications.',
      cases: [
        { name: 'Rajesh Kumar', status: 'uw_pending', stp_score: 31 },
        { name: 'Priya Menon',  status: 'uw_pending', stp_score: 42 },
        { name: 'Ankit Sharma', status: 'uw_approved', stp_score: 58 },
      ],
    })
  } catch (err) {
    console.error('[dev/seed-uw]', err)
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}

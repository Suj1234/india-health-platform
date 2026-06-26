import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, medicalQuestionnaires } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'

// Flat per-member schema matching what apply-step3 sends
const memberHealthSchema = z.object({
  member_id: z.string(),
  relation: z.string(),
  height_cm: z.number().nullable(),
  weight_kg: z.number().nullable(),
  is_smoker: z.boolean().default(false),
  alcohol_consumption: z.enum(['none', 'occasional', 'regular']).default('none'),
  uses_tobacco: z.boolean().default(false),
  has_diabetes: z.boolean().default(false),
  has_hypertension: z.boolean().default(false),
  has_heart_disease: z.boolean().default(false),
  has_cancer: z.boolean().default(false),
  has_kidney_disease: z.boolean().default(false),
  has_liver_disease: z.boolean().default(false),
  has_thyroid: z.boolean().default(false),
  has_asthma: z.boolean().default(false),
  has_joint_disorder: z.boolean().default(false),
  has_neurological: z.boolean().default(false),
  has_family_heart_disease: z.boolean().default(false),
  condition_details: z.record(z.string()).optional(),
  nuralx_vitals: z.object({
    heart_rate: z.number(),
    respiratory_rate: z.number(),
    blood_pressure: z.string(),
    oxygen_saturation: z.number(),
    stress_index: z.string(),
    bmi_risk: z.string(),
  }).nullable().optional(),
  declaration_accurate: z.literal(true),
})

const schema = z.object({
  members: z.array(memberHealthSchema).min(1),
})

function computeBmi(height_cm: number | null, weight_kg: number | null): number | null {
  if (!height_cm || !weight_kg) return null
  return parseFloat((weight_kg / Math.pow(height_cm / 100, 2)).toFixed(2))
}

function computeMemberRisk(m: z.infer<typeof memberHealthSchema>) {
  const bmi = computeBmi(m.height_cm, m.weight_kg)
  const riskFlags: string[] = []

  if (m.is_smoker) riskFlags.push('smoker')
  if (m.alcohol_consumption === 'regular') riskFlags.push('alcohol_regular')
  if (m.uses_tobacco) riskFlags.push('tobacco')
  if (bmi && bmi > 32.5) riskFlags.push('bmi_over_32')
  else if (bmi && bmi > 27.5) riskFlags.push('bmi_over_27')
  if (m.has_diabetes) riskFlags.push('ped_diabetes')
  if (m.has_hypertension) riskFlags.push('ped_hypertension')
  if (m.has_heart_disease) riskFlags.push('ped_heart')
  if (m.has_cancer) riskFlags.push('ped_cancer')
  if (m.has_kidney_disease) riskFlags.push('ped_kidney')
  if (m.has_family_heart_disease) riskFlags.push('family_cardiac_history')

  const pedCount = [
    m.has_diabetes, m.has_hypertension, m.has_heart_disease,
    m.has_cancer, m.has_kidney_disease, m.has_liver_disease,
    m.has_thyroid, m.has_asthma,
  ].filter(Boolean).length
  if (pedCount > 2) riskFlags.push('multiple_ped')

  let riskScore = 100
  if (m.is_smoker) riskScore -= 10
  if (m.alcohol_consumption === 'regular') riskScore -= 5
  if (m.uses_tobacco) riskScore -= 8
  if (bmi && bmi > 32.5) riskScore -= 15
  else if (bmi && bmi > 27.5) riskScore -= 5
  if (m.has_diabetes) riskScore -= 15
  if (m.has_heart_disease) riskScore -= 20
  if (m.has_cancer) riskScore -= 30
  if (m.has_kidney_disease) riskScore -= 20
  if (pedCount > 2) riskScore -= 10
  if (m.has_family_heart_disease) riskScore -= 5
  riskScore = Math.max(0, riskScore)

  return { bmi, riskFlags, riskScore, pedCount }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 })
    }

    const [app] = await db.select().from(applications).where(eq(applications.id, session.application_id)).limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    const allowedStatuses = ['profiling_started', 'profiling_done', 'members_added']
    if (!allowedStatuses.includes(app.status)) {
      return NextResponse.json({ success: false, error: 'Invalid application status', code: 'INVALID_STATUS' }, { status: 409 })
    }

    const { members } = parsed.data

    // Compute per-member risk; take worst-case (lowest) for overall risk score
    const memberResults = members.map((m) => ({ ...m, ...computeMemberRisk(m) }))

    const overallRiskScore = Math.min(...memberResults.map((m) => m.riskScore))
    const allRiskFlags = [...new Set(memberResults.flatMap((m) => m.riskFlags))]
    const totalPedCount = memberResults.reduce((sum, m) => sum + m.pedCount, 0)

    const dob = app.dob ?? '1990-01-01'
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    const biometric_recommended =
      age > 50 || totalPedCount > 0 || (app.initialSumInsured ?? 0) > 2000000 || overallRiskScore < 60

    // Primary member for single-record fields: proposer if insured, else first member
    const primaryMember = memberResults.find((m) => m.relation === 'self') ?? memberResults[0]

    // Check if a record already exists for this application
    const [existing] = await db
      .select({ id: medicalQuestionnaires.id })
      .from(medicalQuestionnaires)
      .where(eq(medicalQuestionnaires.applicationId, session.application_id))
      .limit(1)

    const medicalValues = {
      heightCm: primaryMember.height_cm?.toString() ?? null,
      weightKg: primaryMember.weight_kg?.toString() ?? null,
      bmi: primaryMember.bmi?.toString() ?? null,
      isSmoker: primaryMember.is_smoker,
      alcoholConsumption: primaryMember.alcohol_consumption,
      hasDiabetes: primaryMember.has_diabetes,
      hasHypertension: primaryMember.has_hypertension,
      hasHeartDisease: primaryMember.has_heart_disease,
      hasCancer: primaryMember.has_cancer,
      hasKidneyDisease: primaryMember.has_kidney_disease,
      hasLiverDisease: primaryMember.has_liver_disease,
      hasThyroidDisorder: primaryMember.has_thyroid,
      hasRespiratoryDisorder: primaryMember.has_asthma,
      hasMusculoskeletal: primaryMember.has_joint_disorder,
      hasNeurologicalDisorder: primaryMember.has_neurological,
      hasFamilyHistory: primaryMember.has_family_heart_disease,
      familyHistory: primaryMember.has_family_heart_disease
        ? [{ condition: 'Heart disease', relationship: 'Parent/Sibling' }] as unknown as Record<string, unknown>[]
        : [],
      memberHealthDetails: memberResults as unknown as Record<string, unknown>[],
      coversFamilyMembers: members.length > 1,
      riskFlags: allRiskFlags as unknown as string[],
      riskScore: overallRiskScore,
      biometricRecommended: biometric_recommended,
      updatedAt: new Date(),
    }

    if (existing) {
      await db
        .update(medicalQuestionnaires)
        .set(medicalValues)
        .where(eq(medicalQuestionnaires.applicationId, session.application_id))
    } else {
      await db.insert(medicalQuestionnaires).values({
        applicationId: session.application_id,
        ...medicalValues,
      })
    }

    await db
      .update(applications)
      .set({ status: 'medical_done', currentStep: 4, updatedAt: new Date() })
      .where(eq(applications.id, session.application_id))

    return NextResponse.json({
      success: true,
      risk_score: overallRiskScore,
      biometric_recommended,
      next_step: 4,
    })
  } catch (err) {
    console.error('[journey/medical] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

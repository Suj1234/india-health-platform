/**
 * Seed UW sample applications — run once to populate the underwriter dashboard
 * Usage: npm run db:seed-uw
 *
 * Creates:
 *   1. Rajesh Kumar (Age 52)   — uw_pending,  PED: Hypertension + Diabetes, Smoker
 *   2. Priya Menon  (Age 38)   — uw_pending,  PED: Heart disease, BMI 33
 *   3. Ankit Sharma (Age 45)   — uw_approved, loaded premium (+15%)
 */
import { eq, and } from 'drizzle-orm'
import { createDb } from '../src/lib/db/factory'
import {
  insurers,
  users,
  applications,
  quotes,
  medicalQuestionnaires,
} from '../src/lib/db/schema'

const APP_NUMBERS = ['CS-2025-000101', 'CS-2025-000102', 'CS-2025-000103']

async function main() {
  const db = await createDb()
  console.log('🌱  Seeding UW sample applications…\n')

  // ── Resolve insurer ───────────────────────────────────────────────────────
  const [insurer] = await db
    .select({ id: insurers.id })
    .from(insurers)
    .where(eq(insurers.slug, 'careshield-india'))
    .limit(1)

  if (!insurer) {
    console.error('❌  Insurer "careshield-india" not found. Run `npm run db:seed` first.')
    process.exit(1)
  }
  const insurerId = insurer.id

  // ── Resolve underwriter (for the approved case) ───────────────────────────
  const [uw] = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.email, 'uw@careshield.in'), eq(users.role, 'underwriter')))
    .limit(1)

  const uwId = uw?.id ?? null

  // ── Skip if already seeded ────────────────────────────────────────────────
  const existing = await db
    .select({ id: applications.id })
    .from(applications)
    .where(eq(applications.applicationNumber, APP_NUMBERS[0]!))
    .limit(1)

  if (existing.length > 0) {
    console.log('ℹ️   Sample applications already seeded. Nothing to do.')
    process.exit(0)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CASE 1: Rajesh Kumar — uw_pending, high risk
  // Age 52, Hypertension + Diabetes, Smoker, STP score 31
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Creating Case 1: Rajesh Kumar (uw_pending, high risk)…')

  const [rajeshApp] = await db.insert(applications).values({
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
    stpMessage: 'Application referred for manual underwriting review due to: pre-existing medical conditions, age above 50 with high sum insured.',
    stpEvaluatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    proposalData: {
      marital_status: 'married',
      nominee_name: 'Sunita Kumar',
      nominee_relation: 'spouse',
      nominee_dob: '1976-08-20',
      declaration_health_accurate: true,
      consent_data_sharing: true,
      consent_plan_terms: true,
    },
    iadoreSummary: {
      occupation_type: 'salaried',
      bureau_score: 720,
      litigation_count: 0,
      company_is_hazardous: false,
    },
  }).returning()

  await db.insert(quotes).values({
    applicationId: rajeshApp!.id,
    insurerId,
    planType: 'premium',
    planName: 'CareShield Premier',
    planCode: 'CSP-2025',
    sumInsured: '1000000',
    annualPremium: '18500',
    gstAmount: '3330',
    totalPremium: '21830',
    isSelected: true,
    benefits: [],
    exclusions: [],
    waitingPeriods: [],
    riders: [],
  })

  await db.insert(medicalQuestionnaires).values({
    applicationId: rajeshApp!.id,
    heightCm: '168',
    weightKg: '82',
    bmi: '29.05',
    isSmoker: true,
    cigarettesPerDay: 8,
    smokingYears: 15,
    alcoholConsumption: 'occasional',
    hasDiabetes: true,
    hasHypertension: true,
    hasFamilyHistory: true,
    familyHistory: [{ relation: 'father', condition: 'Heart disease', age_at_onset: 58 }],
    riskFlags: ['smoker', 'ped_diabetes', 'ped_hypertension', 'has_ped'],
    riskScore: 60,
    biometricRecommended: true,
    hasHadSurgery: false,
  })

  console.log('  ↳ Done (id:', rajeshApp!.id, ')')

  // ─────────────────────────────────────────────────────────────────────────
  // CASE 2: Priya Menon — uw_pending, heart disease + high BMI
  // Age 38, Heart disease, BMI 33.2, Non-smoker, STP score 42
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Creating Case 2: Priya Menon (uw_pending, heart disease)…')

  const [priyaApp] = await db.insert(applications).values({
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
    stpMessage: 'Application referred for manual underwriting review due to: pre-existing medical conditions (cardiac history).',
    stpEvaluatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    proposalData: {
      marital_status: 'single',
      nominee_name: 'Lakshmi Menon',
      nominee_relation: 'parent',
      nominee_dob: '1958-03-10',
      declaration_health_accurate: true,
      consent_data_sharing: true,
      consent_plan_terms: true,
    },
    iadoreSummary: {
      occupation_type: 'self_employed',
      bureau_score: 680,
      litigation_count: 0,
      company_is_hazardous: false,
    },
  }).returning()

  await db.insert(quotes).values({
    applicationId: priyaApp!.id,
    insurerId,
    planType: 'standard',
    planName: 'CareShield Standard',
    planCode: 'CSS-2025',
    sumInsured: '500000',
    annualPremium: '11200',
    gstAmount: '2016',
    totalPremium: '13216',
    isSelected: true,
    benefits: [],
    exclusions: [],
    waitingPeriods: [],
    riders: [],
  })

  await db.insert(medicalQuestionnaires).values({
    applicationId: priyaApp!.id,
    heightCm: '157',
    weightKg: '82',
    bmi: '33.25',
    isSmoker: false,
    alcoholConsumption: 'none',
    hasHeartDisease: true,
    riskFlags: ['bmi_over_32', 'ped_heart', 'has_ped'],
    riskScore: 55,
    biometricRecommended: true,
    hasHadSurgery: false,
    hasFamilyHistory: false,
  })

  console.log('  ↳ Done (id:', priyaApp!.id, ')')

  // ─────────────────────────────────────────────────────────────────────────
  // CASE 3: Ankit Sharma — uw_approved with 15% loading
  // Age 45, Thyroid disorder, STP score 58, approved with loading
  // ─────────────────────────────────────────────────────────────────────────
  console.log('Creating Case 3: Ankit Sharma (uw_approved with loading)…')

  const basePremium = 14800
  const loadingAmount = Math.round(basePremium * 0.15)
  const revisedPremium = basePremium + loadingAmount

  const [ankitApp] = await db.insert(applications).values({
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
    stpMessage: 'Application referred for manual underwriting review due to: pre-existing medical conditions.',
    stpEvaluatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    uwDecision: 'approved_with_loading',
    uwLoadingPercent: '15',
    uwLoadingAmount: String(loadingAmount),
    uwRevisedPremium: String(revisedPremium),
    uwNotes: 'Thyroid disorder well-controlled on medication. Approved with 15% premium loading. Annual review of thyroid levels recommended.',
    uwDecidedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
    uwDecidedBy: uwId ?? undefined,
    finalPremium: String(revisedPremium),
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    proposalData: {
      marital_status: 'married',
      nominee_name: 'Rekha Sharma',
      nominee_relation: 'spouse',
      nominee_dob: '1983-01-18',
      declaration_health_accurate: true,
      consent_data_sharing: true,
      consent_plan_terms: true,
    },
    iadoreSummary: {
      occupation_type: 'salaried',
      bureau_score: 755,
      litigation_count: 0,
      company_is_hazardous: false,
    },
  }).returning()

  await db.insert(quotes).values({
    applicationId: ankitApp!.id,
    insurerId,
    planType: 'standard',
    planName: 'CareShield Standard',
    planCode: 'CSS-2025',
    sumInsured: '750000',
    annualPremium: String(basePremium),
    gstAmount: String(Math.round(basePremium * 0.18)),
    totalPremium: String(Math.round(basePremium * 1.18)),
    isSelected: true,
    benefits: [],
    exclusions: [],
    waitingPeriods: [],
    riders: [],
  })

  await db.insert(medicalQuestionnaires).values({
    applicationId: ankitApp!.id,
    heightCm: '174',
    weightKg: '78',
    bmi: '25.77',
    isSmoker: false,
    alcoholConsumption: 'occasional',
    hasThyroidDisorder: true,
    riskFlags: ['ped_thyroid', 'has_ped'],
    riskScore: 85,
    biometricRecommended: false,
    hasHadSurgery: false,
    hasFamilyHistory: false,
  })

  console.log('  ↳ Done (id:', ankitApp!.id, ')')

  console.log('\n✅  UW sample data seeded!\n')
  console.log('─────────────────────────────────────────────────')
  console.log('  Case 1 (Pending)  : Rajesh Kumar   — STP 31, Diabetes + Hypertension + Smoker')
  console.log('  Case 2 (Pending)  : Priya Menon    — STP 42, Heart disease + BMI 33')
  console.log('  Case 3 (Approved) : Ankit Sharma   — STP 58, Thyroid, +15% loading')
  console.log('─────────────────────────────────────────────────')
  console.log('\nOpen http://localhost:3000/underwriter/login')
  console.log('  → uw@careshield.in / Uw@12345\n')

  process.exit(0)
}

main().catch((err) => {
  console.error('❌  Seed failed:', err)
  process.exit(1)
})

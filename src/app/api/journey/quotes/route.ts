import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import type { InsuredMember } from '@/types/application'

interface PlanData {
  plan_name: string
  plan_code: string
  sum_insured: number
  base_annual_premium: number
  gst_percent: number
  policy_fee: number
  claim_sla: string
  network_hospitals: number
  ped_waiting_months: number
  initial_waiting_days: number
  key_benefits: { label: string; note?: string }[]
  key_exclusions: string[]
}

function computePremium({
  coverType,
  memberCount,
  memberAges,
  riskScore,
  sumInsured,
}: {
  coverType: string
  memberCount: number
  memberAges: number[]
  riskScore: number
  sumInsured: number
}): number {
  const oldestAge = memberAges.length > 0 ? Math.max(...memberAges) : 35
  const ageFactor = oldestAge < 30 ? 0.8 : oldestAge < 40 ? 1.0 : oldestAge < 50 ? 1.3 : 1.7

  // Member loading: each additional member adds 25% of base
  const memberFactor = coverType === 'individual' ? 1.0 : 1.0 + (memberCount - 1) * 0.25

  // Risk loading: lower risk score → higher loading
  const riskFactor = riskScore >= 90 ? 1.0 : riskScore >= 75 ? 1.05 : riskScore >= 60 ? 1.12 : 1.20

  const base = Math.round(sumInsured * 0.025 * ageFactor * memberFactor * riskFactor)
  return base
}

const KEY_BENEFITS: PlanData['key_benefits'] = [
  { label: 'In-patient hospitalisation', note: 'Single AC room · 1% of SI per day' },
  { label: 'Day care procedures', note: '540+ procedures covered' },
  { label: 'Pre & post hospitalisation', note: '60 days pre / 90 days post' },
  { label: 'Ambulance cover', note: 'Up to ₹5,000 per event' },
  { label: 'OPD cover', note: 'Up to ₹5,000 per policy year' },
  { label: 'Maternity benefit', note: '36-month waiting · Normal ₹50,000 · C-section ₹75,000' },
  { label: 'Annual health check-up', note: '₹3,000 per insured' },
  { label: 'AYUSH treatment', note: 'Up to ₹30,000 per policy year' },
  { label: 'Mental health inpatient', note: 'As per actuals' },
]

const KEY_EXCLUSIONS = [
  'Pre-existing diseases — 12-month waiting period',
  'Cosmetic & aesthetic surgery',
  'Dental treatment (non-accidental)',
  'Infertility and assisted reproduction',
  'Self-inflicted injuries',
  'War and terrorism risks',
]

// GET — step 4 fetches this to render the finalised plan and premium
export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db
      .select({
        dob: applications.dob,
        coverType: applications.coverType,
        proposerIsInsured: applications.proposerIsInsured,
        membersData: applications.membersData,
        initialSumInsured: applications.initialSumInsured,
      })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    const sumInsured = app.initialSumInsured ?? 500000
    const coverType = app.coverType ?? 'individual'
    const storedMembers = (app.membersData as InsuredMember[] | null) ?? []

    // Build member ages list
    const memberAges: number[] = []
    if (app.proposerIsInsured !== false && app.dob) {
      const age = Math.floor((Date.now() - new Date(app.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
      memberAges.push(age)
    }
    for (const m of storedMembers) {
      if (m.dob) {
        const age = Math.floor((Date.now() - new Date(m.dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        memberAges.push(age)
      }
    }

    const memberCount = (app.proposerIsInsured !== false ? 1 : 0) + storedMembers.length

    // TODO: fetch actual risk score from medicalQuestionnaires when available
    const riskScore = 85

    const basePremium = computePremium({
      coverType,
      memberCount: Math.max(memberCount, 1),
      memberAges,
      riskScore,
      sumInsured,
    })

    const plan: PlanData = {
      plan_name: 'Standard Care',
      plan_code: 'SC-001',
      sum_insured: sumInsured,
      base_annual_premium: basePremium,
      gst_percent: 18,
      policy_fee: 200,
      claim_sla: '15 days',
      network_hospitals: 11000,
      ped_waiting_months: 12,
      initial_waiting_days: 30,
      key_benefits: KEY_BENEFITS,
      key_exclusions: KEY_EXCLUSIONS,
    }

    return NextResponse.json({ success: true, plan, cover_type: coverType })
  } catch (err) {
    console.error('[journey/quotes GET] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

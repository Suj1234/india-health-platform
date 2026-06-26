import type { QuoteOption } from '@/types/application'

const STANDARD_BENEFITS = [
  { name: 'In-patient Hospitalisation', description: 'Covers room rent, nursing, doctor fees, OT charges', limit: 'Up to Sum Insured' },
  { name: 'Pre-hospitalisation', description: 'Medical expenses 60 days before admission', limit: '60 days' },
  { name: 'Post-hospitalisation', description: 'Medical expenses 90 days after discharge', limit: '90 days' },
  { name: 'Day Care Procedures', description: '540+ day care procedures covered', limit: 'Up to Sum Insured' },
  { name: 'AYUSH Treatment', description: 'Ayurveda, Yoga, Naturopathy, Unani, Siddha, Homeopathy', limit: 'Up to ₹25,000' },
  { name: 'Organ Donor Expenses', description: 'Medical expenses of donor for organ transplant', limit: 'Up to Sum Insured' },
  { name: 'Ambulance Cover', description: 'Emergency ambulance charges', limit: 'Up to ₹5,000 per hospitalization' },
]

const PREMIUM_BENEFITS = [
  ...STANDARD_BENEFITS,
  { name: 'No-Claim Bonus', description: 'Sum insured increases by 10% for each claim-free year', limit: 'Max 50%' },
  { name: 'Annual Health Check-up', description: 'Preventive health check-up once a year', limit: 'Up to ₹5,000' },
  { name: 'Mental Health Cover', description: 'OPD and IPD for mental health conditions', limit: 'Up to ₹50,000' },
]

const STANDARD_EXCLUSIONS = [
  { name: 'Pre-existing Diseases', description: 'Conditions existing before policy commencement — 48-month waiting period' },
  { name: 'First 30 Days', description: 'All illnesses (except accidents) in first 30 days of coverage' },
  { name: 'Cosmetic Procedures', description: 'Cosmetic or aesthetic procedures unless medically necessary' },
  { name: 'Dental Treatment', description: 'Dental treatment unless arising from accidental injury' },
]

const WAITING_PERIODS = [
  { condition: 'Pre-existing diseases', days: 1460 },
  { condition: 'Specific diseases (cataract, hernia, etc.)', days: 730 },
  { condition: 'All illnesses (except accidents)', days: 30 },
]

export function mockQuotes({
  age,
  sumInsured,
  planType,
  insurerId,
}: {
  age: number
  sumInsured: number
  planType: 'individual' | 'family_floater'
  insurerId: string
}): QuoteOption[] {
  // Premium calculation: base rate × age factor × plan multiplier
  const ageFactor = age < 30 ? 0.8 : age < 40 ? 1.0 : age < 50 ? 1.3 : 1.7
  const planFactor = planType === 'family_floater' ? 1.4 : 1.0
  const basePremiumRate = sumInsured * 0.025  // 2.5% of sum insured as base

  const basicPremium = Math.round(basePremiumRate * ageFactor * planFactor * 0.8)
  const standardPremium = Math.round(basePremiumRate * ageFactor * planFactor * 1.0)
  const premiumPremium = Math.round(basePremiumRate * ageFactor * planFactor * 1.3)

  const gstRate = 0.18

  const makeQuote = (
    id: string,
    type: 'basic' | 'standard' | 'premium',
    name: string,
    annualPremium: number,
    benefits: typeof STANDARD_BENEFITS
  ): QuoteOption => ({
    id,
    plan_type: type,
    plan_name: name,
    plan_code: `CS-HLT-${type.toUpperCase().slice(0, 3)}-2026`,
    sum_insured: sumInsured,
    annual_premium: annualPremium,
    gst_amount: Math.round(annualPremium * gstRate),
    total_premium: Math.round(annualPremium * (1 + gstRate)),
    benefits,
    exclusions: STANDARD_EXCLUSIONS,
    waiting_periods: WAITING_PERIODS,
    riders: [
      { code: 'OPD', name: 'OPD Cover', annual_premium: 2000, gst: 360, total: 2360, selected: false },
      { code: 'MATERNITY', name: 'Maternity Cover', annual_premium: 3500, gst: 630, total: 4130, selected: false },
      { code: 'ROOM_WAIVER', name: 'Room Rent Waiver', annual_premium: 1500, gst: 270, total: 1770, selected: false },
    ],
    network_hospitals_count: type === 'basic' ? 8500 : type === 'standard' ? 12000 : 18500,
  })

  return [
    makeQuote('quote-basic', 'basic', 'CareShield Essential', basicPremium, STANDARD_BENEFITS.slice(0, 5)),
    makeQuote('quote-standard', 'standard', 'CareShield Standard', standardPremium, STANDARD_BENEFITS),
    makeQuote('quote-premium', 'premium', 'CareShield Premium Plus', premiumPremium, PREMIUM_BENEFITS),
  ]
}

export function mockIndicativeQuote({
  age,
  sumInsured,
  members,
  planType,
}: {
  age: number
  sumInsured: number
  members: number
  planType: 'individual' | 'family_floater'
}) {
  const ageFactor = age < 30 ? 0.8 : age < 40 ? 1.0 : age < 50 ? 1.3 : 1.7
  const memberFactor = planType === 'family_floater' ? 1 + (members - 1) * 0.3 : 1
  const basePremium = Math.round(sumInsured * 0.025 * ageFactor * memberFactor)

  return {
    indicative_annual_premium: basePremium,
    gst: Math.round(basePremium * 0.18),
    total: Math.round(basePremium * 1.18),
    plan_options: [
      { type: 'basic', premium: Math.round(basePremium * 0.8), total: Math.round(basePremium * 0.8 * 1.18) },
      { type: 'standard', premium: basePremium, total: Math.round(basePremium * 1.18) },
      { type: 'premium', premium: Math.round(basePremium * 1.3), total: Math.round(basePremium * 1.3 * 1.18) },
    ],
  }
}

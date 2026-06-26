import type { STPResult } from '@/types/application'

interface STPInputSummary {
  riskScore: number
  hasPed: boolean
  isSmoker: boolean
  litigation_count: number
  company_is_hazardous: boolean
  bmi: number
  sum_insured: number
  age: number
  bureau_score: number | null
}

export function mockStpDecision(input: STPInputSummary): STPResult {
  // Compute STP score (0-100, higher = better for approval)
  let score = 100

  if (input.hasPed) score -= 35
  if (input.isSmoker) score -= 10
  if (input.litigation_count > 0) score -= 20
  if (input.company_is_hazardous) score -= 15
  if (input.bmi > 35) score -= 15
  else if (input.bmi > 30) score -= 8
  if (input.age > 55) score -= 10
  else if (input.age > 45) score -= 5
  if (input.bureau_score !== null && input.bureau_score < 650) score -= 10
  if (input.sum_insured > 2000000) score -= 5

  // Add back from risk score (higher risk = lower STP score)
  score = Math.max(0, Math.min(100, score - input.riskScore * 0.3))

  const approved = score >= 60

  if (approved) {
    return {
      decision: 'APPROVED',
      stp_score: Math.round(score),
      message: 'Application meets all STP criteria. Approved for immediate policy issuance upon payment.',
      documents_required: [],
      pivc_required: false,
      biometric_required: false,
    }
  }

  const reasons: string[] = []
  if (input.hasPed) reasons.push('pre-existing medical conditions')
  if (input.litigation_count > 0) reasons.push('pending litigation')
  if (input.company_is_hazardous) reasons.push('hazardous occupation')
  if (input.age > 50 && input.sum_insured > 1500000) reasons.push('high value application requires manual review')

  return {
    decision: 'REFERRED',
    stp_score: Math.round(score),
    message: `Application referred for manual underwriting review due to: ${reasons.join(', ') || 'risk profile'}.`,
    documents_required: input.hasPed ? ['medical_report', 'doctor_certificate'] : [],
    pivc_required: input.age > 55 || input.sum_insured > 3000000,
    biometric_required: input.hasPed || input.bmi > 32,
  }
}

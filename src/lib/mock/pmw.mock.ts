import type { NeedsSummary } from '@/types/application'

export function mockPmwNeedsAnalysis({
  age,
  annualIncome,
  dependents,
  existingCover,
}: {
  age: number
  annualIncome: number
  dependents: number
  existingCover: number
}): NeedsSummary {
  // Recommended health cover: 10× monthly income, min ₹5L
  const recommendedHealthCover = Math.max(500000, Math.round((annualIncome / 12) * 10 / 100000) * 100000)
  const healthPremium = Math.round(recommendedHealthCover * 0.025 * (age < 35 ? 0.9 : 1.1))

  // Term cover: 15-20× annual income
  const termCover = Math.round(annualIncome * 18 / 100000) * 100000

  // Critical illness: 5× annual income
  const criticalCover = Math.round(annualIncome * 5 / 100000) * 100000

  return {
    health_insurance: {
      recommended_cover: recommendedHealthCover,
      premium_estimate: healthPremium,
      tiers: [
        { cover: Math.round(recommendedHealthCover * 0.5), premium: Math.round(healthPremium * 0.6), label: 'Basic Protection' },
        { cover: recommendedHealthCover, premium: healthPremium, label: 'Recommended' },
        { cover: recommendedHealthCover * 2, premium: Math.round(healthPremium * 1.7), label: 'Comprehensive' },
      ],
    },
    term_cover: {
      cover: termCover,
      years: Math.max(10, 60 - age),
      premium: Math.round(termCover * 0.004 * (age < 35 ? 0.7 : 1.0)),
    },
    critical_illness: {
      cover: criticalCover,
      years: Math.max(10, 60 - age),
      premium: Math.round(criticalCover * 0.008),
    },
    disability_income: {
      monthly_benefit: Math.round(annualIncome / 12 * 0.6 / 5000) * 5000,
      years: Math.max(10, 60 - age),
      premium: Math.round(annualIncome * 0.01),
    },
  }
}

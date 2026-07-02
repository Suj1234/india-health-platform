import { Metadata } from 'next'
import { getInsurerBySlug } from '@/lib/api-router'
import { LandingHero } from '@/components/customer/landing-hero'
import { LandingTrustBar } from '@/components/customer/landing-trust-bar'
import { LandingHowItWorks } from '@/components/customer/landing-how-it-works'
import { LandingFeatures } from '@/components/customer/landing-features'
import { LandingQuoteCalculator } from '@/components/customer/landing-quote-calculator'
import { LandingFaq } from '@/components/customer/landing-faq'
import { LandingFooter } from '@/components/customer/landing-footer'
import { LandingNav } from '@/components/customer/landing-nav'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const insurer = await getInsurerBySlug(slug)
  const name = insurer?.name ?? 'Health Insurance'
  return {
    title: `${name} — Health Insurance in 15 Minutes`,
    description: 'Get comprehensive health insurance coverage instantly. 100% digital, IRDAI approved, no paperwork.',
  }
}

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <LandingNav />
      <main className="flex-1">
        <LandingHero />
        <LandingTrustBar />
        <LandingHowItWorks />
        <LandingFeatures />
        <LandingQuoteCalculator />
        <LandingFaq />
      </main>
      <LandingFooter />
    </div>
  )
}

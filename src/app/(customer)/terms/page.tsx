import { Metadata } from 'next'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Terms & Conditions — CareShield',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-800">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CareShield Insurance Ltd.</p>
            <h1 className="text-lg font-bold text-foreground">Terms &amp; Conditions</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-amber-50 px-6 py-4 mb-8">
          <p className="text-sm text-amber-800 font-medium">
            This document is under preparation. Full terms will be published before the platform goes live.
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Acceptance of Terms</h2>
            <p>By using the CareShield Insurance onboarding platform, you agree to these terms. This platform facilitates health insurance applications in accordance with IRDAI regulations.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. Data Usage</h2>
            <p>Personal data collected (including mobile number, PAN, and health information) is used solely for the purpose of processing your insurance application. Data is handled in compliance with the Digital Personal Data Protection Act, 2023.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. OTP Consent</h2>
            <p>By providing your mobile number, you consent to receiving a one-time password (OTP) via SMS for identity verification. Standard messaging rates may apply.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. KYC Requirements</h2>
            <p>IRDAI mandates KYC verification for all health insurance policies. Your PAN and Aadhaar details are required for compliance. Documents submitted are verified through authorized KYC service providers.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Policy Issuance</h2>
            <p>A policy is issued only after successful underwriting review and payment confirmation. CareShield Insurance Ltd. reserves the right to decline applications based on underwriting decisions.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Governing Law</h2>
            <p>These terms are governed by the laws of India. Any disputes are subject to the jurisdiction of courts in Mumbai, Maharashtra.</p>
          </section>
        </div>

        <div className="mt-10 border-t border-border pt-6 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Last updated: June 2026 · IRDAI Reg. No. 142</p>
          <Link
            href="javascript:window.close()"
            className="flex items-center gap-1.5 text-sm font-medium text-primary-700 hover:text-primary-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Close
          </Link>
        </div>
      </div>
    </div>
  )
}

import { Metadata } from 'next'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Privacy Policy — CareShield',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-800">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">CareShield Insurance Ltd.</p>
            <h1 className="text-lg font-bold text-foreground">Privacy Policy</h1>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-amber-50 px-6 py-4 mb-8">
          <p className="text-sm text-amber-800 font-medium">
            This document is under preparation. Full privacy policy will be published before the platform goes live.
          </p>
        </div>

        <div className="prose prose-sm max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-base font-semibold text-foreground">1. Information We Collect</h2>
            <p>We collect: mobile number, email address, PAN, date of birth, address, income details, and health information required for your insurance application.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">2. How We Use Your Data</h2>
            <p>Your data is used exclusively to: process your insurance application, perform KYC verification, calculate premiums, issue policy documents, and communicate application status.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">3. Data Sharing</h2>
            <p>We share data with: IRDAI-approved KYC agencies (iAdore, Karza), reinsurers for underwriting, and payment processors (Razorpay). We do not sell your data to third parties.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">4. Data Security</h2>
            <p>All data is encrypted in transit (TLS 1.3) and at rest (AES-256). OTPs are stored as salted hashes and never in plaintext. Access is restricted to authorised personnel only.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">5. Your Rights</h2>
            <p>Under the Digital Personal Data Protection Act, 2023, you have the right to access, correct, and request deletion of your personal data. Contact us at privacy@careshield.in.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-foreground">6. Retention</h2>
            <p>Application data is retained for 7 years as required by IRDAI regulations. You may request a copy of your data at any time.</p>
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

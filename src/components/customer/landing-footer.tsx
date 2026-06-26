import Link from 'next/link'
import { Shield, Phone, Mail, MapPin, ExternalLink } from 'lucide-react'

const PRODUCT_LINKS = [
  { label: 'How it works', href: '#how-it-works' },
  { label: 'Features', href: '#features' },
  { label: 'Premium Calculator', href: '#' },
  { label: 'Network Hospitals', href: '#' },
  { label: 'Claim Process', href: '#' },
]

const LEGAL_LINKS = [
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Refund Policy', href: '/refund' },
  { label: 'Grievance Redressal', href: '/grievance' },
  { label: 'IRDAI Disclosures', href: '/irdai-disclosures' },
]

const SUPPORT_LINKS = [
  { label: 'FAQs', href: '#faq' },
  { label: 'Track Application', href: '/track' },
  { label: 'Download Policy', href: '/policy' },
  { label: 'Submit Claim', href: '#' },
  { label: 'Agent Login', href: '/agent/login' },
]

export function LandingFooter() {
  return (
    <footer className="bg-foreground text-white/70">
      {/* Main footer */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10">

          {/* Brand column */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-600">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div className="leading-none">
                <span className="text-base font-bold text-white">CareShield</span>
                <p className="text-[10px] font-medium text-white/40 tracking-wider uppercase">India</p>
              </div>
            </div>
            <p className="text-sm text-white/60 leading-relaxed mb-5 max-w-xs">
              India's first fully digital health insurance platform with AI-powered underwriting.
              IRDAI approved. Designed to make coverage accessible to every Indian.
            </p>
            <div className="space-y-2.5">
              <a href="tel:18001234567" className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                <Phone className="h-3.5 w-3.5 text-white/40" />
                1800-123-4567 <span className="text-white/30 text-xs">(Toll free)</span>
              </a>
              <a href="mailto:support@careshield.in" className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors">
                <Mail className="h-3.5 w-3.5 text-white/40" />
                support@careshield.in
              </a>
              <div className="flex items-start gap-2 text-sm text-white/60">
                <MapPin className="h-3.5 w-3.5 text-white/40 flex-shrink-0 mt-0.5" />
                <span>
                  CareShield Insurance Ltd.<br />
                  12th Floor, Prestige Trade Tower,<br />
                  Bengaluru – 560 025, Karnataka
                </span>
              </div>
            </div>
          </div>

          {/* Links columns */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Product</p>
            <ul className="space-y-2.5">
              {PRODUCT_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Support</p>
            <ul className="space-y-2.5">
              {SUPPORT_LINKS.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Legal</p>
            <ul className="space-y-2.5">
              {LEGAL_LINKS.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="text-sm text-white/60 hover:text-white transition-colors">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Regulatory box */}
          <div className="lg:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-4">Regulatory</p>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">IRDAI Registration</p>
                <p className="text-xs font-semibold text-white/80">No. 142</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">CIN</p>
                <p className="text-xs font-semibold text-white/80">U66010KA2023PLC163491</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 mb-0.5">Category</p>
                <p className="text-xs font-semibold text-white/80">Health Insurance</p>
              </div>
              <a
                href="https://irdai.gov.in"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white/60 transition-colors"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                IRDAI.gov.in
              </a>
            </div>
          </div>

        </div>
      </div>

      {/* IRDAI disclosure bar */}
      <div className="border-t border-white/10 bg-black/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <p className="text-[10px] text-white/30 leading-relaxed mb-3">
            <span className="font-semibold text-white/40">IRDAI Disclaimer:</span>{' '}
            Insurance is the subject matter of solicitation. CareShield Insurance Limited (IRDAI Reg. No. 142) is a licensed
            health insurer regulated by the Insurance Regulatory and Development Authority of India. Policy issuance is subject
            to underwriting, medical declaration, and terms & conditions. Premiums shown are indicative and may vary. GST
            applicable as per prevailing rates. Please read the policy wordings carefully before buying.
          </p>
          <p className="text-[10px] text-white/30">
            Beware of spurious/fraud calls: IRDAI is not involved in activities like selling insurance policies, announcing
            bonuses or investment of premium. Public receiving such calls are requested to lodge a police complaint.
          </p>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/30">
            © {new Date().getFullYear()} CareShield Insurance Limited. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/underwriter/login" className="text-xs text-white/30 hover:text-white/50 transition-colors">
              Underwriter Portal
            </Link>
            <Link href="/admin/login" className="text-xs text-white/30 hover:text-white/50 transition-colors">
              Admin
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Minus, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const FAQS = [
  {
    q: 'Do I need to visit any office or meet an agent?',
    a: 'No. The entire process — OTP verification, PAN lookup, health questionnaire, document upload, payment, and policy delivery — is 100% digital. Your policy PDF arrives in your inbox.',
  },
  {
    q: 'What documents do I need to apply?',
    a: 'Just your PAN card and Aadhaar. We use your PAN to auto-fetch your demographics and income profile, and Aadhaar for identity verification via OCR. For sum insured above ₹10 Lakh, we may ask for one additional income proof document.',
  },
  {
    q: 'How is my premium calculated?',
    a: 'Our AI underwriting engine uses your age, sum insured, family composition, declared health history, and income profile to compute your risk score. The final premium is IRDAI-approved and locked in for the policy year on payment.',
  },
  {
    q: 'What is Straight-Through Processing (STP)?',
    a: 'STP means your application is evaluated entirely by our AI — no human underwriter reviews it. If your risk score meets the threshold, you get an instant approval and can pay immediately. Over 60% of applicants qualify for STP.',
  },
  {
    q: 'What happens if my application is not STP-approved?',
    a: 'Your application is referred to a licensed underwriter who reviews it within 4 business hours. They may approve it as-is, apply a loading (higher premium), add specific exclusions, or in rare cases request additional medical tests. You have 7 days to complete payment after UW approval.',
  },
  {
    q: 'Is there a waiting period?',
    a: 'Yes. Standard IRDAI-mandated waiting periods apply: 30 days for all illnesses (except accidents), 2 years for most pre-existing conditions, and 2–4 years for specific conditions like joint replacement. These are disclosed in your policy document.',
  },
  {
    q: 'Can I add family members later?',
    a: 'Family members can be added at policy renewal. Mid-term additions are not permitted under standard IRDAI floater policy terms. Plan your cover upfront using our family cover option.',
  },
  {
    q: 'How do I make a claim?',
    a: 'For cashless claims, present your digital policy card (in the app) at any of our 18,500+ network hospitals. For reimbursement, submit bills via our customer portal within 30 days of discharge. Claims are processed within 30 days of complete documentation.',
  },
  {
    q: 'Is my PAN and health data secure?',
    a: "Yes. All data is encrypted with AES-256 at rest and 256-bit TLS in transit. PAN and Aadhaar numbers are masked in our logs. We comply with India's DPDP Act and IRDAI data security guidelines. We never share your health data with third parties without consent.",
  },
  {
    q: 'Can I cancel and get a refund?',
    a: 'You can cancel within the free-look period (15 days from policy receipt) for a full refund of premium, less proportionate risk premium and stamp duty. After the free-look period, cancellations are prorated per IRDAI guidelines.',
  },
]

function FaqItem({ q, a, isOpen, onToggle }: { q: string; a: string; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={cn(
      'border-b border-border last:border-0 transition-colors',
      isOpen && 'bg-primary-50/50'
    )}>
      <button
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-4 px-5 py-4 text-left"
      >
        <span className={cn('text-sm font-semibold leading-relaxed transition-colors', isOpen ? 'text-primary-800' : 'text-foreground')}>
          {q}
        </span>
        <span className={cn(
          'flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full transition-colors mt-0.5',
          isOpen ? 'bg-primary-100 text-primary-700' : 'bg-secondary text-muted-foreground'
        )}>
          {isOpen ? <Minus className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LandingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const half = Math.ceil(FAQS.length / 2)
  const col1 = FAQS.slice(0, half)
  const col2 = FAQS.slice(half)

  return (
    <section id="faq" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

          {/* Left: heading + CTA */}
          <div className="lg:col-span-4">
            <p className="text-sm font-semibold uppercase tracking-widest text-primary-800 mb-3">
              FAQs
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Got questions?
            </h2>
            <p className="text-muted-foreground text-base mb-8">
              We've answered the most common questions below. If something is unclear,
              our team is a call or chat away.
            </p>

            <div className="rounded-xl border border-border bg-white p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-50">
                  <MessageCircle className="h-4.5 w-4.5 text-primary-700" strokeWidth={2} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Still confused?</p>
                  <p className="text-xs text-muted-foreground">We're here Mon–Sat, 9AM–6PM</p>
                </div>
              </div>
              <a
                href="tel:18001234567"
                className="block w-full text-center text-sm font-semibold text-primary-800 bg-primary-50 hover:bg-primary-100 rounded-lg py-2.5 transition-colors"
              >
                Call 1800-123-4567
              </a>
              <p className="mt-2 text-center text-xs text-muted-foreground">Toll free · No hold music</p>
            </div>
          </div>

          {/* Right: two-column accordion */}
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-0 rounded-2xl border border-border bg-white overflow-hidden shadow-card">
              <div className="md:border-r border-border">
                {col1.map((faq, i) => (
                  <FaqItem
                    key={i}
                    q={faq.q}
                    a={faq.a}
                    isOpen={openIndex === i}
                    onToggle={() => setOpenIndex(openIndex === i ? null : i)}
                  />
                ))}
              </div>
              <div>
                {col2.map((faq, i) => (
                  <FaqItem
                    key={i + half}
                    q={faq.q}
                    a={faq.a}
                    isOpen={openIndex === i + half}
                    onToggle={() => setOpenIndex(openIndex === i + half ? null : i + half)}
                  />
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}

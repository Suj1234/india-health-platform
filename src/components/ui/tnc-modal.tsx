'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'

interface TnCModalProps {
  open: boolean
  onClose: () => void
  onAgree: () => void
}

const TNC_SECTIONS = [
  {
    heading: '1. Eligibility',
    body: 'This health insurance policy is available to Indian residents between 18–65 years of age. All members to be covered must be Indian nationals or permanent residents with a valid PAN card and Aadhaar number. The proposer must be the primary insured or their legal guardian.',
  },
  {
    heading: '2. Scope of Cover',
    body: 'The policy covers hospitalization expenses including room rent, ICU charges, surgeon fees, anaesthesia, medicines, diagnostic tests, and pre/post-hospitalization expenses as per the plan selected. Specific sub-limits and annual aggregate limits apply as stated in the policy schedule.',
  },
  {
    heading: '3. Waiting Periods',
    body: 'A 30-day initial waiting period applies for all claims except accidental hospitalization. Pre-existing diseases are covered after 36 months of continuous coverage. Specific diseases (hernia, cataract, knee replacement, joint replacement, etc.) have a 24-month waiting period.',
  },
  {
    heading: '4. Exclusions',
    body: 'This policy does not cover: cosmetic or plastic surgery (unless reconstructive post-accident), infertility treatment, dental treatment (unless accidental), self-inflicted injuries, treatment outside India, non-allopathic treatment, experimental or unproven treatments, or conditions arising from substance abuse.',
  },
  {
    heading: '5. Claim Process',
    body: 'Cashless claims must be approved by the Third Party Administrator (TPA) before planned hospitalization, except in emergencies where approval is required within 24 hours. Reimbursement claims must be submitted within 30 days of discharge with all original bills and medical records. CareShield reserves the right to investigate all claims.',
  },
  {
    heading: '6. Premium & Renewal',
    body: 'Premiums are due annually in advance. Non-payment within the grace period (30 days) will result in policy lapse and loss of waiting period credits. Renewal is guaranteed up to age 80 subject to continuous coverage and premium payment. Premiums may be revised on renewal based on claims experience and medical inflation.',
  },
  {
    heading: '7. Free-Look & Cancellation',
    body: 'You may cancel this policy within 15 days of receipt (free-look period) for a full refund, provided no claim has been made. After the free-look period, cancellations are subject to short-period premium rates. CareShield may cancel the policy in case of fraud, misrepresentation, or non-disclosure of material facts.',
  },
  {
    heading: '8. Data & Privacy',
    body: 'By accepting, you consent to CareShield collecting, storing, and processing your personal and health data for underwriting, claim settlement, and regulatory compliance under the Digital Personal Data Protection Act 2023 (DPDP Act). Your data will not be sold to third parties. Anonymized, aggregated data may be used for actuarial analysis and product development.',
  },
  {
    heading: '9. IRDAI Compliance',
    body: 'This policy is governed by the Insurance Regulatory and Development Authority of India (IRDAI) guidelines. In case of disputes, you may approach the Insurance Ombudsman in your region at no cost. CareShield Insurance Ltd. is registered with IRDAI under Registration No. 142.',
  },
  {
    heading: '10. Informed Consent',
    body: 'By clicking "I Agree", you confirm that you have read and understood all the terms and conditions stated above in full. You confirm that all information provided in this application is true, accurate, and complete to the best of your knowledge. Any misrepresentation may result in claim rejection or policy cancellation.',
  },
]

export function TnCModal({ open, onClose, onAgree }: TnCModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reset when modal opens
  useEffect(() => {
    if (open) {
      setHasScrolledToBottom(false)
      // Small delay to let the modal render, then check if content fits without scrolling
      setTimeout(() => {
        const el = scrollRef.current
        if (!el) return
        if (el.scrollHeight <= el.clientHeight) {
          setHasScrolledToBottom(true)
        }
      }, 100)
    }
  }, [open])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    if (distanceFromBottom <= 12) setHasScrolledToBottom(true)
  }, [])

  const handleAgree = () => {
    onAgree()
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Terms & Conditions"
      description="Please read carefully and scroll to the bottom"
      closable
      maxWidth="2xl"
    >
      {/* Scrollable content */}
      <div className="relative">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="h-64 sm:h-80 lg:h-96 overflow-y-auto space-y-4 pr-2 text-sm"
          style={{ scrollbarWidth: 'thin', scrollbarColor: '#e2e8f0 transparent' }}
        >
          {TNC_SECTIONS.map((section) => (
            <div key={section.heading}>
              <h3 className="font-semibold text-foreground mb-1 text-[13px]">{section.heading}</h3>
              <p className="text-muted-foreground leading-relaxed text-[13px]">{section.body}</p>
            </div>
          ))}
          {/* Bottom padding sentinel */}
          <div className="h-2" />
        </div>

        {/* Fade-out gradient when not scrolled to bottom */}
        {!hasScrolledToBottom && (
          <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        )}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-4 border-t border-border">
        {!hasScrolledToBottom ? (
          <div className="flex items-center justify-center gap-1.5 mb-3 text-xs text-muted-foreground">
            <ChevronDown className="h-3.5 w-3.5 animate-bounce" />
            Scroll to the bottom to enable "I Agree"
          </div>
        ) : null}

        <Button
          onClick={handleAgree}
          disabled={!hasScrolledToBottom}
          size="lg"
          className="w-full"
          leftIcon={hasScrolledToBottom ? <Check className="h-4 w-4" /> : undefined}
        >
          I Agree
        </Button>
      </div>
    </Modal>
  )
}

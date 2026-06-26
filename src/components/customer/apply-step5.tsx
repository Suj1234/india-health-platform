'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, User, MapPin, Shield, Briefcase, ClipboardCheck, Share2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubStepper } from '@/components/ui/sub-stepper'
import { cn } from '@/lib/utils'
import { JourneyShell } from '@/components/customer/journey-shell'

// ─── Types & config ───────────────────────────────────────────────────────────

type ReviewSubStep = 'review' | 'nominee' | 'confirm'

const SUB_STEPS = [
  { key: 'review', label: 'Review Details' },
  { key: 'nominee', label: 'Nominee' },
  { key: 'confirm', label: 'Confirm' },
]

const MOCK_APP = {
  name: 'Rahul Sharma',
  dob: '15 May 1990',
  gender: 'Male',
  pan: 'ABC*****4H',
  mobile: '+91 98765 43210',
  email: 'rahul.s@email.com',
  address: '12, MG Road, Koramangala, Mumbai – 400050',
  occupation: 'Salaried · Tech Corp Pvt Ltd',
  plan: 'Standard Care · ₹5 L cover',
  premium: '₹4,200/year (₹350/month)',
  riders: 'Critical Illness',
}

const RELATIONS = [
  'Spouse', 'Son', 'Daughter', 'Father', 'Mother',
  'Brother', 'Sister', 'Grandfather', 'Grandmother',
]

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplyStep5() {
  const router = useRouter()
  const [subStep, setSubStep] = useState<ReviewSubStep>('review')
  const [completedSubs, setCompletedSubs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [coverType, setCoverType] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/journey/members')
      .then((r) => r.json())
      .then((d) => { if (d.success) setCoverType(d.cover_type) })
      .catch(() => {})
  }, [])

  // Nominee
  const [nomineeName, setNomineeName] = useState('')
  const [nomineeRelation, setNomineeRelation] = useState('')
  const [nomineeDob, setNomineeDob] = useState('')
  const [nomineeNameError, setNomineeNameError] = useState('')
  const [nomineeRelationError, setNomineeRelationError] = useState('')
  const [nomineeDobError, setNomineeDobError] = useState('')

  // Confirm consents
  const [consent1, setConsent1] = useState(false)
  const [consent2, setConsent2] = useState(false)
  const [consent3, setConsent3] = useState(false)

  const advance = (from: ReviewSubStep, to: ReviewSubStep) => {
    setCompletedSubs((p) => [...p.filter((s) => s !== from), from])
    setSubStep(to)
  }

  const handleNomineeNext = () => {
    let valid = true
    if (!nomineeName.trim()) { setNomineeNameError('Enter nominee full name'); valid = false } else setNomineeNameError('')
    if (!nomineeRelation) { setNomineeRelationError('Select relationship'); valid = false } else setNomineeRelationError('')
    if (!nomineeDob) { setNomineeDobError('Enter date of birth'); valid = false } else setNomineeDobError('')
    if (!valid) return
    advance('nominee', 'confirm')
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await fetch('/api/journey/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nominee_name: nomineeName,
          nominee_relation: nomineeRelation,
          nominee_dob: nomineeDob,
          declaration_accepted: true,
          consent_data_sharing: true,
          consent_health_declaration: true,
        }),
      })
    } catch {
      // continue on API error
    } finally {
      setLoading(false)
    }
    router.push(coverType === 'individual' ? '/apply/7' : '/apply/6')
  }

  const handleBack = (key: string) => setSubStep(key as ReviewSubStep)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <JourneyShell
      currentStep={5}
      subBar={<SubStepper steps={SUB_STEPS} current={subStep} completed={completedSubs} onBack={handleBack} />}
    >
      <AnimatePresence mode="wait">

        {/* ── Review Details ───────────────────────────────────────────────── */}
        {subStep === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Review Your Details</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Verify everything before we generate your proposal
                </p>
              </div>

              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="px-8 py-6 space-y-6">
                  {[
                    {
                      icon: User,
                      title: 'Personal Details',
                      items: [
                        { label: 'Name', value: MOCK_APP.name },
                        { label: 'Date of Birth', value: MOCK_APP.dob },
                        { label: 'Gender', value: MOCK_APP.gender },
                        { label: 'PAN', value: MOCK_APP.pan },
                      ],
                    },
                    {
                      icon: MapPin,
                      title: 'Contact & Address',
                      items: [
                        { label: 'Mobile', value: MOCK_APP.mobile },
                        { label: 'Email', value: MOCK_APP.email },
                        { label: 'Address', value: MOCK_APP.address },
                      ],
                    },
                  ].map(({ icon: Icon, title, items }) => (
                    <div key={title}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="h-4 w-4 text-primary-700 shrink-0" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                      </div>
                      <div className="space-y-2.5">
                        {items.map(({ label, value }) => (
                          <div key={label} className="flex items-start justify-between gap-4">
                            <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                            <span className="text-sm text-foreground font-medium text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="px-8 py-6 space-y-6">
                  {[
                    {
                      icon: Briefcase,
                      title: 'Employment',
                      items: [{ label: 'Occupation', value: MOCK_APP.occupation }],
                    },
                    {
                      icon: Shield,
                      title: 'Selected Plan',
                      items: [
                        { label: 'Plan', value: MOCK_APP.plan },
                        { label: 'Premium', value: MOCK_APP.premium },
                        { label: 'Add-ons', value: MOCK_APP.riders },
                      ],
                    },
                  ].map(({ icon: Icon, title, items }) => (
                    <div key={title}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="h-4 w-4 text-primary-700 shrink-0" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
                      </div>
                      <div className="space-y-2.5">
                        {items.map(({ label, value }) => (
                          <div key={label} className="flex items-start justify-between gap-4">
                            <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                            <span className="text-sm text-foreground font-medium text-right">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => advance('review', 'nominee')}
            >
              Looks correct — continue
            </Button>
          </motion.div>
        )}

        {/* ── Nominee ─────────────────────────────────────────────────────── */}
        {subStep === 'nominee' && (
          <motion.div
            key="nominee"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Add a Nominee</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Person who receives the benefit in case of a claim
                </p>
              </div>
              <div className="px-8 py-6 space-y-5">
                <Input
                  label="Nominee Full Name"
                  placeholder="As per government ID"
                  value={nomineeName}
                  onChange={(e) => { setNomineeName(e.target.value); setNomineeNameError('') }}
                  error={nomineeNameError}
                />

                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Relationship to you</p>
                  <div className="flex flex-wrap gap-2">
                    {RELATIONS.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setNomineeRelation(r); setNomineeRelationError('') }}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                          nomineeRelation === r
                            ? 'bg-primary-800 border-primary-800 text-white'
                            : 'bg-white border-border text-foreground hover:border-primary-600/60'
                        )}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  {nomineeRelationError && (
                    <p className="text-xs text-red-500 mt-1.5">{nomineeRelationError}</p>
                  )}
                </div>

                <Input
                  label="Nominee Date of Birth"
                  type="date"
                  value={nomineeDob}
                  onChange={(e) => { setNomineeDob(e.target.value); setNomineeDobError('') }}
                  error={nomineeDobError}
                />
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={handleNomineeNext}
            >
              Continue
            </Button>
          </motion.div>
        )}

        {/* ── Confirm & Submit ─────────────────────────────────────────────── */}
        {subStep === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Confirm & Submit</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Review your proposal and confirm the declarations below to submit
                </p>
              </div>

              <div className="px-8 py-6 space-y-7">
                <div className="rounded-xl bg-slate-50 border border-border px-5 py-4">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-3">Proposal Summary</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-2.5">
                    {[
                      { label: 'Plan', value: MOCK_APP.plan },
                      { label: 'Premium', value: MOCK_APP.premium },
                      { label: 'Add-ons', value: MOCK_APP.riders },
                      { label: 'Nominee', value: `${nomineeName} (${nomineeRelation})` },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex items-start justify-between gap-3">
                        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
                        <span className="text-xs font-semibold text-foreground text-right">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-1">Declaration</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      As required under IRDAI regulations, please read and confirm each statement below.
                    </p>
                  </div>

                  {[
                    {
                      id: 'c1',
                      icon: ClipboardCheck,
                      checked: consent1,
                      onChange: () => setConsent1((v) => !v),
                      title: 'Accuracy of Information',
                      text: 'I declare that all information provided in this proposal — including personal details, health history, and income — is true, complete, and correct to the best of my knowledge.',
                    },
                    {
                      id: 'c2',
                      icon: Share2,
                      checked: consent2,
                      onChange: () => setConsent2((v) => !v),
                      title: 'Data Sharing Consent',
                      text: 'I consent to the insurer collecting, storing, and sharing my health and personal data with medical professionals, reinsurers, and regulatory bodies.',
                    },
                    {
                      id: 'c3',
                      icon: BookOpen,
                      checked: consent3,
                      onChange: () => setConsent3((v) => !v),
                      title: 'Policy Terms & Exclusions',
                      text: 'I confirm that I have read, understood, and agree to the policy terms, conditions, waiting periods, and exclusions applicable to the selected plan.',
                    },
                  ].map(({ id, icon: Icon, checked, onChange, title, text }) => (
                    <motion.label
                      key={id}
                      onClick={onChange}
                      className={cn(
                        'flex items-start gap-4 rounded-xl border-2 px-5 py-4 cursor-pointer transition-colors duration-200',
                        checked
                          ? 'border-primary-700 bg-primary-50'
                          : 'border-border bg-white hover:border-primary-300'
                      )}
                    >
                      <div className={cn(
                        'mt-0.5 flex h-5 w-5 shrink-0 rounded border-2 items-center justify-center transition-colors duration-200',
                        checked ? 'border-primary-800 bg-primary-800' : 'border-border bg-white'
                      )}>
                        {checked && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.15 }}>
                            <Check className="h-3 w-3 text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 rounded-lg items-center justify-center transition-colors duration-200',
                          checked ? 'bg-primary-100' : 'bg-slate-100'
                        )}>
                          <Icon className={cn(
                            'h-4 w-4 transition-colors duration-200',
                            checked ? 'text-primary-700' : 'text-slate-500'
                          )} strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className={cn(
                            'text-sm font-semibold mb-0.5 transition-colors duration-200',
                            checked ? 'text-primary-900' : 'text-foreground'
                          )}>{title}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
                        </div>
                      </div>
                    </motion.label>
                  ))}
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              loading={loading}
              disabled={!consent1 || !consent2 || !consent3}
              rightIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
              onClick={handleSubmit}
            >
              {loading ? 'Submitting…' : 'Submit Proposal'}
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </JourneyShell>
  )
}

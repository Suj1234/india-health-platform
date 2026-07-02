'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, User, MapPin, Shield, Briefcase, Users, ClipboardCheck, Share2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubStepper } from '@/components/ui/sub-stepper'
import { cn } from '@/lib/utils'
import { JourneyShell } from '@/components/customer/journey-shell'

// ─── Types & config ───────────────────────────────────────────────────────────

type ReviewSubStep = 'nominee' | 'review'

const SUB_STEPS = [
  { key: 'nominee', label: 'Nominee' },
  { key: 'review', label: 'Review & Submit' },
]

interface ProposalAddress {
  line1: string
  city: string
  state: string
  pincode: string
}

interface MemberRow {
  member_id: string
  name: string
  relation: string
  dob: string
  gender: string
}

interface ProposalReview {
  cover_type: string
  proposer_is_insured: boolean
  members: MemberRow[]
  proposer: {
    name: string | null
    dob: string | null
    gender: string | null
    pan: string | null
    mobile: string
    email: string | null
    address: ProposalAddress | null
    occupation_type: string | null
    employer_name: string | null
  }
  quote: {
    plan_name: string
    sum_insured: number
    total_premium: number
    selected_riders: string[]
  } | null
}

const RIDER_NAMES: Record<string, string> = {
  CI: 'Critical Illness',
  PA: 'Personal Accident',
  PWB: 'Premium Waiver Benefit',
  HDC: 'Hospital Daily Cash',
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const COVER_TYPE_LABELS: Record<string, string> = {
  individual: 'Individual',
  family_floater: 'Family Floater',
  parents: 'Parents Plan',
}

const RELATIONS = [
  'Spouse', 'Son', 'Daughter', 'Father', 'Mother',
  'Brother', 'Sister', 'Grandfather', 'Grandmother',
]

// ─── Formatters ───────────────────────────────────────────────────────────────

function maskPan(pan: string | null): string {
  if (!pan || pan.length < 10) return '—'
  return pan.slice(0, 3) + '*'.repeat(5) + pan.slice(8)
}

function fmtDob(dob: string | null): string {
  if (!dob) return '—'
  const [y, m, d] = dob.split('-')
  const month = MONTHS[parseInt(m ?? '0') - 1]
  return month ? `${parseInt(d ?? '0')} ${month} ${y}` : dob
}

function calcAge(dob: string): number | null {
  const birth = new Date(dob)
  if (isNaN(birth.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function fmtGender(g: string | null): string {
  if (!g) return '—'
  return g.charAt(0).toUpperCase() + g.slice(1)
}

function fmtAddress(addr: ProposalAddress | null): string {
  if (!addr) return '—'
  return `${addr.line1}, ${addr.city}, ${addr.state} – ${addr.pincode}`
}

function fmtOccupation(type: string | null, employer: string | null): string {
  const label = type ? type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ') : null
  return [label, employer].filter(Boolean).join(' · ') || '—'
}

function fmtSI(si: number): string {
  if (si >= 10000000) return `₹${(si / 10000000).toFixed(0)} Cr`
  if (si >= 100000) return `₹${si / 100000} L`
  return `₹${(si / 1000).toFixed(0)}K`
}

function fmtPlanTitle(name: string | null | undefined, si: number | null | undefined): string {
  if (!name) return '—'
  return si ? `${name} · ${fmtSI(si)} cover` : name
}

function fmtPremium(total: number | null | undefined): string {
  if (!total) return '—'
  const annual = Math.round(total).toLocaleString('en-IN')
  const monthly = Math.round(total / 12).toLocaleString('en-IN')
  return `₹${annual}/year  (≈ ₹${monthly}/mo)`
}

function fmtRiders(codes: string[] | null | undefined): string {
  if (!codes || codes.length === 0) return 'None'
  return codes.map((c) => RIDER_NAMES[c] ?? c).join(', ')
}

function fmtRelation(r: string): string {
  return r.charAt(0).toUpperCase() + r.slice(1)
}

// ─── Row helper ───────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-foreground font-medium text-right">{value}</span>
    </div>
  )
}

function SectionBlock({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="h-4 w-4 text-primary-700 shrink-0" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{title}</p>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplyStep5() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()
  const [subStep, setSubStep] = useState<ReviewSubStep>('nominee')
  const [completedSubs, setCompletedSubs] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [coverType, setCoverType] = useState<string | undefined>(undefined)
  const [review, setReview] = useState<ProposalReview | null>(null)

  useEffect(() => {
    fetch('/api/journey/proposal')
      .then((r) => r.json())
      .then((d) => { if (d.success) { setReview(d as ProposalReview); setCoverType(d.cover_type as string) } })
      .catch(() => {})
  }, [])

  // ── Nominee state ──────────────────────────────────────────────────────────
  const [nomineeName, setNomineeName] = useState('')
  const [nomineeRelation, setNomineeRelation] = useState('')
  const [nomineeDob, setNomineeDob] = useState('')
  const [nomineeNameError, setNomineeNameError] = useState('')
  const [nomineeRelationError, setNomineeRelationError] = useState('')
  const [nomineeDobError, setNomineeDobError] = useState('')

  // ── Declaration consents ───────────────────────────────────────────────────
  const [consent1, setConsent1] = useState(false)
  const [consent2, setConsent2] = useState(false)
  const [consent3, setConsent3] = useState(false)

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleNomineeNext = () => {
    let valid = true
    if (!nomineeName.trim()) { setNomineeNameError('Enter nominee full name'); valid = false } else setNomineeNameError('')
    if (!nomineeRelation) { setNomineeRelationError('Select relationship'); valid = false } else setNomineeRelationError('')
    if (!nomineeDob) { setNomineeDobError('Enter date of birth'); valid = false } else setNomineeDobError('')
    if (!valid) return
    setCompletedSubs((p) => [...p.filter((s) => s !== 'nominee'), 'nominee'])
    setSubStep('review')
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
    router.push(`/i/${slug}/apply/7`)
  }

  const handleBack = (key: string) => setSubStep(key as ReviewSubStep)

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <JourneyShell
      currentStep={6}
      coverType={coverType}
      subBar={<SubStepper steps={SUB_STEPS} current={subStep} completed={completedSubs} onBack={handleBack} />}
    >
      <AnimatePresence mode="wait">

        {/* ── Substep 1: Nominee ───────────────────────────────────────────── */}
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
                  The person who receives the benefit in case of a claim. As per IRDAI rules, nominee details are mandatory.
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
              Continue to Review
            </Button>
          </motion.div>
        )}

        {/* ── Substep 2: Review + Declaration ─────────────────────────────── */}
        {subStep === 'review' && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            {/* ── Proposal review card ───────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">

              {/* Header with cover type badge */}
              <div className="px-8 pt-6 pb-5 border-b border-border flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Review Your Proposal</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Verify all details before signing the declaration below
                  </p>
                </div>
                {review?.cover_type && (
                  <span className="shrink-0 inline-flex items-center rounded-full bg-primary-50 border border-primary-200 px-3 py-1 text-xs font-semibold text-primary-800">
                    {COVER_TYPE_LABELS[review.cover_type] ?? review.cover_type}
                  </span>
                )}
              </div>

              {/* Plan summary banner */}
              {review?.quote && (
                <div className="mx-8 mt-6 rounded-xl bg-slate-50 border border-border px-5 py-4 flex flex-wrap gap-x-8 gap-y-3">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Plan</p>
                    <p className="text-sm font-semibold text-foreground">{fmtPlanTitle(review.quote.plan_name, review.quote.sum_insured)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Premium</p>
                    <p className="text-sm font-semibold text-foreground">{fmtPremium(review.quote.total_premium)}</p>
                  </div>
                  {review.quote.selected_riders.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Add-ons</p>
                      <p className="text-sm font-semibold text-foreground">{fmtRiders(review.quote.selected_riders)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Details grid */}
              <div className="grid grid-cols-2 divide-x divide-border mt-6">

                {/* Left column */}
                <div className="px-8 pb-6 space-y-6">
                  <SectionBlock icon={User} title="Proposer">
                    <InfoRow label="Name" value={review?.proposer.name ?? '—'} />
                    <InfoRow label="Date of Birth" value={fmtDob(review?.proposer.dob ?? null)} />
                    <InfoRow label="Gender" value={fmtGender(review?.proposer.gender ?? null)} />
                    <InfoRow label="PAN" value={maskPan(review?.proposer.pan ?? null)} />
                  </SectionBlock>

                  <SectionBlock icon={MapPin} title="Contact & Address">
                    <InfoRow label="Mobile" value={review?.proposer.mobile ?? '—'} />
                    <InfoRow label="Email" value={review?.proposer.email ?? '—'} />
                    <InfoRow label="Address" value={fmtAddress(review?.proposer.address ?? null)} />
                  </SectionBlock>

                  <SectionBlock icon={Briefcase} title="Employment">
                    <InfoRow label="Occupation" value={fmtOccupation(review?.proposer.occupation_type ?? null, review?.proposer.employer_name ?? null)} />
                  </SectionBlock>
                </div>

                {/* Right column */}
                <div className="px-8 pb-6 space-y-6">

                  {/* Insured members — shown for family / parents */}
                  {review && review.cover_type !== 'individual' && (
                    <SectionBlock icon={Users} title="Insured Members">
                      {/* Proposer as insured (family floater) */}
                      {review.proposer_is_insured && (
                        <div className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-foreground">{review.proposer.name ?? '—'}</p>
                            <p className="text-xs text-muted-foreground">
                              Proposer · {fmtGender(review.proposer.gender ?? null)}
                              {review.proposer.dob ? ` · Age ${calcAge(review.proposer.dob) ?? '—'}` : ''}
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Other insured members */}
                      {review.members.map((m) => {
                        const age = m.dob ? calcAge(m.dob) : null
                        return (
                          <div key={m.member_id} className="flex items-center justify-between gap-3 py-1.5 border-b border-slate-100 last:border-0">
                            <div>
                              <p className="text-sm font-medium text-foreground">{m.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {fmtRelation(m.relation)} · {fmtGender(m.gender)}
                                {age !== null ? ` · Age ${age}` : ''}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </SectionBlock>
                  )}

                  {/* Nominee (just collected in substep 1) */}
                  <SectionBlock icon={Shield} title="Nominee">
                    <InfoRow label="Name" value={nomineeName || '—'} />
                    <InfoRow label="Relationship" value={nomineeRelation || '—'} />
                    <InfoRow label="Date of Birth" value={fmtDob(nomineeDob || null)} />
                    <InfoRow label="Share" value="100%" />
                  </SectionBlock>
                </div>
              </div>
            </div>

            {/* ── Declaration ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <h2 className="text-base font-bold text-foreground">Declaration</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  As required under IRDAI regulations, please read and confirm each statement below.
                </p>
              </div>
              <div className="px-8 py-5 space-y-3">
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

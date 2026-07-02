'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check, Clock, Info, Shield, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JourneyShell } from '@/components/customer/journey-shell'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentFrequency = 'annual' | 'half-yearly' | 'quarterly' | 'monthly'

interface PlanData {
  plan_name: string
  plan_code: string
  sum_insured: number
  base_annual_premium: number
  gst_percent: number
  policy_fee: number
  claim_sla: string
  network_hospitals: number
  ped_waiting_months: number
  initial_waiting_days: number
  key_benefits: { label: string; note?: string }[]
  key_exclusions: string[]
}

interface RiderOption {
  code: string
  name: string
  description: string
  has_sa_input: boolean
  annual_premium: number
  rate_percent?: number
  max_sa_note?: string
  is_bundled: boolean
}

// ─── Static mock data ─────────────────────────────────────────────────────────

const MOCK_PLAN: PlanData = {
  plan_name: 'Standard Care',
  plan_code: 'SC-001',
  sum_insured: 500000,
  base_annual_premium: 4200,
  gst_percent: 18,
  policy_fee: 200,
  claim_sla: '15 days',
  network_hospitals: 11000,
  ped_waiting_months: 12,
  initial_waiting_days: 30,
  key_benefits: [
    { label: 'In-patient hospitalisation', note: 'Single AC room · 1% of SI per day' },
    { label: 'Day care procedures', note: '540+ procedures covered' },
    { label: 'Pre & post hospitalisation', note: '60 days pre / 90 days post' },
    { label: 'Ambulance cover', note: 'Up to ₹5,000 per event' },
    { label: 'OPD cover', note: 'Up to ₹5,000 per policy year' },
    { label: 'Maternity benefit', note: '36-month waiting · Normal ₹50,000 · C-section ₹75,000' },
    { label: 'Annual health check-up', note: '₹3,000 per insured' },
    { label: 'AYUSH treatment', note: 'Up to ₹30,000 per policy year' },
    { label: 'Mental health inpatient', note: 'As per actuals' },
  ],
  key_exclusions: [
    'Pre-existing diseases — 12-month waiting period',
    'Cosmetic & aesthetic surgery',
    'Dental treatment (non-accidental)',
    'Infertility and assisted reproduction',
    'Self-inflicted injuries',
    'War and terrorism risks',
  ],
}

const RIDERS: RiderOption[] = [
  {
    code: 'CI',
    name: 'Critical Illness',
    description: 'Lump-sum payout on diagnosis of 36 covered critical illnesses including cancer, heart attack and stroke.',
    has_sa_input: true,
    annual_premium: 0,
    rate_percent: 0.36,
    max_sa_note: 'Max: ₹5,00,000 (must not exceed base sum insured)',
    is_bundled: false,
  },
  {
    code: 'PA',
    name: 'Personal Accident',
    description: 'Additional sum assured on accidental death or permanent total disability.',
    has_sa_input: true,
    annual_premium: 0,
    rate_percent: 0.13,
    max_sa_note: 'Max: ₹5,00,000 (must not exceed base sum insured)',
    is_bundled: false,
  },
  {
    code: 'PWB',
    name: 'Premium Waiver Benefit',
    description: 'All future premiums waived on permanent total disability.',
    has_sa_input: false,
    annual_premium: 420,
    is_bundled: true,
  },
  {
    code: 'HDC',
    name: 'Hospital Daily Cash',
    description: '₹500 per day during hospitalisation, up to 30 days per policy year from day 1 of admission.',
    has_sa_input: false,
    annual_premium: 1200,
    is_bundled: true,
  },
]

const FREQUENCY_OPTIONS: { key: PaymentFrequency; label: string; shortLabel: string; divisor: number; loading: number }[] = [
  { key: 'annual',      label: 'Annual',      shortLabel: 'Annual',    divisor: 1,  loading: 1.00 },
  { key: 'half-yearly', label: 'Half-Yearly', shortLabel: 'Half-Yr',   divisor: 2,  loading: 1.02 },
  { key: 'quarterly',   label: 'Quarterly',   shortLabel: 'Quarterly', divisor: 4,  loading: 1.03 },
  { key: 'monthly',     label: 'Monthly',     shortLabel: 'Monthly',   divisor: 12, loading: 1.05 },
]

const PER_PAYMENT_SUFFIX: Record<PaymentFrequency, string> = {
  'annual': '/yr',
  'half-yearly': '/6 mo',
  'quarterly': '/qtr',
  'monthly': '/mo',
}

const SI_OPTIONS = [
  { value: 300000,  label: '₹3L' },
  { value: 500000,  label: '₹5L' },
  { value: 750000,  label: '₹7.5L' },
  { value: 1000000, label: '₹10L' },
  { value: 1500000, label: '₹15L' },
  { value: 2000000, label: '₹20L' },
  { value: 2500000, label: '₹25L' },
  { value: 5000000, label: '₹50L' },
]

// Premium multipliers relative to ₹5L base — derived from industry band pricing
const SI_PREMIUM_MULTIPLIERS: Record<number, number> = {
  200000:   0.45,
  300000:   0.62,
  500000:   1.00,
  750000:   1.32,
  1000000:  1.60,
  1500000:  2.10,
  2000000:  2.55,
  2500000:  2.95,
  5000000:  4.80,
  10000000: 7.20,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSI(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)} Cr`
  return `₹${v / 100000} L`
}

function formatINR(v: number) {
  return `₹${v.toLocaleString('en-IN')}`
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplyStep4() {
  const router = useRouter()
  const { slug } = useParams<{ slug: string }>()

  const [planData, setPlanData] = useState<PlanData | null>(null)
  const [loadingPlan, setLoadingPlan] = useState(true)
  const [frequency, setFrequency] = useState<PaymentFrequency>('annual')
  const [showAllBenefits, setShowAllBenefits] = useState(false)
  const [loading, setLoading] = useState(false)

  // Sum insured selection
  const [selectedSI, setSelectedSI] = useState(500000)
  const [customSIMode, setCustomSIMode] = useState(false)
  const [customSIRaw, setCustomSIRaw] = useState('')
  const [customSIError, setCustomSIError] = useState('')

  // Fetch finalised quote from API
  useEffect(() => {
    async function fetchQuote() {
      try {
        const res = await fetch('/api/journey/quotes')
        const data = await res.json()
        if (data.success && data.plan) {
          setPlanData(data.plan as PlanData)
          setSelectedSI(data.plan.sum_insured)
        } else {
          setPlanData(MOCK_PLAN)
          setSelectedSI(MOCK_PLAN.sum_insured)
        }
      } catch {
        setPlanData(MOCK_PLAN)
      } finally {
        setLoadingPlan(false)
      }
    }
    fetchQuote()
  }, [])

  const bundledRiders = RIDERS.filter((r) => r.is_bundled)

  // Premium calculations — scaled by selected SI relative to API-returned base SI
  const apiBasePremium = planData?.base_annual_premium ?? 0
  const apiBaseSI      = planData?.sum_insured ?? 500000
  const siMultiplier = (() => {
    if (!apiBasePremium) return 1
    const baseM   = SI_PREMIUM_MULTIPLIERS[apiBaseSI]   ?? 1
    const targetM = SI_PREMIUM_MULTIPLIERS[selectedSI]
    if (targetM !== undefined) return targetM / baseM
    return selectedSI / apiBaseSI  // linear for custom values
  })()
  const basePremium = Math.round(apiBasePremium * siMultiplier)
  const freqConfig = FREQUENCY_OPTIONS.find((f) => f.key === frequency)!
  const { loading: freqLoading, divisor } = freqConfig
  const isAnnual = frequency === 'annual'

  const perBase  = basePremium > 0 ? Math.round(basePremium * freqLoading / divisor) : 0
  const perGST   = perBase > 0 ? Math.round(perBase * ((planData?.gst_percent ?? 18) / 100)) : 0
  const perFee   = basePremium > 0 ? Math.round((planData?.policy_fee ?? 200) * freqLoading / divisor) : 0
  const perTotal = perBase > 0 ? perBase + perGST + perFee : 0
  const annualTotal = basePremium > 0 ? Math.round(basePremium * 1.18) + (planData?.policy_fee ?? 200) : 0

  const sfx = PER_PAYMENT_SUFFIX[frequency]
  const fmt = (v: number) => `${formatINR(v)}${isAnnual ? '' : sfx}`

  const handleContinue = async () => {
    if (!planData) return
    setLoading(true)
    try {
      await fetch('/api/journey/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_code: planData.plan_code,
          sum_insured: selectedSI,
          riders: bundledRiders.map((r) => ({ code: r.code, sa: null })),
          payment_frequency: frequency,
          total_premium: perTotal,
        }),
      })
    } catch {
      // continue on API error
    } finally {
      setLoading(false)
    }
    router.push(`/i/${slug}/apply/5`)
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loadingPlan) {
    return (
      <JourneyShell currentStep={4}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
            <div className="h-6 w-6 border-4 border-primary-200 border-t-primary-700 rounded-full animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Calculating your premium…</h2>
          <p className="text-sm text-muted-foreground">Based on your health data and member profile</p>
        </div>
      </JourneyShell>
    )
  }

  if (!planData) return null

  return (
    <JourneyShell currentStep={4}>

      <div className="pb-6 mb-7 border-b border-border">
        <h1 className="text-xl font-bold text-foreground">Your Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your premium has been finalised based on your health assessment. Review your plan and confirm to continue.
        </p>
      </div>

      <div className="xl:flex xl:gap-8 xl:items-start">

        {/* ── Main content ────────────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-8">

          {/* Plan summary card */}
          <div className="bg-white rounded-2xl border-2 border-primary-800 shadow-sm overflow-hidden">
            <div className="px-8 pt-6 pb-5 border-b border-border">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex h-7 w-7 shrink-0 rounded-lg bg-primary-100 items-center justify-center">
                      <Shield className="h-4 w-4 text-primary-700" strokeWidth={1.5} />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      {planData.plan_code}
                    </p>
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{planData.plan_name}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatSI(selectedSI)} cover · {planData.network_hospitals.toLocaleString('en-IN')}+ cashless hospitals
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold text-primary-800">
                    {formatINR(basePremium)}
                    <span className="text-sm font-normal text-muted-foreground">/yr</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Base premium · Excl. GST &amp; riders</p>
                </div>
              </div>
            </div>

            {/* ── Sum Insured Picker ── */}
            <div className="px-8 py-5 border-b border-border bg-slate-50/50">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Cover Amount</p>
              <div className="flex flex-wrap gap-2">
                {SI_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setSelectedSI(opt.value)
                      setCustomSIMode(false)
                      setCustomSIRaw('')
                      setCustomSIError('')
                    }}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200',
                      !customSIMode && selectedSI === opt.value
                        ? 'bg-primary-800 border-primary-800 text-white shadow-sm'
                        : 'bg-white border-border text-foreground hover:border-primary-600/60',
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setCustomSIMode(true)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200',
                    customSIMode
                      ? 'bg-primary-800 border-primary-800 text-white shadow-sm'
                      : 'bg-white border-border text-muted-foreground hover:border-primary-600/60',
                  )}
                >
                  Custom
                </button>
              </div>

              {customSIMode && (
                <div className="mt-3 flex items-center gap-3">
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium pointer-events-none">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={customSIRaw}
                      onChange={(e) => {
                        const raw = e.target.value
                        setCustomSIRaw(raw)
                        const v = parseInt(raw)
                        if (!isNaN(v) && v >= 200000 && v <= 10000000) {
                          setSelectedSI(v)
                          setCustomSIError('')
                        } else {
                          setCustomSIError('Enter an amount between ₹2L and ₹1Cr')
                        }
                      }}
                      placeholder="e.g. 800000"
                      className="pl-8 w-48 rounded-xl border border-border bg-white py-2 pr-3.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary-800/20 focus:border-primary-800 transition-colors"
                    />
                  </div>
                  {customSIRaw && !customSIError && (
                    <p className="text-sm font-semibold text-foreground">= {formatSI(selectedSI)}</p>
                  )}
                </div>
              )}
              {customSIError && (
                <p className="text-[11px] text-red-500 mt-1.5">{customSIError}</p>
              )}
            </div>

            <div className="grid grid-cols-2 divide-x divide-border">
              {/* Benefits */}
              <div className="px-8 py-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Key Benefits</p>
                <div className="space-y-2">
                  {(showAllBenefits ? planData.key_benefits : planData.key_benefits.slice(0, 5)).map((b) => (
                    <div key={b.label} className="flex items-start gap-2">
                      <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" strokeWidth={2.5} />
                      <div>
                        <p className="text-xs font-medium text-foreground">{b.label}</p>
                        {b.note && <p className="text-[11px] text-muted-foreground">{b.note}</p>}
                      </div>
                    </div>
                  ))}
                  {planData.key_benefits.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setShowAllBenefits((v) => !v)}
                      className="text-xs text-primary-700 font-medium hover:underline mt-1"
                    >
                      {showAllBenefits ? '↑ Show less' : `+${planData.key_benefits.length - 5} more benefits`}
                    </button>
                  )}
                </div>
              </div>

              {/* Exclusions + waiting periods */}
              <div className="px-8 py-5 space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Waiting Periods</p>
                  <div className="space-y-1.5">
                    {[
                      { label: 'Initial (all illnesses)', value: `${planData.initial_waiting_days} days` },
                      { label: 'Pre-existing diseases (PED)', value: `${planData.ped_waiting_months} months` },
                      { label: 'Claim settlement SLA', value: planData.claim_sla },
                    ].map((w) => (
                      <div key={w.label} className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{w.label}</span>
                        <span className="text-xs font-semibold text-foreground">{w.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Key Exclusions</p>
                  <ul className="space-y-1">
                    {planData.key_exclusions.map((ex) => (
                      <li key={ex} className="flex items-start gap-1.5 text-xs text-red-600">
                        <span className="shrink-0 mt-0.5 font-bold">·</span>
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Included riders */}
          {bundledRiders.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                Included Riders
              </p>
              <div className="space-y-3">
                {bundledRiders.map((rider) => (
                  <div
                    key={rider.code}
                    className="rounded-2xl border border-border bg-white shadow-sm"
                  >
                    <div className="flex items-start gap-3 p-4">
                      <div className="mt-0.5 h-5 w-5 shrink-0 rounded bg-emerald-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" strokeWidth={3} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-foreground">
                            {rider.name}
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">({rider.code})</span>
                          </p>
                          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700 uppercase tracking-wide">
                            Included
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{rider.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mobile: premium panel inline */}
          <div className="xl:hidden">
            <PremiumPanel
              basePremium={basePremium}
              perTotal={perTotal}
              perBase={perBase}
              perGST={perGST}
              perFee={perFee}
              annualTotal={annualTotal}
              frequency={frequency}
              isAnnual={isAnnual}
              sfx={sfx}
              fmt={fmt}
              onFrequencyChange={setFrequency}
              loading={loading}
              onContinue={handleContinue}
            />
          </div>
        </div>

        {/* ── Right: sticky premium panel (xl+) ───────────────────────────── */}
        <div className="hidden xl:block xl:w-72 shrink-0">
          <div className="sticky top-8">
            <PremiumPanel
              basePremium={basePremium}
              perTotal={perTotal}
              perBase={perBase}
              perGST={perGST}
              perFee={perFee}
              annualTotal={annualTotal}
              frequency={frequency}
              isAnnual={isAnnual}
              sfx={sfx}
              fmt={fmt}
              onFrequencyChange={setFrequency}
              loading={loading}
              onContinue={handleContinue}
            />
          </div>
        </div>

      </div>
    </JourneyShell>
  )
}

// ─── Premium panel ─────────────────────────────────────────────────────────────

function PremiumPanel({
  basePremium, perTotal, perBase, perGST, perFee,
  annualTotal, frequency, isAnnual, sfx, fmt, onFrequencyChange, loading, onContinue,
}: {
  basePremium: number
  perTotal: number
  perBase: number
  perGST: number
  perFee: number
  annualTotal: number
  frequency: PaymentFrequency
  isAnnual: boolean
  sfx: string
  fmt: (v: number) => string
  onFrequencyChange: (f: PaymentFrequency) => void
  loading: boolean
  onContinue: () => void
}) {
  const hasData = basePremium > 0
  const totalLabel: Record<PaymentFrequency, string> = {
    'annual':      'Annual total',
    'half-yearly': 'Half-yearly total',
    'quarterly':   'Quarterly total',
    'monthly':     'Monthly total',
  }

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 space-y-2.5 border-b border-border">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">
          Premium Summary
        </p>

        {/* Payment frequency selector */}
        <div className="flex rounded-lg border border-border overflow-hidden mb-1">
          {FREQUENCY_OPTIONS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFrequencyChange(f.key)}
              className={cn(
                'flex-1 py-1.5 text-[10px] font-semibold transition-all duration-200 border-r last:border-r-0 border-border whitespace-nowrap',
                frequency === f.key
                  ? 'bg-primary-800 text-white'
                  : 'bg-white text-muted-foreground hover:bg-slate-50 hover:text-foreground'
              )}
            >
              {f.shortLabel}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Base premium</span>
          <span className="text-xs text-foreground">{hasData ? fmt(perBase) : '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">GST @ 18%</span>
          <span className="text-xs text-foreground">{hasData ? `+${fmt(perGST)}` : '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">Policy fee</span>
          <span className="text-xs text-foreground">{hasData ? `+${fmt(perFee)}` : '—'}</span>
        </div>
        <div className="border-t border-dashed border-slate-200 pt-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground">{totalLabel[frequency]}</span>
            <span className="text-xs font-bold text-foreground">{hasData ? fmt(perTotal) : '—'}</span>
          </div>
        </div>
        {hasData && !isAnnual && (
          <div className="flex items-start gap-1.5">
            <Info className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">Annual equivalent: {formatINR(annualTotal)}</p>
          </div>
        )}
        {hasData && isAnnual && (
          <div className="flex items-start gap-1.5">
            <Info className="h-3 w-3 text-slate-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-muted-foreground">First year incl. stamp duty ₹10</p>
          </div>
        )}
      </div>

      {hasData && (
        <div className="px-5 py-3 bg-primary-50 border-b border-primary-100">
          <p className="text-[11px] text-primary-700 font-medium">You pay</p>
          <p className="text-lg font-bold text-primary-800 mt-0.5 leading-none">
            {formatINR(perTotal)}
            <span className="text-sm font-normal text-primary-600 ml-0.5">{sfx}</span>
          </p>
        </div>
      )}

      <div className="px-5 py-4">
        <Button
          size="lg"
          className="w-full"
          disabled={!hasData}
          loading={loading}
          rightIcon={!loading ? <ArrowRight className="h-4 w-4" /> : undefined}
          onClick={onContinue}
        >
          {loading ? 'Saving…' : 'Continue to Proposal'}
        </Button>
      </div>
    </div>
  )
}

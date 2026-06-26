'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, Check, Camera, Activity, Heart,
  Wind, Droplets, Zap, Thermometer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubStepper } from '@/components/ui/sub-stepper'
import { cn } from '@/lib/utils'
import { JourneyShell } from '@/components/customer/journey-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthSubStep = 'vitals' | 'conditions' | 'history' | 'scan'
type ScanPhase = 'intro' | 'scanning' | 'result'
type PagePhase = 'loading' | 'health'

interface MemberContext {
  member_id: string
  name: string
  relation: string
  gender?: 'male' | 'female' | 'other'
  is_proposer: boolean
  needs_scan: boolean   // true only for proposer when proposer_is_insured=true
  dob?: string          // YYYY-MM-DD — used to determine age & lifestyle eligibility
}

// ─── Static data ──────────────────────────────────────────────────────────────

const SUB_STEPS_WITH_SCAN = [
  { key: 'vitals',      label: 'Vitals & Habits' },
  { key: 'conditions',  label: 'Conditions' },
  { key: 'history',     label: 'Medical History' },
  { key: 'scan',        label: 'Vitals Scan' },
]

const SUB_STEPS_NO_SCAN = [
  { key: 'vitals',      label: 'Vitals & Habits' },
  { key: 'conditions',  label: 'Conditions' },
  { key: 'history',     label: 'Medical History' },
]

const CONDITIONS = [
  { key: 'diabetes',       label: 'Diabetes / High blood sugar' },
  { key: 'hypertension',   label: 'Hypertension / High blood pressure' },
  { key: 'heart_disease',  label: 'Heart disease / Coronary artery disease' },
  { key: 'thyroid',        label: 'Thyroid disorder' },
  { key: 'asthma',         label: 'Asthma / Chronic respiratory condition' },
  { key: 'kidney',         label: 'Kidney disease' },
  { key: 'liver',          label: 'Liver disease / Hepatitis' },
  { key: 'cancer',         label: 'Cancer or tumour' },
  { key: 'neurological',   label: 'Neurological disorder / Stroke' },
  { key: 'joint',          label: 'Orthopaedic or joint condition' },
  { key: 'digestive',      label: 'Digestive disorder (IBD, IBS)' },
  { key: 'autoimmune',     label: 'Autoimmune condition' },
]

const FAMILY_CONDITIONS = ['Diabetes', 'Hypertension', 'Heart disease', 'Cancer', 'Kidney disease', 'Stroke']

const MOCK_VITALS = {
  heart_rate: 72,
  respiratory_rate: 16,
  blood_pressure: '118/76',
  oxygen_saturation: 98,
  stress_index: 'Low',
  bmi_risk: 'Normal',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getMemberAge(dob?: string): number | null {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function isMinor(member: MemberContext): boolean {
  const age = getMemberAge(member.dob)
  return age !== null && age < 18
}

function memberAvatarClass(gender?: string): string {
  if (gender === 'female') return 'from-rose-100 to-rose-200 text-rose-800'
  if (gender === 'male')   return 'from-blue-100 to-indigo-200 text-indigo-800'
  return 'from-primary-100 to-primary-200 text-primary-800'
}

function genderSymbol(gender?: string): string {
  if (gender === 'male')   return '♂'
  if (gender === 'female') return '♀'
  return ''
}

function calcBmi(height: string, weight: string): string | null {
  const h = parseFloat(height)
  const w = parseFloat(weight)
  if (!h || !w || isNaN(h) || isNaN(w) || h <= 0) return null
  return (w / Math.pow(h / 100, 2)).toFixed(1)
}

function bmiLabel(bmi: string): string {
  const b = parseFloat(bmi)
  if (b < 18.5) return 'Underweight'
  if (b < 25)   return 'Normal'
  if (b < 30)   return 'Overweight'
  return 'Obese'
}

function bmiColor(bmi: string): string {
  const b = parseFloat(bmi)
  if (b < 18.5) return 'bg-blue-50 border-blue-200 text-blue-700'
  if (b < 25)   return 'bg-emerald-50 border-emerald-200 text-emerald-700'
  if (b < 30)   return 'bg-amber-50 border-amber-200 text-amber-700'
  return 'bg-rose-50 border-rose-200 text-rose-700'
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function YesNo({
  value,
  onChange,
}: {
  value: boolean | null
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex gap-2 shrink-0">
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            'px-3.5 py-1 rounded-full text-xs font-semibold border transition-all duration-200',
            value === v
              ? v
                ? 'bg-red-500 border-red-500 text-white'
                : 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-white border-border text-muted-foreground hover:border-foreground/30',
          )}
        >
          {v ? 'Yes' : 'No'}
        </button>
      ))}
    </div>
  )
}

function MemberChips({
  members,
  selected,
  noOne,
  noOneLabel = 'No one',
  onToggle,
  onNoOne,
}: {
  members: MemberContext[]
  selected: Set<string>
  noOne: boolean
  noOneLabel?: string
  onToggle: (id: string) => void
  onNoOne: () => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {members.map((m) => (
        <button
          key={m.member_id}
          type="button"
          onClick={() => onToggle(m.member_id)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
            selected.has(m.member_id)
              ? 'bg-primary-800 border-primary-800 text-white'
              : 'bg-white border-border text-foreground hover:border-primary-600/60',
          )}
        >
          {m.name}
        </button>
      ))}
      <button
        type="button"
        onClick={onNoOne}
        className={cn(
          'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
          noOne
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'bg-white border-border text-foreground hover:border-emerald-500/60',
        )}
      >
        {noOneLabel}
      </button>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApplyStep3() {
  const router = useRouter()

  const [pagePhase, setPagePhase]         = useState<PagePhase>('loading')
  const [memberList, setMemberList]       = useState<MemberContext[]>([])
  const [subStep, setSubStep]             = useState<HealthSubStep>('vitals')
  const [completedSubs, setCompletedSubs] = useState<string[]>([])
  const [submitLoading, setSubmitLoading] = useState(false)

  // ── Sub-step 1: Measurements & Lifestyle ──────────────────────────────────
  // measurements[member_id] = { height, weight }
  const [measurements, setMeasurements] = useState<Record<string, { height: string; weight: string }>>({})
  const [measErrors,   setMeasErrors]   = useState<Record<string, { height?: string; weight?: string }>>({})

  // Lifestyle — chips for multi-member, Yes/No for single member
  // All three follow the same pattern: Set of member_ids who answer Yes + a "none" flag
  const [smokingMembers,    setSmokingMembers]    = useState<Set<string>>(new Set())
  const [noSmoking,         setNoSmoking]         = useState(false)
  const [alcoholMembers,    setAlcoholMembers]    = useState<Set<string>>(new Set())
  const [noAlcohol,         setNoAlcohol]         = useState(false)
  const [tobaccoMembers,    setTobaccoMembers]    = useState<Set<string>>(new Set())
  const [noTobacco,         setNoTobacco]         = useState(false)

  // ── Sub-step 2: Conditions (condition-first matrix) ───────────────────────
  // conditionMembers[conditionKey] = Set<member_id>
  const [conditionMembers,  setConditionMembers]  = useState<Record<string, Set<string>>>({})
  // conditionDetails[member_id][conditionKey] = freetext
  const [conditionDetails,  setConditionDetails]  = useState<Record<string, Record<string, string>>>({})
  const [noneConditions,    setNoneConditions]    = useState(false)

  // ── Sub-step 3: Medical History ───────────────────────────────────────────
  // Family history — proposer's parents & siblings (only shown when proposer is in memberList)
  const [parentConds,      setParentConds]      = useState<Set<string>>(new Set())
  const [parentDetails,    setParentDetails]    = useState<Record<string, string>>({})
  const [siblingConds,     setSiblingConds]     = useState<Set<string>>(new Set())
  const [siblingDetails,   setSiblingDetails]   = useState<Record<string, string>>({})
  const [noFamilyHistory,  setNoFamilyHistory]  = useState(false)

  // Surgery screening — member chips
  const [surgeryMembers,  setSurgeryMembers]  = useState<Set<string>>(new Set())
  const [surgeryDetails,  setSurgeryDetails]  = useState<Record<string, string>>({})
  const [noSurgery,       setNoSurgery]       = useState(false)

  // Hospitalisation — proposer only (not shown for parents plan)
  const [hospitalisedMembers, setHospitalisedMembers] = useState<Set<string>>(new Set())
  const [hospitalisedDetails, setHospitalisedDetails] = useState<Record<string, string>>({})
  const [noHospitalised,      setNoHospitalised]      = useState(false)

  // Medications screening — member chips
  const [medicationMembers, setMedicationMembers] = useState<Set<string>>(new Set())
  const [medicationDetails, setMedicationDetails] = useState<Record<string, string>>({})
  const [noMedication,      setNoMedication]      = useState(false)

  // ── Sub-step 4: NuralX ───────────────────────────────────────────────────
  const [scanPhase,    setScanPhase]    = useState<ScanPhase>('intro')
  const [scanProgress, setScanProgress] = useState(0)
  const scanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Derived ───────────────────────────────────────────────────────────────
  const proposer        = memberList.find((m) => m.is_proposer) ?? null
  const isMultiMember   = memberList.length > 1
  const hasScanMember   = memberList.some((m) => m.needs_scan)
  const subSteps        = hasScanMember ? SUB_STEPS_WITH_SCAN : SUB_STEPS_NO_SCAN
  // Members eligible for lifestyle questions (exclude children under 16)
  const lifestyleEligible = memberList.filter((m) => !isMinor(m))

  // ── Load members on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const res  = await fetch('/api/journey/members')
        const data = await res.json()
        if (!cancelled && data.success) {
          init(data.members as MemberContext[])
        } else if (!cancelled) {
          fallback()
        }
      } catch {
        if (!cancelled) fallback()
      } finally {
        if (!cancelled) setPagePhase('health')
      }
    }

    function init(members: MemberContext[]) {
      setMemberList(members)
      const m: Record<string, { height: string; weight: string }> = {}
      for (const mb of members) m[mb.member_id] = { height: '', weight: '' }
      setMeasurements(m)
    }

    function fallback() {
      const mb: MemberContext = { member_id: 'proposer', name: 'You', relation: 'self', is_proposer: true, needs_scan: true }
      setMemberList([mb])
      setMeasurements({ proposer: { height: '', weight: '' } })
    }

    load()
    return () => {
      cancelled = true
      if (scanTimerRef.current) clearInterval(scanTimerRef.current)
    }
  }, [])

  // ── Navigation helpers ────────────────────────────────────────────────────
  const advance = (from: HealthSubStep, to: HealthSubStep) => {
    setCompletedSubs((p) => [...p.filter((s) => s !== from), from])
    setSubStep(to)
  }

  const handleBack = (key: string) => setSubStep(key as HealthSubStep)

  // ── Sub-step 1 validation ─────────────────────────────────────────────────
  const vitalsReady =
    Object.entries(measurements).every(([, m]) => {
      const h = parseFloat(m.height)
      const w = parseFloat(m.weight)
      return m.height && m.weight && !isNaN(h) && !isNaN(w) && h >= 100 && h <= 250 && w >= 30 && w <= 250
    }) &&
    (lifestyleEligible.length === 0 || smokingMembers.size > 0 || noSmoking) &&
    (lifestyleEligible.length === 0 || alcoholMembers.size > 0 || noAlcohol) &&
    (lifestyleEligible.length === 0 || tobaccoMembers.size > 0 || noTobacco)

  const handleVitalsNext = () => {
    const errors: Record<string, { height?: string; weight?: string }> = {}
    let valid = true
    for (const m of memberList) {
      const meas = measurements[m.member_id]
      const h = parseFloat(meas?.height ?? '')
      const w = parseFloat(meas?.weight ?? '')
      const e: { height?: string; weight?: string } = {}
      if (!meas?.height || isNaN(h) || h < 100 || h > 250) { e.height = 'Enter a valid height (100–250 cm)'; valid = false }
      if (!meas?.weight || isNaN(w) || w < 30  || w > 250)  { e.weight = 'Enter a valid weight (30–250 kg)';  valid = false }
      if (e.height || e.weight) errors[m.member_id] = e
    }
    setMeasErrors(errors)
    if (!valid || !vitalsReady) return
    advance('vitals', 'conditions')
  }

  // ── Sub-step 2 helpers ────────────────────────────────────────────────────
  const toggleConditionMember = (condKey: string, memberId: string) => {
    setNoneConditions(false)
    setConditionMembers((prev) => {
      const next    = { ...prev }
      const current = new Set(next[condKey] ?? [])
      if (current.has(memberId)) {
        current.delete(memberId)
        setConditionDetails((d) => {
          const nd = { ...d }
          if (nd[memberId]) { const nm = { ...nd[memberId] }; delete nm[condKey]; nd[memberId] = nm }
          return nd
        })
      } else {
        current.add(memberId)
      }
      next[condKey] = current
      return next
    })
  }

  const conditionsAnswered =
    noneConditions || CONDITIONS.some((c) => (conditionMembers[c.key]?.size ?? 0) > 0)

  // ── Sub-step 3 validation ─────────────────────────────────────────────────
  const historyReady = (() => {
    if (proposer) {
      if (!noFamilyHistory && parentConds.size === 0 && siblingConds.size === 0) return false
    }
    if (!noSurgery      && surgeryMembers.size === 0)      return false
    if (!noHospitalised && hospitalisedMembers.size === 0) return false
    if (!noMedication   && medicationMembers.size === 0)   return false
    return true
  })()

  const handleHistoryNext = () => {
    if (!historyReady) return
    if (hasScanMember) advance('history', 'scan')
    else submitAll()
  }

  // ── Generic history member toggle ─────────────────────────────────────────
  const toggleHistoryMember = (
    setter:        React.Dispatch<React.SetStateAction<Set<string>>>,
    noSetter:      React.Dispatch<React.SetStateAction<boolean>>,
    detailsSetter: React.Dispatch<React.SetStateAction<Record<string, string>>>,
    memberId: string,
  ) => {
    noSetter(false)
    setter((prev) => {
      const next = new Set(prev)
      if (next.has(memberId)) {
        next.delete(memberId)
        detailsSetter((d) => { const nd = { ...d }; delete nd[memberId]; return nd })
      } else {
        next.add(memberId)
      }
      return next
    })
  }

  // ── Build & submit API payload ────────────────────────────────────────────
  const submitAll = async (scanVitals?: typeof MOCK_VITALS) => {
    setSubmitLoading(true)
    try {
      const members = memberList.map((m) => {
        const meas = measurements[m.member_id]
        const ped  = CONDITIONS.filter((c) => conditionMembers[c.key]?.has(m.member_id)).map((c) => c.key)

        return {
          member_id:    m.member_id,
          relation:     m.relation,
          is_proposer:  m.is_proposer,
          height_cm:    parseFloat(meas?.height ?? '') || null,
          weight_kg:    parseFloat(meas?.weight ?? '') || null,
          is_smoker:           isMinor(m) ? false : smokingMembers.has(m.member_id),
          alcohol_consumption: isMinor(m) ? 'none' : alcoholMembers.has(m.member_id) ? 'regular' : 'none',
          uses_tobacco:        isMinor(m) ? false : tobaccoMembers.has(m.member_id),
          family_history: m.is_proposer ? {
            has_family_history: !noFamilyHistory && (parentConds.size > 0 || siblingConds.size > 0),
            parent_conditions:  Array.from(parentConds),
            parent_details:     parentDetails,
            sibling_conditions: Array.from(siblingConds),
            sibling_details:    siblingDetails,
          } : undefined,
          was_hospitalised:      hospitalisedMembers.has(m.member_id),
          hospitalisation_notes: hospitalisedDetails[m.member_id] ?? null,
          // All members
          ped_conditions:   ped,
          condition_details: Object.fromEntries(ped.map((key) => [key, conditionDetails[m.member_id]?.[key] ?? ''])),
          has_surgery:       surgeryMembers.has(m.member_id),
          surgery_details:   surgeryDetails[m.member_id] ?? null,
          is_on_medication:  medicationMembers.has(m.member_id),
          medication_details: medicationDetails[m.member_id] ?? null,
          nuralx_vitals:     m.needs_scan && scanVitals ? scanVitals : null,
          declaration_accurate: true,
        }
      })

      const res = await fetch('/api/journey/medical', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ members }),
      })
      if (!res.ok) console.error('[step3] medical API error:', await res.json().catch(() => ({})))
    } catch {
      // don't block navigation on API error
    } finally {
      setSubmitLoading(false)
    }
    router.push('/apply/4')
  }

  // ── NuralX scan ───────────────────────────────────────────────────────────
  const startScan = () => {
    setScanPhase('scanning')
    setScanProgress(0)
    let p = 0
    scanTimerRef.current = setInterval(() => {
      p += 1.5
      setScanProgress(Math.min(p, 100))
      if (p >= 100) {
        clearInterval(scanTimerRef.current!)
        setTimeout(() => setScanPhase('result'), 500)
      }
    }, 80)
  }

  // ─── Loading state ────────────────────────────────────────────────────────

  if (pagePhase === 'loading') {
    return (
      <JourneyShell currentStep={3}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
            <div className="h-6 w-6 border-4 border-primary-200 border-t-primary-700 rounded-full animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Preparing health assessment…</h2>
          <p className="text-sm text-muted-foreground">Loading your cover details</p>
        </div>
      </JourneyShell>
    )
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <JourneyShell
      currentStep={3}
      subBar={
        <SubStepper
          steps={subSteps}
          current={subStep}
          completed={completedSubs}
          onBack={handleBack}
        />
      }
    >
      <AnimatePresence mode="wait">

        {/* ══════════════════════════════════════════════════════════════════
            SUB-STEP 1 — VITALS & HABITS
        ══════════════════════════════════════════════════════════════════ */}
        {subStep === 'vitals' && (
          <motion.div
            key="vitals"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Vitals & Habits</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Body measurements and lifestyle for {isMultiMember ? 'all insured members' : 'your health assessment'}
                </p>
              </div>

              {/* ── Two-column body: measurements (left) + lifestyle (right) ── */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] divide-y lg:divide-y-0 lg:divide-x divide-border/60">

                {/* LEFT — 2-per-row grid of compact member cards */}
                <div className="px-6 py-6">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">
                    Body Measurements
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {memberList.map((m) => {
                      const meas = measurements[m.member_id] ?? { height: '', weight: '' }
                      const errs = measErrors[m.member_id] ?? {}
                      const bmi  = calcBmi(meas.height, meas.weight)
                      const age  = getMemberAge(m.dob)
                      const sym  = genderSymbol(m.gender)

                      return (
                        <div
                          key={m.member_id}
                          className="rounded-2xl border border-border bg-gradient-to-br from-white to-slate-50/80 p-4 shadow-sm space-y-3"
                        >
                          {/* Member header */}
                          <div className="flex items-center gap-2.5">
                            <div className={cn(
                              'h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm',
                              memberAvatarClass(m.gender),
                            )}>
                              <span className="text-xs font-bold">
                                {m.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1">
                                <p className="text-sm font-semibold text-foreground truncate leading-tight">{m.name}</p>
                                {sym && <span className="text-[11px] text-muted-foreground">{sym}</span>}
                              </div>
                              <p className="text-[11px] text-muted-foreground capitalize leading-tight">
                                {m.relation}{age !== null ? ` · ${age} yrs` : ''}
                              </p>
                            </div>
                          </div>

                          {/* Compact height + weight inputs */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Height (cm)
                              </label>
                              <input
                                type="number"
                                placeholder="170"
                                value={meas.height}
                                onChange={(e) => {
                                  setMeasurements((prev) => ({ ...prev, [m.member_id]: { ...prev[m.member_id], height: e.target.value } }))
                                  setMeasErrors((prev) => ({ ...prev, [m.member_id]: { ...prev[m.member_id], height: undefined } }))
                                }}
                                className={cn(
                                  'w-full text-sm font-medium text-foreground placeholder:text-slate-300 rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-colors bg-white',
                                  errs.height ? 'border-red-400' : 'border-border',
                                )}
                              />
                              {errs.height && <p className="text-[10px] text-red-500 mt-1">{errs.height}</p>}
                            </div>
                            <div>
                              <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                                Weight (kg)
                              </label>
                              <input
                                type="number"
                                placeholder="70"
                                value={meas.weight}
                                onChange={(e) => {
                                  setMeasurements((prev) => ({ ...prev, [m.member_id]: { ...prev[m.member_id], weight: e.target.value } }))
                                  setMeasErrors((prev) => ({ ...prev, [m.member_id]: { ...prev[m.member_id], weight: undefined } }))
                                }}
                                className={cn(
                                  'w-full text-sm font-medium text-foreground placeholder:text-slate-300 rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-colors bg-white',
                                  errs.weight ? 'border-red-400' : 'border-border',
                                )}
                              />
                              {errs.weight && <p className="text-[10px] text-red-500 mt-1">{errs.weight}</p>}
                            </div>
                          </div>

                          {/* Color-coded BMI badge */}
                          {bmi ? (
                            <div className={cn(
                              'flex items-center gap-1.5 text-xs rounded-lg border px-2.5 py-1.5 w-fit font-medium',
                              bmiColor(bmi),
                            )}>
                              <Activity className="h-3 w-3 shrink-0" />
                              BMI {bmi} · {bmiLabel(bmi)}
                            </div>
                          ) : (
                            <div className="h-7" /> // placeholder to keep card height consistent
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* RIGHT — Lifestyle (all three questions, identical chip pattern) */}
                <div className="px-6 py-6 space-y-6">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                    Lifestyle
                  </p>

                  {lifestyleEligible.length > 0 && ([
                    {
                      label:      isMultiMember ? 'Who smokes (cigarettes, bidis)?' : 'Do you smoke (cigarettes, bidis)?',
                      members:    smokingMembers,
                      setMembers: setSmokingMembers,
                      noOne:      noSmoking,
                      setNoOne:   setNoSmoking,
                    },
                    {
                      label:      isMultiMember ? 'Who drinks alcohol regularly?' : 'Do you consume alcohol regularly?',
                      members:    alcoholMembers,
                      setMembers: setAlcoholMembers,
                      noOne:      noAlcohol,
                      setNoOne:   setNoAlcohol,
                    },
                    {
                      label:      isMultiMember ? 'Who uses tobacco (pan, gutka)?' : 'Do you use tobacco (pan, gutka)?',
                      members:    tobaccoMembers,
                      setMembers: setTobaccoMembers,
                      noOne:      noTobacco,
                      setNoOne:   setNoTobacco,
                    },
                  ]).map(({ label, members, setMembers, noOne, setNoOne }) => (
                    <div key={label} className="space-y-2.5">
                      <p className="text-sm font-medium text-foreground">{label}</p>
                      {isMultiMember ? (
                        <MemberChips
                          members={lifestyleEligible}
                          selected={members}
                          noOne={noOne}
                          noOneLabel="No one"
                          onToggle={(id) => {
                            setNoOne(false)
                            setMembers((prev) => {
                              const next = new Set(prev)
                              next.has(id) ? next.delete(id) : next.add(id)
                              return next
                            })
                          }}
                          onNoOne={() => { setNoOne((v) => !v); setMembers(new Set()) }}
                        />
                      ) : (
                        <YesNo
                          value={members.has(memberList[0]?.member_id ?? '') ? true : noOne ? false : null}
                          onChange={(v) => {
                            if (v) { setMembers(new Set([memberList[0]?.member_id ?? ''])); setNoOne(false) }
                            else   { setMembers(new Set()); setNoOne(true) }
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>

              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={handleVitalsNext}
              disabled={!vitalsReady}
            >
              Continue
            </Button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SUB-STEP 2 — CONDITIONS (condition-first matrix)
        ══════════════════════════════════════════════════════════════════ */}
        {subStep === 'conditions' && (
          <motion.div
            key="conditions"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Pre-existing Conditions</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {isMultiMember
                  ? 'Select the family members who have each condition. Leave blank if no one does.'
                  : 'Select any conditions diagnosed in the past. Leave blank if none apply.'}
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 py-5 space-y-1">
                {CONDITIONS.map((c) => {
                  const selectedIds = conditionMembers[c.key] ?? new Set<string>()
                  const hasSelection = selectedIds.size > 0

                  return (
                    <div
                      key={c.key}
                      className={cn(
                        'rounded-xl border transition-all duration-200',
                        hasSelection ? 'border-primary-200 bg-primary-50/40 mb-1' : 'border-transparent',
                      )}
                    >
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <span className="flex-1 text-sm text-foreground">{c.label}</span>

                        {isMultiMember ? (
                          /* Multi-member: one chip per person */
                          <div className="flex flex-wrap gap-1.5 justify-end">
                            {memberList.map((m) => (
                              <button
                                key={m.member_id}
                                type="button"
                                onClick={() => toggleConditionMember(c.key, m.member_id)}
                                className={cn(
                                  'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all duration-200',
                                  selectedIds.has(m.member_id)
                                    ? 'bg-primary-800 border-primary-800 text-white'
                                    : 'bg-white border-border text-muted-foreground hover:border-primary-400/60',
                                )}
                              >
                                {m.name}
                              </button>
                            ))}
                          </div>
                        ) : (
                          /* Single member: simple checkbox */
                          <button
                            type="button"
                            onClick={() => {
                              setNoneConditions(false)
                              const proposerId = memberList[0]?.member_id
                              if (!proposerId) return
                              setConditionMembers((prev) => {
                                const next    = { ...prev }
                                const current = new Set(next[c.key] ?? [])
                                if (current.has(proposerId)) {
                                  current.delete(proposerId)
                                  setConditionDetails((d) => {
                                    const nd = { ...d }
                                    if (nd[proposerId]) { const nm = { ...nd[proposerId] }; delete nm[c.key]; nd[proposerId] = nm }
                                    return nd
                                  })
                                } else {
                                  current.add(proposerId)
                                }
                                next[c.key] = current
                                return next
                              })
                            }}
                            className={cn(
                              'flex h-5 w-5 shrink-0 rounded border-2 items-center justify-center transition-colors',
                              hasSelection ? 'border-primary-800 bg-primary-800' : 'border-border bg-white',
                            )}
                          >
                            {hasSelection && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </button>
                        )}
                      </div>

                      {/* Inline detail fields per selected member */}
                      {hasSelection && (
                        <div className="px-3 pb-3 space-y-2">
                          {Array.from(selectedIds).map((memberId) => {
                            const m = memberList.find((mb) => mb.member_id === memberId)
                            return (
                              <div key={memberId}>
                                {isMultiMember && (
                                  <p className="text-[11px] font-semibold text-primary-700 mb-1">{m?.name}</p>
                                )}
                                <textarea
                                  value={conditionDetails[memberId]?.[c.key] ?? ''}
                                  onChange={(e) =>
                                    setConditionDetails((prev) => ({
                                      ...prev,
                                      [memberId]: { ...(prev[memberId] ?? {}), [c.key]: e.target.value },
                                    }))
                                  }
                                  placeholder="Year diagnosed, current treatment, medications (optional)"
                                  rows={2}
                                  className="w-full text-sm text-foreground placeholder:text-muted-foreground/50 rounded-xl border border-border bg-white px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-colors"
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* None of the above */}
                <div className="pt-3 mt-1 border-t border-border/60">
                  <label
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors select-none',
                      noneConditions ? 'bg-emerald-50' : 'hover:bg-muted/40',
                    )}
                    onClick={() => {
                      setNoneConditions((v) => !v)
                      setConditionMembers({})
                      setConditionDetails({})
                    }}
                  >
                    <div className={cn(
                      'flex h-5 w-5 shrink-0 rounded border-2 items-center justify-center transition-colors',
                      noneConditions ? 'border-emerald-500 bg-emerald-500' : 'border-border bg-white',
                    )}>
                      {noneConditions && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium text-foreground">
                      {isMultiMember ? 'No one has any of the above' : 'None of the above'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              disabled={!conditionsAnswered}
              onClick={() => advance('conditions', 'history')}
            >
              Continue
            </Button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SUB-STEP 3 — MEDICAL HISTORY
        ══════════════════════════════════════════════════════════════════ */}
        {subStep === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Medical History</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Surgical history, medications, and family background
              </p>
            </div>

            {/* ── FAMILY HISTORY — proposer only, hidden for parents plan ── */}
            {proposer && (
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-8 pt-6 pb-5 border-b border-border">
                  <p className="text-sm font-semibold text-foreground">Your family history</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Hereditary conditions in your parents or siblings
                  </p>
                </div>
                <div className="grid grid-cols-2 divide-x divide-border">
                  {[
                    { label: 'Parents',  conds: parentConds,  setConds: setParentConds,  details: parentDetails,  setDetails: setParentDetails },
                    { label: 'Siblings', conds: siblingConds, setConds: setSiblingConds, details: siblingDetails, setDetails: setSiblingDetails },
                  ].map(({ label, conds, setConds, details, setDetails }) => (
                    <div key={label} className="px-8 py-6 space-y-4">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">{label}</p>
                      <div className="flex flex-wrap gap-2">
                        {FAMILY_CONDITIONS.map((fc) => {
                          const sel = conds.has(fc)
                          return (
                            <button
                              key={fc}
                              type="button"
                              onClick={() => {
                                setNoFamilyHistory(false)
                                setConds((prev) => {
                                  const next = new Set(prev)
                                  if (next.has(fc)) {
                                    next.delete(fc)
                                    setDetails((d) => { const nd = { ...d }; delete nd[fc]; return nd })
                                  } else next.add(fc)
                                  return next
                                })
                              }}
                              className={cn(
                                'px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200',
                                sel
                                  ? 'bg-primary-800 border-primary-800 text-white'
                                  : 'bg-white border-border text-foreground hover:border-primary-600/60',
                              )}
                            >
                              {fc}
                            </button>
                          )
                        })}
                      </div>
                      {conds.size > 0 && (
                        <div className="space-y-3 pt-3 border-t border-border/60">
                          {Array.from(conds).map((fc) => (
                            <div key={fc}>
                              <label className="block text-xs font-medium text-foreground mb-1.5">{fc}</label>
                              <textarea
                                value={details[fc] ?? ''}
                                onChange={(e) => setDetails((prev) => ({ ...prev, [fc]: e.target.value }))}
                                placeholder="e.g. Father diagnosed at 55, managed with medication…"
                                rows={2}
                                className="w-full text-sm text-foreground placeholder:text-muted-foreground/50 rounded-xl border border-border bg-white px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-colors"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="px-8 py-5 border-t border-border/60">
                  <label
                    className="flex items-center gap-3 cursor-pointer select-none"
                    onClick={() => {
                      const next = !noFamilyHistory
                      setNoFamilyHistory(next)
                      if (next) { setParentConds(new Set()); setParentDetails({}); setSiblingConds(new Set()); setSiblingDetails({}) }
                    }}
                  >
                    <div className={cn(
                      'flex h-5 w-5 shrink-0 rounded border-2 items-center justify-center transition-colors',
                      noFamilyHistory ? 'border-emerald-500 bg-emerald-500' : 'border-border bg-white',
                    )}>
                      {noFamilyHistory && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                    </div>
                    <span className="text-sm font-medium text-foreground">No known family history</span>
                  </label>
                </div>
              </div>
            )}

            {/* ── SURGICAL + MEDICATIONS SCREENING ── */}
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <p className="text-sm font-semibold text-foreground">Surgical & Medication History</p>
              </div>

              <div className="divide-y divide-border/60">

                {/* Surgery */}
                <div className="px-8 py-5 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {isMultiMember ? 'Who has had surgery in the past 5 years?' : 'Have you had surgery in the past 5 years?'}
                  </p>
                  {isMultiMember ? (
                    <MemberChips
                      members={memberList}
                      selected={surgeryMembers}
                      noOne={noSurgery}
                      noOneLabel="No one"
                      onToggle={(id) => toggleHistoryMember(setSurgeryMembers, setNoSurgery, setSurgeryDetails, id)}
                      onNoOne={() => { setNoSurgery((v) => !v); setSurgeryMembers(new Set()); setSurgeryDetails({}) }}
                    />
                  ) : (
                    <YesNo
                      value={surgeryMembers.size > 0 ? true : noSurgery ? false : null}
                      onChange={(v) => {
                        if (v) { setSurgeryMembers(new Set([memberList[0]?.member_id ?? ''])); setNoSurgery(false) }
                        else   { setSurgeryMembers(new Set()); setSurgeryDetails({}); setNoSurgery(true) }
                      }}
                    />
                  )}
                  {surgeryMembers.size > 0 && (
                    <div className="space-y-2 pt-1">
                      {Array.from(surgeryMembers).map((id) => {
                        const m = memberList.find((mb) => mb.member_id === id)
                        return (
                          <div key={id}>
                            {isMultiMember && (
                              <p className="text-[11px] font-semibold text-primary-700 mb-1">{m?.name}</p>
                            )}
                            <textarea
                              value={surgeryDetails[id] ?? ''}
                              onChange={(e) => setSurgeryDetails((prev) => ({ ...prev, [id]: e.target.value }))}
                              placeholder="Type of surgery, year, hospital (brief)…"
                              rows={2}
                              className="w-full text-sm text-foreground placeholder:text-muted-foreground/50 rounded-xl border border-border bg-white px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-colors"
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Hospitalisation */}
                <div className="px-8 py-5 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {isMultiMember ? 'Who has been hospitalised (non-surgery) in the last 2 years?' : 'Have you been hospitalised (non-surgery) in the last 2 years?'}
                  </p>
                  {isMultiMember ? (
                    <MemberChips
                      members={memberList}
                      selected={hospitalisedMembers}
                      noOne={noHospitalised}
                      noOneLabel="No one"
                      onToggle={(id) => toggleHistoryMember(setHospitalisedMembers, setNoHospitalised, setHospitalisedDetails, id)}
                      onNoOne={() => { setNoHospitalised((v) => !v); setHospitalisedMembers(new Set()); setHospitalisedDetails({}) }}
                    />
                  ) : (
                    <YesNo
                      value={hospitalisedMembers.size > 0 ? true : noHospitalised ? false : null}
                      onChange={(v) => {
                        if (v) { setHospitalisedMembers(new Set([memberList[0]?.member_id ?? ''])); setNoHospitalised(false) }
                        else   { setHospitalisedMembers(new Set()); setHospitalisedDetails({}); setNoHospitalised(true) }
                      }}
                    />
                  )}
                  {hospitalisedMembers.size > 0 && (
                    <div className="space-y-2 pt-1">
                      {Array.from(hospitalisedMembers).map((id) => {
                        const m = memberList.find((mb) => mb.member_id === id)
                        return (
                          <div key={id}>
                            {isMultiMember && (
                              <p className="text-[11px] font-semibold text-primary-700 mb-1">{m?.name}</p>
                            )}
                            <textarea
                              value={hospitalisedDetails[id] ?? ''}
                              onChange={(e) => setHospitalisedDetails((prev) => ({ ...prev, [id]: e.target.value }))}
                              placeholder="Reason, year, duration of stay…"
                              rows={2}
                              className="w-full text-sm text-foreground placeholder:text-muted-foreground/50 rounded-xl border border-border bg-white px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-colors"
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* Regular medications */}
                <div className="px-8 py-5 space-y-3">
                  <p className="text-sm font-medium text-foreground">
                    {isMultiMember ? 'Who is currently on regular medication?' : 'Are you currently on regular medication?'}
                  </p>
                  {isMultiMember ? (
                    <MemberChips
                      members={memberList}
                      selected={medicationMembers}
                      noOne={noMedication}
                      noOneLabel="No one"
                      onToggle={(id) => toggleHistoryMember(setMedicationMembers, setNoMedication, setMedicationDetails, id)}
                      onNoOne={() => { setNoMedication((v) => !v); setMedicationMembers(new Set()); setMedicationDetails({}) }}
                    />
                  ) : (
                    <YesNo
                      value={medicationMembers.size > 0 ? true : noMedication ? false : null}
                      onChange={(v) => {
                        if (v) { setMedicationMembers(new Set([memberList[0]?.member_id ?? ''])); setNoMedication(false) }
                        else   { setMedicationMembers(new Set()); setMedicationDetails({}); setNoMedication(true) }
                      }}
                    />
                  )}
                  {medicationMembers.size > 0 && (
                    <div className="space-y-2 pt-1">
                      {Array.from(medicationMembers).map((id) => {
                        const m = memberList.find((mb) => mb.member_id === id)
                        return (
                          <div key={id}>
                            {isMultiMember && (
                              <p className="text-[11px] font-semibold text-primary-700 mb-1">{m?.name}</p>
                            )}
                            <textarea
                              value={medicationDetails[id] ?? ''}
                              onChange={(e) => setMedicationDetails((prev) => ({ ...prev, [id]: e.target.value }))}
                              placeholder="Medicine names and doses…"
                              rows={2}
                              className="w-full text-sm text-foreground placeholder:text-muted-foreground/50 rounded-xl border border-border bg-white px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500/60 transition-colors"
                            />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>

            <Button
              size="lg"
              className="w-full"
              loading={submitLoading && !hasScanMember}
              rightIcon={!submitLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
              disabled={!historyReady}
              onClick={handleHistoryNext}
            >
              {hasScanMember ? 'Continue to Vitals Scan' : submitLoading ? 'Saving…' : 'Continue'}
            </Button>
          </motion.div>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            SUB-STEP 4 — NURALX VITALS SCAN
            Only rendered when at least one member has needs_scan=true.
            For parents plan: proposer is NOT in memberList, so hasScanMember=false
            and this entire sub-step is skipped.
        ══════════════════════════════════════════════════════════════════ */}
        {subStep === 'scan' && hasScanMember && (
          <motion.div
            key="scan"
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            {/* ── Intro ── */}
            {scanPhase === 'intro' && (
              <>
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="px-8 pt-6 pb-5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 shrink-0">
                        <Camera className="h-5 w-5 text-primary-700" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-foreground tracking-tight">Contactless Vitals Scan</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          A 30-second face scan measures your key health vitals — no wearable needed
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-border">
                    <div className="px-8 py-6 space-y-4">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">What we measure</p>
                      <div className="space-y-3">
                        {[
                          { icon: Heart,    label: 'Heart rate',           desc: 'Estimated from facial micro blood-flow' },
                          { icon: Wind,     label: 'Respiratory rate',     desc: 'Analysed from subtle breathing movements' },
                          { icon: Droplets, label: 'Blood oxygen (SpO₂)',  desc: 'Detected from skin micro-fluctuations' },
                          { icon: Zap,      label: 'Stress index',         desc: 'HRV-based stress level estimation' },
                        ].map(({ icon: Icon, label, desc }) => (
                          <div key={label} className="flex items-start gap-3">
                            <div className="flex h-8 w-8 shrink-0 rounded-lg bg-primary-50 items-center justify-center">
                              <Icon className="h-4 w-4 text-primary-700" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{label}</p>
                              <p className="text-xs text-muted-foreground">{desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="px-8 py-6 space-y-4">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Instructions</p>
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                        <ul className="space-y-2.5">
                          {[
                            'Ensure good lighting in the room',
                            'Face the camera directly',
                            'Stay still during the scan',
                            'Remove glasses if possible',
                          ].map((t) => (
                            <li key={t} className="flex items-center gap-2 text-xs text-amber-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" />
                              {t}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <Button size="lg" className="w-full" rightIcon={<Camera className="h-4 w-4" />} onClick={startScan}>
                  Start scan
                </Button>
              </>
            )}

            {/* ── Scanning ── */}
            {scanPhase === 'scanning' && (
              <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="px-8 pt-6 pb-5 border-b border-border">
                  <h1 className="text-xl font-bold text-foreground tracking-tight">Scanning…</h1>
                  <p className="text-sm text-muted-foreground mt-1">Keep still and look at the camera</p>
                </div>
                <div className="px-8 py-12 text-center">
                  <div className="relative inline-flex mb-8">
                    <div className="h-52 w-40 rounded-3xl border-4 border-primary-800 bg-primary-50/60 flex items-center justify-center overflow-hidden relative">
                      <motion.div
                        animate={{ opacity: [0.4, 0.8, 0.4] }}
                        transition={{ repeat: Infinity, duration: 1.8 }}
                        className="h-28 w-24 rounded-full bg-primary-200/50 absolute"
                      />
                      <motion.div
                        animate={{ top: ['8%', '88%', '8%'] }}
                        transition={{ repeat: Infinity, duration: 2.4, ease: 'easeInOut' }}
                        className="absolute left-2 right-2 h-px bg-primary-600/70"
                      />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-foreground mb-1.5">Analysing your vitals…</p>
                  <div className="mx-auto max-w-[200px] bg-border/50 rounded-full h-1.5 overflow-hidden mb-2">
                    <div
                      className="h-full bg-primary-800 rounded-full transition-all duration-75"
                      style={{ width: `${scanProgress}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">{Math.round(scanProgress)}%</p>
                </div>
              </div>
            )}

            {/* ── Result ── */}
            {scanPhase === 'result' && (
              <>
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="px-8 pt-6 pb-5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 shrink-0">
                        <Check className="h-5 w-5 text-emerald-600" strokeWidth={2.5} />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-foreground tracking-tight">Scan Complete</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Your vitals have been captured successfully</p>
                      </div>
                    </div>
                  </div>
                  <div className="px-8 py-6">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Vitals Summary</p>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { icon: Heart,       label: 'Heart Rate',     value: `${MOCK_VITALS.heart_rate} bpm` },
                        { icon: Wind,        label: 'Respiratory',    value: `${MOCK_VITALS.respiratory_rate}/min` },
                        { icon: Droplets,    label: 'SpO₂',           value: `${MOCK_VITALS.oxygen_saturation}%` },
                        { icon: Activity,    label: 'Blood Pressure', value: MOCK_VITALS.blood_pressure },
                        { icon: Zap,         label: 'Stress',         value: MOCK_VITALS.stress_index },
                        { icon: Thermometer, label: 'BMI Risk',       value: MOCK_VITALS.bmi_risk },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/40">
                          <Icon className="h-4 w-4 text-primary-700 shrink-0" />
                          <div>
                            <p className="text-[10px] text-muted-foreground">{label}</p>
                            <p className="text-sm font-semibold text-foreground">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full"
                  loading={submitLoading}
                  rightIcon={!submitLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
                  onClick={() => submitAll(MOCK_VITALS)}
                >
                  {submitLoading ? 'Saving…' : 'Continue to Plan'}
                </Button>
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </JourneyShell>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight, CheckCircle2, CreditCard, Lock,
  Plus, Trash2, User, Users, Heart, type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SubStepper } from '@/components/ui/sub-stepper'
import { JourneyShell } from '@/components/customer/journey-shell'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ContentPhase = 'loading' | 'manual-pan' | 'identity' | 'cover-members'
type CoverType = 'individual' | 'family_floater' | 'parents'
type MemberRelation = 'spouse' | 'son' | 'daughter' | 'father' | 'mother'

interface InsuredMember {
  member_id: string
  relation: MemberRelation
  name: string
  dob: string
  gender: 'male' | 'female' | 'other'
}

interface PrefilledData {
  name: string
  dob: string
  gender: string
  address_line: string
  city: string
  state: string
  pincode: string
  occupation_type: string
  employer_name: string | null
  hazardous_occupation: string | null
  pan: string
  father_name: string | null
}

// ─── Sub-step config ──────────────────────────────────────────────────────────

const SUB_STEPS = [
  { key: 'identity', label: '1. Identity & Demographics' },
  { key: 'cover-members', label: '2. Cover & Members' },
]

function newMemberId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2)
}

const OCCUPATIONS = [
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self-Employed' },
]

// ─── Cover type config ────────────────────────────────────────────────────────

const COVER_TYPES: {
  value: CoverType
  label: string
  subtitle: string
  who: string
  icon: LucideIcon
}[] = [
  {
    value: 'individual',
    label: 'Individual',
    subtitle: 'Only me',
    who: 'Covers only you',
    icon: User,
  },
  {
    value: 'family_floater',
    label: 'Family Floater',
    subtitle: 'Me + family',
    who: 'You, spouse & children share one cover',
    icon: Users,
  },
  {
    value: 'parents',
    label: 'Parents Plan',
    subtitle: 'My parents',
    who: 'Father and/or mother are insured. Tax benefit under 80D.',
    icon: Heart,
  },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplyStep2() {
  const router = useRouter()

  const [contentPhase, setContentPhase] = useState<ContentPhase>('loading')

  // Manual PAN entry (fallback when auto-prefill unavailable)
  const [manualPan, setManualPan] = useState('')
  const [manualPanError, setManualPanError] = useState('')
  const [verifyLoading, setVerifyLoading] = useState(false)

  // Pre-filled details
  const [details, setDetails] = useState<PrefilledData | null>(null)

  // Editable fields
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [pincode, setPincode] = useState('')
  const [occupationType, setOccupationType] = useState('')
  const [employerName, setEmployerName] = useState('')
  const [hazardousOccupation, setHazardousOccupation] = useState<string | null>(null)

  // Cover type + members
  const [coverType, setCoverType] = useState<CoverType | null>(null)
  const [members, setMembers] = useState<InsuredMember[]>([])
  const [membersError, setMembersError] = useState('')

  // Submit
  const [submitLoading, setSubmitLoading] = useState(false)

  // ── Derived sub-stepper state ─────────────────────────────────────────────
  const subStepCurrent = contentPhase === 'cover-members' ? 'cover-members' : 'identity'
  const subStepCompleted = contentPhase === 'cover-members' ? ['identity'] : []

  // ── Auto-prefill on mount (mobile → KYC lookup, no PAN input needed) ────────
  useEffect(() => {
    let cancelled = false
    async function loadPreProfile() {
      try {
        const res = await fetch('/api/journey/pre-profile')
        const data = await res.json()
        if (cancelled) return

        if (data.success && data.can_prefill && data.profile) {
          populateDetails(data.profile as PrefilledData)
        } else {
          setContentPhase('manual-pan')
        }
      } catch {
        if (!cancelled) setContentPhase('manual-pan')
      }
    }
    loadPreProfile()
    return () => { cancelled = true }
  }, [])

  // ── Populate form from a PrefilledData profile ────────────────────────────
  const populateDetails = useCallback((profile: PrefilledData) => {
    setDetails(profile)
    setAddressLine(profile.address_line)
    setCity(profile.city)
    setState(profile.state)
    setPincode(profile.pincode)
    setOccupationType(profile.occupation_type)
    setEmployerName(profile.employer_name ?? '')
    setHazardousOccupation(profile.hazardous_occupation)
    setContentPhase('identity')
  }, [])

  // ── Manual PAN verify (fallback when auto-prefill unavailable) ────────────
  const handleVerifyManualPan = async () => {
    const pan = manualPan.toUpperCase().trim()
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      setManualPanError('Enter a valid PAN (e.g. ABCDE1234F)')
      return
    }
    setManualPanError('')
    setVerifyLoading(true)
    try {
      const res = await fetch('/api/journey/pre-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pan }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Verification failed')
      populateDetails(data.profile as PrefilledData)
    } catch {
      setManualPanError('Could not verify PAN. Please try again.')
    } finally {
      setVerifyLoading(false)
    }
  }

  // ── Identity → Cover & Members ────────────────────────────────────────────
  const handleIdentityNext = useCallback(() => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address')
      return
    }
    setEmailError('')
    setContentPhase('cover-members')
  }, [email])

  // ── Cover type change (resets members) ────────────────────────────────────
  const handleCoverTypeChange = (ct: CoverType) => {
    if (coverType === ct) return
    setCoverType(ct)
    setMembers([])
    setMembersError('')
  }

  // ── Cover & Members validate + submit ─────────────────────────────────────
  const handleCoverMembersSubmit = async () => {
    if (!coverType) {
      setMembersError('Please select a cover type to continue.')
      return
    }
    if (coverType === 'parents' && members.length === 0) {
      setMembersError('Add at least one parent to continue.')
      return
    }
    for (const m of members) {
      if (!m.name.trim() || !m.dob) {
        setMembersError('Please fill in name and date of birth for all members.')
        return
      }
    }
    setMembersError('')
    await submitProfile(coverType, members)
  }

  // ── API call ───────────────────────────────────────────────────────────────
  const submitProfile = useCallback(async (ct: CoverType, insuredMembers: InsuredMember[]) => {
    setSubmitLoading(true)
    try {
      const res = await fetch('/api/journey/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pan: details?.pan ?? '',
          dob: details?.dob ?? '',
          gender: details?.gender ?? 'male',
          email,
          name: details?.name,
          address_line: addressLine,
          city,
          state,
          pincode,
          occupation_type: occupationType,
          employer_name: employerName || undefined,
          hazardous_occupation: hazardousOccupation || undefined,
          cover_type: ct,
          members: insuredMembers,
        }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error)
      router.push('/apply/3')
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSubmitLoading(false)
    }
  }, [details, email, addressLine, city, state, pincode, occupationType, employerName, hazardousOccupation, router])

  // ── Member helpers ─────────────────────────────────────────────────────────
  const addSpouse = () => {
    if (members.some((m) => m.relation === 'spouse')) return
    setMembers((prev) => [...prev, { member_id: newMemberId(), relation: 'spouse', name: '', dob: '', gender: 'female' }])
  }

  const addChild = () => {
    const childCount = members.filter((m) => m.relation === 'son' || m.relation === 'daughter').length
    if (childCount >= 4) return
    setMembers((prev) => [...prev, { member_id: newMemberId(), relation: 'son', name: '', dob: '', gender: 'male' }])
  }

  const addParent = (relation: 'father' | 'mother') => {
    if (members.some((m) => m.relation === relation)) return
    const gender = relation === 'father' ? 'male' : 'female'
    // Pre-fill father's name from PAN/iAdore data
    const name = relation === 'father' ? (details?.father_name ?? '') : ''
    setMembers((prev) => [...prev, { member_id: newMemberId(), relation, name, dob: '', gender }])
  }

  const updateMember = (id: string, field: keyof InsuredMember, value: string) => {
    setMembers((prev) => prev.map((m) => {
      if (m.member_id !== id) return m
      const updated = { ...m, [field]: value }
      if (field === 'gender' && (m.relation === 'son' || m.relation === 'daughter')) {
        updated.relation = value === 'female' ? 'daughter' : 'son'
      }
      return updated
    }))
  }

  const removeMember = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.member_id !== id))
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <JourneyShell currentStep={2}>
      <AnimatePresence mode="wait">

        {/* ── Loading ───────────────────────────────────────────────────────── */}
        {contentPhase === 'loading' && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="relative mb-5">
              <div className="h-14 w-14 rounded-2xl bg-primary-50 flex items-center justify-center">
                <CreditCard className="h-7 w-7 text-primary-600" strokeWidth={1.5} />
              </div>
              <div className="absolute inset-0 rounded-2xl border-4 border-primary-100 border-t-primary-700 animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-1">Fetching your profile…</h2>
            <p className="text-sm text-muted-foreground">This takes just a second</p>
          </motion.div>
        )}

        {/* ── Manual PAN entry ─────────────────────────────────────────────── */}
        {contentPhase === 'manual-pan' && (
          <motion.div
            key="manual-pan"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            <div className="max-w-lg mx-auto">
              <div className="mb-7">
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 mb-4">
                  <CreditCard className="h-5 w-5 text-primary-700" strokeWidth={1.5} />
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1.5">Enter your PAN</h1>
                <p className="text-sm text-muted-foreground">Your PAN lets us auto-fill most of your details.</p>
              </div>
              <div className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-6 space-y-4">
                <Input
                  label="PAN Card Number"
                  placeholder="ABCDE1234F"
                  value={manualPan}
                  onChange={(e) => { setManualPan(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setManualPanError('') }}
                  error={manualPanError}
                  hint="10-character alphanumeric"
                  className="uppercase tracking-widest font-mono text-base"
                  maxLength={10}
                />
                <Button
                  onClick={handleVerifyManualPan}
                  disabled={manualPan.length !== 10}
                  loading={verifyLoading}
                  size="lg"
                  className="w-full"
                  rightIcon={!verifyLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
                >
                  Verify PAN
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Sub-step 1: Identity ──────────────────────────────────────────── */}
        {contentPhase === 'identity' && details && (
          <motion.div
            key="identity"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <SubStepper
              steps={SUB_STEPS}
              current={subStepCurrent}
              completed={subStepCompleted}
              className="rounded-xl border border-border bg-white overflow-hidden"
            />

            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-foreground tracking-tight">Your Details</h2>
                  <div className="inline-flex items-center gap-2 bg-emerald-600 rounded-full px-4 py-2 shadow-md">
                    <CheckCircle2 className="h-4.5 w-4.5 text-white shrink-0" />
                    <span className="text-sm font-extrabold text-white tracking-wider uppercase">KYC Verified</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Your identity is verified via PAN. Just add your email to continue.
                </p>
              </div>

              <div className="grid grid-cols-2 divide-x divide-border">
                {/* Left: Identity + Employment */}
                <div className="px-8 py-6 space-y-6">
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Verified from PAN</p>
                    <ReadOnlyField label="Full Name" value={details.name} />
                    <ReadOnlyField
                      label="Date of Birth"
                      value={new Date(details.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}
                    />
                    <ReadOnlyField
                      label="Gender"
                      value={details.gender.charAt(0).toUpperCase() + details.gender.slice(1)}
                    />
                  </div>

                  <div className="border-t border-dashed border-slate-200" />

                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Occupation</p>
                    <div className="flex flex-wrap gap-2">
                      {OCCUPATIONS.map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          onClick={() => setOccupationType(o.value)}
                          className={cn(
                            'rounded-lg border-2 py-1.5 px-3 text-xs font-medium transition-all whitespace-nowrap',
                            occupationType === o.value
                              ? 'border-primary-600 bg-primary-50 text-primary-800'
                              : 'border-border text-muted-foreground hover:border-primary-300'
                          )}
                        >
                          {o.label}
                        </button>
                      ))}
                    </div>
                    {(occupationType === 'salaried' || occupationType === 'self_employed') && (
                      <Input
                        label={occupationType === 'salaried' ? 'Company Name' : 'Business Name'}
                        value={employerName}
                        onChange={(e) => setEmployerName(e.target.value)}
                      />
                    )}
                    {occupationType && (
                      <ReadOnlyField label="Hazardous Occupation" value={hazardousOccupation ?? 'None'} />
                    )}
                  </div>
                </div>

                {/* Right: Address */}
                <div className="px-8 py-6 space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Address{' '}
                    <span className="text-slate-300 font-normal normal-case tracking-normal">· pre-filled, edit if needed</span>
                  </p>
                  <Input label="Flat / Building" value={addressLine} onChange={(e) => setAddressLine(e.target.value)} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
                    <Input label="State" value={state} onChange={(e) => setState(e.target.value)} />
                  </div>
                  <Input
                    label="PIN Code"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    inputMode="numeric"
                  />
                </div>
              </div>

              {/* Email — full-width action strip */}
              <div className="border-t border-border bg-primary-50/40 px-8 py-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-[10px] font-bold text-white shrink-0">1</span>
                  <p className="text-xs font-semibold text-primary-800 uppercase tracking-widest">Action required</p>
                </div>
                <div className="max-w-sm">
                  <Input
                    type="email"
                    label="Email Address"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setEmailError('') }}
                    error={emailError}
                    hint="Your policy document will be sent here"
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleIdentityNext}
              disabled={!email}
              size="lg"
              className="w-full"
              rightIcon={<ArrowRight className="h-4 w-4" />}
            >
              Continue
            </Button>
          </motion.div>
        )}

        {/* ── Sub-step 2: Cover & Members ───────────────────────────────────── */}
        {contentPhase === 'cover-members' && (
          <motion.div
            key="cover-members"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            <SubStepper
              steps={SUB_STEPS}
              current={subStepCurrent}
              completed={subStepCompleted}
              onBack={(key) => { if (key === 'identity') setContentPhase('identity') }}
              className="rounded-xl border border-border bg-white overflow-hidden"
            />

            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-1">Who do you want to insure?</h1>
              <p className="text-sm text-muted-foreground">
                Choose a cover type — this determines whose health is assessed and insured.
              </p>
            </div>

            <div className="space-y-3">
              {COVER_TYPES.map(({ value, label, subtitle, who, icon: Icon }) => {
                const isSelected = coverType === value
                const showExpansion = isSelected && value !== 'individual'

                return (
                  <div
                    key={value}
                    className={cn(
                      'rounded-2xl border-2 overflow-hidden transition-all',
                      isSelected ? 'border-primary-600 bg-primary-50/30' : 'border-border bg-white'
                    )}
                  >
                    {/* Tile header — clickable */}
                    <button
                      type="button"
                      disabled={submitLoading}
                      onClick={() => handleCoverTypeChange(value)}
                      className="w-full text-left px-5 py-4 flex items-start gap-4"
                    >
                      <div className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl mt-0.5',
                        isSelected ? 'bg-primary-100' : 'bg-slate-100'
                      )}>
                        <Icon
                          className={cn('h-5 w-5', isSelected ? 'text-primary-700' : 'text-slate-500')}
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={cn('text-sm font-semibold', isSelected ? 'text-primary-900' : 'text-foreground')}>
                            {label}
                          </p>
                          <span className={cn('text-xs', isSelected ? 'text-primary-600' : 'text-muted-foreground')}>
                            {subtitle}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{who}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
                      )}
                    </button>

                    {/* Inline member forms — expand inside the tile */}
                    <AnimatePresence>
                      {showExpansion && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.25 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-primary-200 px-5 py-4 space-y-4 bg-white">

                            {/* ── Family Floater members ── */}
                            {value === 'family_floater' && (
                              <>
                                {/* Proposer pill */}
                                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-center gap-3">
                                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                  <div>
                                    <p className="text-sm font-semibold text-emerald-800">{details?.name ?? 'You'}</p>
                                    <p className="text-xs text-emerald-600">Proposer · Auto-included as primary insured</p>
                                  </div>
                                </div>

                                {/* Spouse */}
                                <MemberSection
                                  title="Spouse"
                                  description="Optional"
                                  member={members.find((m) => m.relation === 'spouse')}
                                  onAdd={addSpouse}
                                  onUpdate={updateMember}
                                  onRemove={removeMember}
                                  genderOptions={[
                                    { value: 'female', label: 'Female' },
                                    { value: 'male', label: 'Male' },
                                  ]}
                                  defaultGender="female"
                                />

                                {/* Children */}
                                <div className="rounded-xl border border-border bg-slate-50 overflow-hidden">
                                  <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                                    <div>
                                      <p className="text-sm font-semibold text-foreground">Children</p>
                                      <p className="text-xs text-muted-foreground">Up to 4 · Optional</p>
                                    </div>
                                    {members.filter((m) => m.relation === 'son' || m.relation === 'daughter').length < 4 && (
                                      <Button variant="outline" size="sm" onClick={addChild} leftIcon={<Plus className="h-3.5 w-3.5" />}>
                                        Add child
                                      </Button>
                                    )}
                                  </div>
                                  {members.filter((m) => m.relation === 'son' || m.relation === 'daughter').length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-4">No children added</p>
                                  ) : (
                                    <div className="divide-y divide-border">
                                      {members
                                        .filter((m) => m.relation === 'son' || m.relation === 'daughter')
                                        .map((m, idx) => (
                                          <MemberForm
                                            key={m.member_id}
                                            member={m}
                                            label={`Child ${idx + 1}`}
                                            onUpdate={updateMember}
                                            onRemove={removeMember}
                                            genderOptions={[
                                              { value: 'male', label: 'Son' },
                                              { value: 'female', label: 'Daughter' },
                                            ]}
                                          />
                                        ))
                                      }
                                    </div>
                                  )}
                                </div>
                              </>
                            )}

                            {/* ── Parents plan members ── */}
                            {value === 'parents' && (
                              <>
                                <MemberSection
                                  title="Father"
                                  description="Optional · At least one parent required"
                                  member={members.find((m) => m.relation === 'father')}
                                  onAdd={() => addParent('father')}
                                  onUpdate={updateMember}
                                  onRemove={removeMember}
                                  genderOptions={[{ value: 'male', label: 'Male' }]}
                                  defaultGender="male"
                                  fixedGender
                                />
                                <MemberSection
                                  title="Mother"
                                  description="Optional · At least one parent required"
                                  member={members.find((m) => m.relation === 'mother')}
                                  onAdd={() => addParent('mother')}
                                  onUpdate={updateMember}
                                  onRemove={removeMember}
                                  genderOptions={[{ value: 'female', label: 'Female' }]}
                                  defaultGender="female"
                                  fixedGender
                                />
                              </>
                            )}

                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>

            {membersError && (
              <p className="text-sm text-red-600 font-medium">{membersError}</p>
            )}

            <Button
              onClick={handleCoverMembersSubmit}
              disabled={!coverType}
              loading={submitLoading}
              size="lg"
              className="w-full"
              rightIcon={!submitLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
            >
              Continue
            </Button>
          </motion.div>
        )}

      </AnimatePresence>
    </JourneyShell>
  )
}

// ─── Read-only field ───────────────────────────────────────────────────────────

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex items-center justify-between w-full rounded-xl border border-border bg-slate-50 px-3.5 py-2.5">
        <span className="text-sm text-muted-foreground">{value}</span>
        <Lock className="h-3.5 w-3.5 text-slate-300 shrink-0 ml-2" />
      </div>
    </div>
  )
}

// ─── Member section (add toggle + form) ───────────────────────────────────────

interface MemberSectionProps {
  title: string
  description: string
  member: InsuredMember | undefined
  onAdd: () => void
  onUpdate: (id: string, field: keyof InsuredMember, value: string) => void
  onRemove: (id: string) => void
  genderOptions: { value: string; label: string }[]
  defaultGender: string
  fixedGender?: boolean
}

function MemberSection({
  title, description, member, onAdd, onUpdate, onRemove, genderOptions, fixedGender,
}: MemberSectionProps) {
  return (
    <div className="rounded-xl border border-border bg-slate-50 overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
        {!member && (
          <Button variant="outline" size="sm" onClick={onAdd} leftIcon={<Plus className="h-3.5 w-3.5" />}>
            Add {title.toLowerCase()}
          </Button>
        )}
      </div>
      {member ? (
        <MemberForm
          member={member}
          label={title}
          onUpdate={onUpdate}
          onRemove={onRemove}
          genderOptions={genderOptions}
          fixedGender={fixedGender}
        />
      ) : (
        <p className="text-xs text-muted-foreground text-center py-4">Not added</p>
      )}
    </div>
  )
}

// ─── Member form row ───────────────────────────────────────────────────────────

interface MemberFormProps {
  member: InsuredMember
  label: string
  onUpdate: (id: string, field: keyof InsuredMember, value: string) => void
  onRemove: (id: string) => void
  genderOptions: { value: string; label: string }[]
  fixedGender?: boolean
}

function MemberForm({ member, label, onUpdate, onRemove, genderOptions, fixedGender }: MemberFormProps) {
  return (
    <div className="px-4 py-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
        <button
          type="button"
          onClick={() => onRemove(member.member_id)}
          className="text-slate-400 hover:text-red-500 transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Full Name"
          value={member.name}
          onChange={(e) => onUpdate(member.member_id, 'name', e.target.value)}
          placeholder="As per Aadhaar"
        />
        <Input
          type="date"
          label="Date of Birth"
          value={member.dob}
          onChange={(e) => onUpdate(member.member_id, 'dob', e.target.value)}
          max={new Date().toISOString().split('T')[0]}
        />
      </div>
      {!fixedGender && genderOptions.length > 1 && (
        <div className="flex gap-2">
          {genderOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUpdate(member.member_id, 'gender', opt.value)}
              className={cn(
                'rounded-lg border-2 py-1.5 px-3 text-xs font-medium transition-all',
                member.gender === opt.value
                  ? 'border-primary-600 bg-primary-50 text-primary-800'
                  : 'border-border text-muted-foreground hover:border-primary-300'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

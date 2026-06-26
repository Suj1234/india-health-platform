'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Upload, FileImage, X, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { JourneyShell } from '@/components/customer/journey-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberContext {
  member_id: string
  name: string
  relation: string
  gender?: 'male' | 'female' | 'other'
  dob?: string
  is_proposer: boolean
  needs_scan: boolean
}

interface UploadSlot {
  file: File
  uploading: boolean
  url?: string
  error?: string
}

type MemberUploads = { front?: UploadSlot; back?: UploadSlot }
type Uploads = Record<string, MemberUploads>

type PagePhase = 'loading' | 'documents'

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

function memberAvatarClass(gender?: string): string {
  if (gender === 'female') return 'from-rose-100 to-rose-200 text-rose-800'
  if (gender === 'male')   return 'from-blue-100 to-indigo-200 text-indigo-800'
  return 'from-primary-100 to-primary-200 text-primary-800'
}

function isChildUnder5(member: MemberContext): boolean {
  const isChild = member.relation === 'son' || member.relation === 'daughter'
  const age = getMemberAge(member.dob)
  return isChild && age !== null && age < 5
}

// ─── Upload slot component ────────────────────────────────────────────────────

function UploadBox({
  label,
  slot,
  onSelect,
  onRemove,
}: {
  label: string
  slot?: UploadSlot
  onSelect: (file: File) => void
  onRemove: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    onSelect(file)
  }

  if (slot?.url) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 flex items-center gap-2">
        <Check className="h-4 w-4 text-emerald-500 shrink-0" strokeWidth={2.5} />
        <span className="text-xs font-medium text-emerald-700 flex-1 truncate">{slot.file.name}</span>
        <button type="button" onClick={onRemove} className="text-emerald-400 hover:text-emerald-700 shrink-0">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  if (slot?.uploading) {
    return (
      <div className="rounded-xl border border-primary-200 bg-primary-50 px-3 py-2.5 flex items-center gap-2">
        <div className="h-4 w-4 rounded-full border-2 border-primary-200 border-t-primary-700 animate-spin shrink-0" />
        <span className="text-xs text-primary-600">Uploading…</span>
      </div>
    )
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        className="hidden"
        onChange={handleChange}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          'w-full rounded-xl border-2 border-dashed px-3 py-2.5 flex items-center gap-2 transition-all duration-200',
          slot?.error
            ? 'border-red-300 bg-red-50 hover:border-red-400'
            : 'border-border bg-slate-50 hover:border-primary-400/60 hover:bg-white',
        )}
      >
        {slot?.error
          ? <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          : <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
        }
        <span className={cn('text-xs', slot?.error ? 'text-red-500' : 'text-muted-foreground')}>
          {slot?.error ?? label}
        </span>
      </button>
    </>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ApplyStep6() {
  const router = useRouter()

  const [pagePhase, setPagePhase] = useState<PagePhase>('loading')
  const [membersForDocs, setMembersForDocs] = useState<MemberContext[]>([])
  const [uploads, setUploads] = useState<Uploads>({})
  const [submitLoading, setSubmitLoading] = useState(false)

  // Load members, guard-redirect for individual
  useEffect(() => {
    async function load() {
      try {
        const res  = await fetch('/api/journey/members')
        const data = await res.json()

        if (!data.success) { setPagePhase('documents'); return }

        // Individual plan → skip Step 6 entirely
        if (data.cover_type === 'individual') {
          router.replace('/apply/7')
          return
        }

        const members = (data.members as MemberContext[])
          .filter((m) => !m.is_proposer && !isChildUnder5(m))

        setMembersForDocs(members)
        const init: Uploads = {}
        for (const m of members) init[m.member_id] = {}
        setUploads(init)
      } catch {
        // on error still show page, empty members
      } finally {
        setPagePhase('documents')
      }
    }
    load()
  }, [router])

  // Upload a file for a member slot
  const handleUpload = async (memberId: string, side: 'front' | 'back', file: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!allowed.includes(file.type)) {
      setUploads((prev) => ({
        ...prev,
        [memberId]: { ...prev[memberId], [side]: { file, uploading: false, error: 'Only PDF, JPG or PNG allowed' } },
      }))
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploads((prev) => ({
        ...prev,
        [memberId]: { ...prev[memberId], [side]: { file, uploading: false, error: 'File must be under 10 MB' } },
      }))
      return
    }

    // Mark uploading
    setUploads((prev) => ({
      ...prev,
      [memberId]: { ...prev[memberId], [side]: { file, uploading: true } },
    }))

    try {
      const member = membersForDocs.find((m) => m.member_id === memberId)
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', `aadhaar_${side}`)
      formData.append('category', 'aadhaar')
      formData.append('member_id', memberId)
      formData.append('member_role', member?.relation ?? memberId)

      const res  = await fetch('/api/journey/documents/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (data.success) {
        setUploads((prev) => ({
          ...prev,
          [memberId]: { ...prev[memberId], [side]: { file, uploading: false, url: data.url } },
        }))
      } else {
        setUploads((prev) => ({
          ...prev,
          [memberId]: { ...prev[memberId], [side]: { file, uploading: false, error: data.error ?? 'Upload failed' } },
        }))
      }
    } catch {
      setUploads((prev) => ({
        ...prev,
        [memberId]: { ...prev[memberId], [side]: { file, uploading: false, error: 'Upload failed — please retry' } },
      }))
    }
  }

  const removeSlot = (memberId: string, side: 'front' | 'back') => {
    setUploads((prev) => {
      const next = { ...prev, [memberId]: { ...prev[memberId] } }
      delete next[memberId][side]
      return next
    })
  }

  const allDone = membersForDocs.length > 0 &&
    membersForDocs.every((m) => uploads[m.member_id]?.front?.url && uploads[m.member_id]?.back?.url)

  const handleContinue = async () => {
    setSubmitLoading(true)
    try {
      await fetch('/api/journey/documents/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    } catch {
      // continue on API error
    } finally {
      setSubmitLoading(false)
    }
    router.push('/apply/7')
  }

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (pagePhase === 'loading') {
    return (
      <JourneyShell currentStep={6}>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="h-14 w-14 rounded-2xl bg-primary-50 flex items-center justify-center mb-5">
            <div className="h-6 w-6 border-4 border-primary-200 border-t-primary-700 rounded-full animate-spin" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">Preparing document upload…</h2>
          <p className="text-sm text-muted-foreground">Loading member details</p>
        </div>
      </JourneyShell>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <JourneyShell currentStep={6}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="space-y-6"
      >
        <div className="pb-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Upload Aadhaar Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload Aadhaar front and back for each insured member. Your own KYC was completed in Step 2.
          </p>
        </div>

        {membersForDocs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No documents required. All insured members are under 5 years old.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {membersForDocs.map((m) => {
              const age = getMemberAge(m.dob)
              const memberUploads = uploads[m.member_id] ?? {}
              const frontDone = !!memberUploads.front?.url
              const backDone  = !!memberUploads.back?.url
              const bothDone  = frontDone && backDone

              return (
                <div
                  key={m.member_id}
                  className={cn(
                    'bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors duration-200',
                    bothDone ? 'border-emerald-200' : 'border-border',
                  )}
                >
                  {/* Member header */}
                  <div className="px-6 py-4 flex items-center justify-between border-b border-border/60">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm',
                        memberAvatarClass(m.gender),
                      )}>
                        <span className="text-xs font-bold">{m.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{m.name}</p>
                        <p className="text-[11px] text-muted-foreground capitalize">
                          {m.relation}{age !== null ? ` · ${age} yrs` : ''}
                        </p>
                      </div>
                    </div>

                    {bothDone && (
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        <Check className="h-3 w-3" strokeWidth={2.5} />
                        Uploaded
                      </span>
                    )}
                    {!bothDone && (
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                        {frontDone || backDone ? 'Incomplete' : 'Pending'}
                      </span>
                    )}
                  </div>

                  {/* Upload slots */}
                  <div className="grid grid-cols-2 divide-x divide-border/60">
                    <div className="px-6 py-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Aadhaar Front
                      </p>
                      <UploadBox
                        label="Tap to upload front"
                        slot={memberUploads.front}
                        onSelect={(file) => handleUpload(m.member_id, 'front', file)}
                        onRemove={() => removeSlot(m.member_id, 'front')}
                      />
                      <p className="text-[10px] text-muted-foreground">PDF, JPG or PNG · Max 10 MB</p>
                    </div>

                    <div className="px-6 py-4 space-y-2">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Aadhaar Back
                      </p>
                      <UploadBox
                        label="Tap to upload back"
                        slot={memberUploads.back}
                        onSelect={(file) => handleUpload(m.member_id, 'back', file)}
                        onRemove={() => removeSlot(m.member_id, 'back')}
                      />
                      <p className="text-[10px] text-muted-foreground">PDF, JPG or PNG · Max 10 MB</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <Button
          size="lg"
          className="w-full"
          disabled={!allDone}
          loading={submitLoading}
          rightIcon={!submitLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
          onClick={handleContinue}
        >
          {submitLoading ? 'Saving…' : 'Continue'}
        </Button>
      </motion.div>
    </JourneyShell>
  )
}

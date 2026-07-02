'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Upload, X, AlertCircle, CreditCard, Fingerprint, ExternalLink, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { JourneyShell } from '@/components/customer/journey-shell'

// ─── Types ────────────────────────────────────────────────────────────────────

type DocType = 'aadhaar' | 'pan' | null
type UploadMethod = 'manual' | 'digilocker' | null
type ValidationStatus = 'pending' | 'match' | 'mismatch'
type DigilockerStatus = 'idle' | 'loading' | 'done' | 'error'

interface MemberContext {
  member_id: string
  name: string
  relation: string
  gender?: 'male' | 'female' | 'other'
  dob?: string
  is_proposer: boolean
}

interface OcrResult {
  ocr_name: string | null
  ocr_dob: string | null
  ocr_doc_number: string | null
  ocr_address: Record<string, string> | null
  validation_status: ValidationStatus
  quality_flags: string[]
}

interface UploadSlot {
  file: File
  uploading: boolean
  url?: string
  error?: string
  ocr?: OcrResult
}

interface MemberDocState {
  doc_type: DocType
  upload_method: UploadMethod
  // Manual Aadhaar
  aadhaar_front?: UploadSlot
  aadhaar_back?: UploadSlot
  // Manual PAN
  pan_file?: UploadSlot
  // DigiLocker
  digilocker_status: DigilockerStatus
  digilocker_error?: string
  digilocker_result?: OcrResult
}

type AllMemberDocs = Record<string, MemberDocState>

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

function digilockerAllowed(member: MemberContext, coverType: string): boolean {
  if (coverType === 'parents' && (member.relation === 'father' || member.relation === 'mother')) return false
  return true
}

function isMemberComplete(state: MemberDocState): boolean {
  if (!state.doc_type || !state.upload_method) return false

  if (state.upload_method === 'digilocker') {
    return state.digilocker_status === 'done'
  }

  if (state.doc_type === 'pan') {
    return !!state.pan_file?.url
  }

  // Aadhaar manual: need both front and back
  return !!state.aadhaar_front?.url && !!state.aadhaar_back?.url
}

function formatDob(isoDate: string | null): string {
  if (!isoDate) return '—'
  const [yyyy, mm, dd] = isoDate.split('-')
  if (yyyy && mm && dd) {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${parseInt(dd)} ${months[parseInt(mm) - 1]} ${yyyy}`
  }
  // Try DD/MM/YYYY from OCR
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(isoDate)) {
    const [d, m, y] = isoDate.split('/')
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${parseInt(d!)} ${months[parseInt(m!) - 1]} ${y}`
  }
  return isoDate
}

function defaultState(): MemberDocState {
  return {
    doc_type: null,
    upload_method: null,
    digilocker_status: 'idle',
  }
}

// ─── Upload Box ───────────────────────────────────────────────────────────────

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
        <Loader2 className="h-4 w-4 text-primary-600 animate-spin shrink-0" />
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
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          e.target.value = ''
          onSelect(file)
        }}
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

// ─── OCR Result Card ──────────────────────────────────────────────────────────

function OcrResultCard({
  result,
  docType,
  onReset,
}: {
  result: OcrResult
  docType: DocType
  onReset: () => void
}) {
  const isMatch = result.validation_status === 'match'
  const hasMismatch = result.validation_status === 'mismatch'
  const hasQualityWarning = result.quality_flags.length > 0

  return (
    <div className={cn(
      'rounded-xl border px-4 py-3 space-y-2',
      isMatch ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50',
    )}>
      <div className="flex items-center justify-between">
        <span className={cn(
          'text-[11px] font-bold uppercase tracking-widest',
          isMatch ? 'text-emerald-700' : 'text-amber-700',
        )}>
          {isMatch ? '✓ Document verified' : '⚠ Details mismatch — check below'}
        </span>
        <button
          type="button"
          onClick={onReset}
          className="text-[11px] text-muted-foreground hover:text-foreground underline"
        >
          Change
        </button>
      </div>

      <div className="space-y-1">
        {result.ocr_name && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground w-24 shrink-0">Name</span>
            <span className="text-xs font-medium text-foreground flex-1">{result.ocr_name}</span>
          </div>
        )}
        {result.ocr_dob && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground w-24 shrink-0">Date of Birth</span>
            <span className="text-xs font-medium text-foreground flex-1">{formatDob(result.ocr_dob)}</span>
          </div>
        )}
        {result.ocr_doc_number && (
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground w-24 shrink-0">
              {docType === 'pan' ? 'PAN' : 'Aadhaar'}
            </span>
            <span className="text-xs font-medium text-foreground flex-1 font-mono">{result.ocr_doc_number}</span>
          </div>
        )}
      </div>

      {hasMismatch && (
        <p className="text-[11px] text-amber-700 mt-1">
          The name or date of birth does not match what you entered. The underwriter will review this.
        </p>
      )}
      {hasQualityWarning && (
        <p className="text-[11px] text-amber-600">
          Image quality is low ({result.quality_flags.join(', ')}). Consider re-uploading a clearer photo.
        </p>
      )}
    </div>
  )
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({
  member,
  state,
  coverType,
  slug,
  onStateChange,
}: {
  member: MemberContext
  state: MemberDocState
  coverType: string
  slug: string
  onStateChange: (update: Partial<MemberDocState>) => void
}) {
  const age = getMemberAge(member.dob)
  const complete = isMemberComplete(state)
  const canUseDigilocker = digilockerAllowed(member, coverType)

  // ── Upload file for manual method ─────────────────────────────────────────

  const handleUpload = async (
    slot: 'aadhaar_front' | 'aadhaar_back' | 'pan_file',
    side: 'front' | 'back' | 'single',
    file: File,
  ) => {
    const ALLOWED = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (!ALLOWED.includes(file.type)) {
      onStateChange({ [slot]: { file, uploading: false, error: 'Only PDF, JPG or PNG allowed' } })
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      onStateChange({ [slot]: { file, uploading: false, error: 'File must be under 10 MB' } })
      return
    }

    onStateChange({ [slot]: { file, uploading: true } })

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('member_id', member.member_id)
      form.append('doc_type', state.doc_type ?? 'aadhaar')
      form.append('side', side)

      const res  = await fetch('/api/journey/documents/ocr', { method: 'POST', body: form })
      const data = await res.json() as {
        success: boolean
        data?: {
          cloudinary_url: string
          ocr_name: string | null
          ocr_dob: string | null
          ocr_doc_number: string | null
          ocr_address: Record<string, string> | null
          validation_status: ValidationStatus
          quality_flags: string[]
        }
        error?: string
      }

      if (data.success && data.data) {
        const ocr: OcrResult = {
          ocr_name: data.data.ocr_name,
          ocr_dob:  data.data.ocr_dob,
          ocr_doc_number: data.data.ocr_doc_number,
          ocr_address: data.data.ocr_address,
          validation_status: data.data.validation_status,
          quality_flags: data.data.quality_flags,
        }
        onStateChange({ [slot]: { file, uploading: false, url: data.data.cloudinary_url, ocr } })
      } else {
        onStateChange({ [slot]: { file, uploading: false, error: data.error ?? 'Upload failed' } })
      }
    } catch {
      onStateChange({ [slot]: { file, uploading: false, error: 'Upload failed — please retry' } })
    }
  }

  const removeSlot = (slot: 'aadhaar_front' | 'aadhaar_back' | 'pan_file') => {
    onStateChange({ [slot]: undefined })
  }

  // ── DigiLocker flow ────────────────────────────────────────────────────────

  const handleOpenDigilocker = async () => {
    onStateChange({ digilocker_status: 'loading', digilocker_error: undefined })
    try {
      const docTypeUpper = state.doc_type === 'pan' ? 'PANCR' : 'ADHAR'
      const res  = await fetch('/api/journey/digilocker/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: member.member_id, doc_type: docTypeUpper, slug }),
      })
      const data = await res.json() as { success: boolean; data?: { link: string }; error?: string }

      if (data.success && data.data?.link) {
        // Redirect same tab — the callback will bring us back with query params
        window.location.href = data.data.link
      } else {
        onStateChange({ digilocker_status: 'error', digilocker_error: data.error ?? 'Failed to open DigiLocker' })
      }
    } catch {
      onStateChange({ digilocker_status: 'error', digilocker_error: 'Failed to open DigiLocker' })
    }
  }

  // Derive the consolidated OCR result to show (for Aadhaar, prefer front-side data + flag mismatch)
  const consolidatedOcr: OcrResult | null = (() => {
    if (state.upload_method === 'digilocker') return state.digilocker_result ?? null
    if (state.doc_type === 'pan') {
      return state.pan_file?.ocr ?? null
    }
    // Aadhaar: show front OCR result (has name + dob), merge address from back if available
    const front = state.aadhaar_front?.ocr
    const back  = state.aadhaar_back?.ocr
    if (!front && !back) return null
    if (front) {
      return {
        ...front,
        ocr_address: back?.ocr_address ?? front.ocr_address,
      }
    }
    return back ?? null
  })()

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm overflow-hidden transition-colors duration-200',
      complete ? 'border-emerald-200' : 'border-border',
    )}>
      {/* Member header */}
      <div className="px-5 py-4 flex items-center justify-between border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className={cn(
            'h-9 w-9 rounded-full bg-gradient-to-br flex items-center justify-center shrink-0 shadow-sm',
            memberAvatarClass(member.gender),
          )}>
            <span className="text-xs font-bold">{member.name.charAt(0).toUpperCase()}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{member.name}</p>
            <p className="text-[11px] text-muted-foreground capitalize">
              {member.relation}{age !== null ? ` · ${age} yrs` : ''}
            </p>
          </div>
        </div>

        {complete ? (
          <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
            <Check className="h-3 w-3" strokeWidth={2.5} />
            Done
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-[11px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Pending
          </span>
        )}
      </div>

      <div className="px-5 py-4 space-y-4">
        {/* Phase 1: Choose document type */}
        {!state.doc_type && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-foreground">Choose document type</p>
            <div className="grid grid-cols-2 gap-2">
              {(['pan', 'aadhaar'] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onStateChange({ doc_type: type, upload_method: null })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50 hover:border-primary-400 hover:bg-white transition-all duration-150"
                >
                  {type === 'pan'
                    ? <CreditCard className="h-4 w-4 text-muted-foreground shrink-0" />
                    : <Fingerprint className="h-4 w-4 text-muted-foreground shrink-0" />
                  }
                  <span className="text-xs font-medium text-foreground">
                    {type === 'pan' ? 'PAN Card' : 'Aadhaar Card'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase 2: Choose upload method */}
        {state.doc_type && !state.upload_method && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {state.doc_type === 'pan' ? 'PAN Card' : 'Aadhaar Card'}
              </span>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => onStateChange({ doc_type: null, upload_method: null })}
                className="text-xs text-primary-600 hover:underline"
              >
                Change
              </button>
            </div>
            <p className="text-xs font-semibold text-foreground">How would you like to share?</p>
            <div className={cn('grid gap-2', canUseDigilocker ? 'grid-cols-2' : 'grid-cols-1')}>
              <button
                type="button"
                onClick={() => onStateChange({ upload_method: 'manual' })}
                className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50 hover:border-primary-400 hover:bg-white transition-all duration-150"
              >
                <Upload className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-xs font-medium text-foreground">Manual Upload</span>
              </button>
              {canUseDigilocker && (
                <button
                  type="button"
                  onClick={() => onStateChange({ upload_method: 'digilocker' })}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 border-dashed border-border bg-slate-50 hover:border-primary-400 hover:bg-white transition-all duration-150"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-xs font-medium text-foreground">Via DigiLocker</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Phase 3a: Manual PAN upload */}
        {state.doc_type === 'pan' && state.upload_method === 'manual' && !consolidatedOcr && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">PAN Card</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">Manual Upload</span>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => onStateChange({ doc_type: null, upload_method: null, pan_file: undefined })}
                className="text-xs text-primary-600 hover:underline"
              >
                Change
              </button>
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">PAN Card</p>
            <UploadBox
              label="Tap to upload PAN card"
              slot={state.pan_file}
              onSelect={(f) => handleUpload('pan_file', 'single', f)}
              onRemove={() => removeSlot('pan_file')}
            />
            <p className="text-[10px] text-muted-foreground">PDF, JPG or PNG · Max 10 MB</p>
          </div>
        )}

        {/* Phase 3b: Manual Aadhaar upload */}
        {state.doc_type === 'aadhaar' && state.upload_method === 'manual' && !consolidatedOcr && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground">Aadhaar Card</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">Manual Upload</span>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => onStateChange({ doc_type: null, upload_method: null, aadhaar_front: undefined, aadhaar_back: undefined })}
                className="text-xs text-primary-600 hover:underline"
              >
                Change
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aadhaar Front</p>
                <UploadBox
                  label="Upload front"
                  slot={state.aadhaar_front}
                  onSelect={(f) => handleUpload('aadhaar_front', 'front', f)}
                  onRemove={() => removeSlot('aadhaar_front')}
                />
              </div>
              <div className="space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Aadhaar Back</p>
                <UploadBox
                  label="Upload back"
                  slot={state.aadhaar_back}
                  onSelect={(f) => handleUpload('aadhaar_back', 'back', f)}
                  onRemove={() => removeSlot('aadhaar_back')}
                />
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">PDF, JPG or PNG · Max 10 MB each</p>
          </div>
        )}

        {/* Phase 3c: DigiLocker */}
        {state.upload_method === 'digilocker' && state.digilocker_status !== 'done' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-muted-foreground capitalize">{state.doc_type === 'pan' ? 'PAN Card' : 'Aadhaar Card'}</span>
              <span className="text-muted-foreground">·</span>
              <span className="text-xs text-muted-foreground">DigiLocker</span>
              <span className="text-muted-foreground">·</span>
              <button
                type="button"
                onClick={() => onStateChange({ upload_method: null, digilocker_status: 'idle', digilocker_error: undefined })}
                className="text-xs text-primary-600 hover:underline"
              >
                Change
              </button>
            </div>

            {state.digilocker_status === 'loading' ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                <span>Opening DigiLocker…</span>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleOpenDigilocker}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-primary-200 bg-primary-50 hover:bg-primary-100 transition-colors duration-150"
                >
                  <ExternalLink className="h-4 w-4 text-primary-700 shrink-0" />
                  <span className="text-sm font-semibold text-primary-700">Open DigiLocker</span>
                </button>
                <p className="text-[11px] text-muted-foreground text-center">
                  You will be redirected to DigiLocker to authenticate and share your document
                </p>
                {state.digilocker_error && (
                  <p className="text-xs text-red-600 flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {state.digilocker_error}
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* Phase 4: OCR result */}
        {consolidatedOcr && (
          <OcrResultCard
            result={consolidatedOcr}
            docType={state.doc_type}
            onReset={() => onStateChange({
              doc_type: null,
              upload_method: null,
              pan_file: undefined,
              aadhaar_front: undefined,
              aadhaar_back: undefined,
              digilocker_status: 'idle',
              digilocker_result: undefined,
              digilocker_error: undefined,
            })}
          />
        )}
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ApplyStep6() {
  const router       = useRouter()
  const { slug }     = useParams<{ slug: string }>()
  const searchParams = useSearchParams()

  const [pagePhase, setPagePhase]   = useState<'loading' | 'documents'>('loading')
  const [members, setMembers]       = useState<MemberContext[]>([])
  const [coverType, setCoverType]   = useState<string>('family_floater')
  const [docs, setDocs]             = useState<AllMemberDocs>({})
  const [submitLoading, setSubmitLoading] = useState(false)
  const digilockerHandled = useRef(false)

  // Load members + existing doc state
  useEffect(() => {
    async function load() {
      try {
        const [membersRes, statusRes] = await Promise.all([
          fetch('/api/journey/members'),
          fetch('/api/journey/documents/step6-status'),
        ])
        const membersData = await membersRes.json() as {
          success: boolean
          cover_type?: string
          members?: MemberContext[]
        }
        const statusData = await statusRes.json() as {
          success: boolean
          cover_type?: string
          members?: Array<{
            member_id: string
            name: string
            relation: string
            docs: Array<{
              doc_type: string
              upload_method: string
              side: string
              cloudinary_url: string | null
              ocr_name: string | null
              ocr_dob: string | null
              ocr_doc_number: string | null
              ocr_address: Record<string, string> | null
              validation_status: ValidationStatus
              quality_flags: string[] | null
            }>
          }>
        }

        if (!membersData.success) { setPagePhase('documents'); return }

        const ct = membersData.cover_type ?? 'family_floater'

        // Individual → skip Documents, go straight to Proposal (step 6)
        if (ct === 'individual') { router.replace(`/i/${slug}/apply/6`); return }

        const nonProposers = (membersData.members ?? []).filter((m) => !m.is_proposer)
        setMembers(nonProposers)
        setCoverType(ct)

        // Restore state from existing uploads
        const initialDocs: AllMemberDocs = {}
        for (const m of nonProposers) {
          initialDocs[m.member_id] = defaultState()
        }

        if (statusData.success && statusData.members) {
          for (const sm of statusData.members) {
            if (!initialDocs[sm.member_id]) continue
            const memberDocs = sm.docs
            if (memberDocs.length === 0) continue

            const firstDoc = memberDocs[0]!
            const docType = firstDoc.doc_type as DocType
            const uploadMethod = firstDoc.upload_method as UploadMethod

            const state: MemberDocState = { ...defaultState(), doc_type: docType, upload_method: uploadMethod }

            if (uploadMethod === 'digilocker') {
              const ocrResult: OcrResult = {
                ocr_name: firstDoc.ocr_name,
                ocr_dob: firstDoc.ocr_dob,
                ocr_doc_number: firstDoc.ocr_doc_number,
                ocr_address: firstDoc.ocr_address,
                validation_status: firstDoc.validation_status,
                quality_flags: firstDoc.quality_flags ?? [],
              }
              state.digilocker_status = 'done'
              state.digilocker_result = ocrResult
            } else {
              for (const d of memberDocs) {
                const ocrResult: OcrResult = {
                  ocr_name: d.ocr_name,
                  ocr_dob: d.ocr_dob,
                  ocr_doc_number: d.ocr_doc_number,
                  ocr_address: d.ocr_address,
                  validation_status: d.validation_status,
                  quality_flags: d.quality_flags ?? [],
                }
                const fakeFile = new File([], d.cloudinary_url ?? 'uploaded')
                const slot: UploadSlot = { file: fakeFile, uploading: false, url: d.cloudinary_url ?? '', ocr: ocrResult }
                if (d.side === 'front')  state.aadhaar_front = slot
                if (d.side === 'back')   state.aadhaar_back  = slot
                if (d.side === 'single') state.pan_file      = slot
              }
            }

            initialDocs[sm.member_id] = state
          }
        }

        setDocs(initialDocs)
        setPagePhase('documents')
      } catch {
        setPagePhase('documents')
      }
    }
    load()
  }, [router, slug])

  // Handle DigiLocker callback (query param ?dl_member=xxx&dl_doc=ADHAR)
  useEffect(() => {
    const dlMember = searchParams.get('dl_member')
    const dlDoc    = searchParams.get('dl_doc')
    if (!dlMember || !dlDoc || digilockerHandled.current || pagePhase !== 'documents') return

    digilockerHandled.current = true

    // Clean URL
    const url = new URL(window.location.href)
    url.searchParams.delete('dl_member')
    url.searchParams.delete('dl_doc')
    window.history.replaceState({}, '', url.toString())

    // Set member to completing state
    setDocs((prev) => ({
      ...prev,
      [dlMember]: {
        ...(prev[dlMember] ?? defaultState()),
        upload_method: 'digilocker',
        doc_type: (dlDoc === 'PANCR' ? 'pan' : 'aadhaar') as DocType,
        digilocker_status: 'loading',
      },
    }))

    // Call complete API
    fetch('/api/journey/digilocker/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ member_id: dlMember, doc_type: dlDoc }),
    })
      .then((r) => r.json())
      .then((data: {
        success: boolean
        data?: {
          ocr_name: string | null
          ocr_dob: string | null
          ocr_doc_number: string | null
          ocr_address: Record<string, string> | null
          validation_status: ValidationStatus
        }
        error?: string
      }) => {
        if (data.success && data.data) {
          const ocrResult: OcrResult = {
            ocr_name: data.data.ocr_name,
            ocr_dob: data.data.ocr_dob,
            ocr_doc_number: data.data.ocr_doc_number,
            ocr_address: data.data.ocr_address,
            validation_status: data.data.validation_status,
            quality_flags: [],
          }
          setDocs((prev) => ({
            ...prev,
            [dlMember]: {
              ...(prev[dlMember] ?? defaultState()),
              digilocker_status: 'done',
              digilocker_result: ocrResult,
            },
          }))
        } else {
          setDocs((prev) => ({
            ...prev,
            [dlMember]: {
              ...(prev[dlMember] ?? defaultState()),
              digilocker_status: 'error',
              digilocker_error: data.error ?? 'Failed to retrieve document',
            },
          }))
        }
      })
      .catch(() => {
        setDocs((prev) => ({
          ...prev,
          [dlMember]: {
            ...(prev[dlMember] ?? defaultState()),
            digilocker_status: 'error',
            digilocker_error: 'Failed to retrieve document. Please try again.',
          },
        }))
      })
  }, [searchParams, pagePhase])

  const updateMember = useCallback((memberId: string, update: Partial<MemberDocState>) => {
    setDocs((prev) => ({
      ...prev,
      [memberId]: { ...(prev[memberId] ?? defaultState()), ...update },
    }))
  }, [])

  const allComplete = members.length === 0 || members.every((m) => isMemberComplete(docs[m.member_id] ?? defaultState()))

  const handleContinue = async () => {
    setSubmitLoading(true)
    try {
      await fetch('/api/journey/documents/finalize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
    } catch {
      // continue on error
    } finally {
      setSubmitLoading(false)
    }
    router.push(`/i/${slug}/apply/6`)
  }

  // ── Loading ──────────────────────────────────────────────────────────────

  if (pagePhase === 'loading') {
    return (
      <JourneyShell currentStep={5} coverType={coverType}>
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

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <JourneyShell currentStep={5} coverType={coverType}>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22 }}
        className="space-y-6"
      >
        <div className="pb-6 border-b border-border">
          <h1 className="text-xl font-bold text-foreground">Upload KYC Documents</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Upload PAN or Aadhaar for each insured member. Your own KYC was completed in Step 2.
          </p>
        </div>

        {members.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            No documents required for additional members.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {members.map((m) => (
              <MemberCard
                key={m.member_id}
                member={m}
                state={docs[m.member_id] ?? defaultState()}
                coverType={coverType}
                slug={slug}
                onStateChange={(update) => updateMember(m.member_id, update)}
              />
            ))}
          </div>
        )}

        <Button
          size="lg"
          className="w-full"
          disabled={!allComplete}
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

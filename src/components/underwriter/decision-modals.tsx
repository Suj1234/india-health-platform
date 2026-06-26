'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react'

interface ModalBase {
  applicationId: string
  applicationNumber: string
  onClose: () => void
}

// ── Shared Components ──────────────────────────────────────────────────────────

function ModalShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-gray-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5">{children}</div>
      </div>
    </div>
  )
}

function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
  required?: boolean
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
        required={required}
      />
    </div>
  )
}

function ActionButtons({
  onCancel,
  onConfirm,
  loading,
  confirmLabel = 'Confirm',
  confirmColor = 'bg-teal-600 hover:bg-teal-700',
  disabled,
}: {
  onCancel: () => void
  onConfirm: () => void
  loading: boolean
  confirmLabel?: string
  confirmColor?: string
  disabled?: boolean
}) {
  return (
    <div className="flex gap-3 pt-2">
      <button
        onClick={onCancel}
        className="flex-1 py-3 border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 rounded-xl text-sm font-medium transition-all"
      >
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={loading || disabled}
        className={`flex-1 py-3 ${confirmColor} disabled:opacity-40 text-white rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2`}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {confirmLabel}
      </button>
    </div>
  )
}

function useDecision(applicationId: string) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit(endpoint: string, payload: Record<string, unknown>, onClose: () => void) {
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/underwriter/applications/${applicationId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) {
        setError(data.error ?? 'Action failed')
        return
      }
      onClose()
      router.refresh()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, submit }
}

// ── 1. Approve Modal ───────────────────────────────────────────────────────────

export function ApproveModal({ applicationId, applicationNumber, onClose }: ModalBase) {
  const { loading, error, submit } = useDecision(applicationId)
  const [customerMessage, setCustomerMessage] = useState(
    'We are pleased to inform you that your health insurance application has been approved. Please click the payment link in your email to complete the purchase.'
  )
  const [internalNotes, setInternalNotes] = useState('')

  return (
    <ModalShell title={`Approve — ${applicationNumber}`} onClose={onClose}>
      <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
        <p className="text-emerald-700 text-sm">Customer will receive a payment link valid for 7 days.</p>
      </div>
      <Textarea label="Message to customer" value={customerMessage} onChange={setCustomerMessage} rows={4} required />
      <Textarea label="Internal notes (not shared with customer)" value={internalNotes} onChange={setInternalNotes} placeholder="Optional notes for audit trail" />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ActionButtons
        onCancel={onClose}
        onConfirm={() => submit('approve', { customer_message: customerMessage, internal_notes: internalNotes }, onClose)}
        loading={loading}
        confirmLabel="Confirm Approval & Send Email"
        confirmColor="bg-emerald-600 hover:bg-emerald-700"
        disabled={!customerMessage.trim()}
      />
    </ModalShell>
  )
}

// ── 2. Loading Modal ───────────────────────────────────────────────────────────

export function LoadingModal({
  applicationId,
  applicationNumber,
  originalPremium,
  onClose,
}: ModalBase & { originalPremium: number }) {
  const { loading, error, submit } = useDecision(applicationId)
  const [loadingType, setLoadingType] = useState<'percentage' | 'flat'>('percentage')
  const [loadingValue, setLoadingValue] = useState('')
  const [customerMessage, setCustomerMessage] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  const loadingAmt = loadingType === 'percentage'
    ? (originalPremium * (Number(loadingValue) || 0)) / 100
    : Number(loadingValue) || 0
  const revisedPremium = originalPremium + loadingAmt

  const defaultMessage = `Your application has been approved with a loading of ${loadingType === 'percentage' ? `${loadingValue}%` : `₹${loadingAmt.toLocaleString('en-IN')}`} on the base premium due to the disclosed health condition(s). The revised annual premium is ₹${revisedPremium.toLocaleString('en-IN')}.`

  return (
    <ModalShell title={`Approve with Loading — ${applicationNumber}`} onClose={onClose}>
      {/* Loading type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Loading type</label>
        <div className="grid grid-cols-2 gap-2">
          {(['percentage', 'flat'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setLoadingType(t)}
              className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                loadingType === t ? 'bg-teal-600 border-teal-500 text-white' : 'border-gray-300 text-gray-500 hover:border-gray-400'
              }`}
            >
              {t === 'percentage' ? 'Percentage (%)' : 'Flat Amount (₹)'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading value */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          {loadingType === 'percentage' ? 'Loading percentage' : 'Loading amount (₹)'}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <input
          type="number"
          value={loadingValue}
          onChange={(e) => setLoadingValue(e.target.value)}
          min={0}
          placeholder={loadingType === 'percentage' ? 'e.g. 25' : 'e.g. 2500'}
          className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
      </div>

      {/* Premium breakdown */}
      {loadingValue && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Original premium</span>
            <span>₹{originalPremium.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-amber-600">
            <span>Loading amount</span>
            <span>+₹{loadingAmt.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex justify-between text-gray-900 font-bold border-t border-gray-200 pt-2 mt-2">
            <span>Revised premium</span>
            <span>₹{revisedPremium.toLocaleString('en-IN')}/year</span>
          </div>
        </div>
      )}

      <Textarea
        label="Message to customer"
        value={customerMessage || defaultMessage}
        onChange={setCustomerMessage}
        rows={4}
        required
      />
      <Textarea label="Internal notes" value={internalNotes} onChange={setInternalNotes} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ActionButtons
        onCancel={onClose}
        onConfirm={() =>
          submit('loading', {
            loading_type: loadingType,
            loading_value: Number(loadingValue),
            original_premium: originalPremium,
            revised_premium: revisedPremium,
            customer_message: customerMessage || defaultMessage,
            internal_notes: internalNotes,
          }, onClose)
        }
        loading={loading}
        confirmLabel="Confirm & Notify Customer"
        confirmColor="bg-amber-600 hover:bg-amber-700"
        disabled={!loadingValue}
      />
    </ModalShell>
  )
}

// ── 3. Exclusion Modal ─────────────────────────────────────────────────────────

const EXCLUSION_PRESETS = [
  { condition: 'Hypertension and related complications', type: 'permanent' as const },
  { condition: 'Diabetes and related complications', type: 'permanent' as const },
  { condition: 'All cardiac conditions', type: 'permanent' as const },
  { condition: 'Kidney disease and related conditions', type: 'permanent' as const },
  { condition: 'Pre-existing conditions — general', type: 'permanent' as const },
  { condition: 'Back/spine conditions', type: 'temporary' as const, duration_months: 24 },
  { condition: 'Hernia', type: 'temporary' as const, duration_months: 24 },
]

interface Exclusion {
  condition: string
  type: 'permanent' | 'temporary'
  duration_months?: number
  description?: string
}

export function ExclusionModal({ applicationId, applicationNumber, onClose }: ModalBase) {
  const { loading, error, submit } = useDecision(applicationId)
  const [exclusions, setExclusions] = useState<Exclusion[]>([])
  const [customerMessage, setCustomerMessage] = useState('')
  const [internalNotes, setInternalNotes] = useState('')
  const [showPresets, setShowPresets] = useState(false)

  function addExclusion(preset?: Partial<Exclusion>) {
    setExclusions((prev) => [...prev, {
      condition: preset?.condition ?? '',
      type: preset?.type ?? 'permanent',
      duration_months: preset?.duration_months,
    }])
    setShowPresets(false)
  }

  function updateExclusion(i: number, field: keyof Exclusion, value: unknown) {
    setExclusions((prev) => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  function removeExclusion(i: number) {
    setExclusions((prev) => prev.filter((_, idx) => idx !== i))
  }

  const defaultMessage = exclusions.length > 0
    ? `Your health insurance application has been approved with the following exclusions:\n\n${exclusions.map((e) => `• ${e.condition} (${e.type === 'permanent' ? 'Permanent exclusion' : `Temporary — ${e.duration_months ?? '?'} months`})`).join('\n')}\n\nThese conditions will not be covered under your policy.`
    : ''

  return (
    <ModalShell title={`Approve with Exclusions — ${applicationNumber}`} onClose={onClose}>
      {/* Exclusions list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Exclusions <span className="text-red-500">*</span></label>
          <div className="relative">
            <button
              onClick={() => setShowPresets(!showPresets)}
              className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700"
            >
              <Plus className="w-3.5 h-3.5" /> Add exclusion
            </button>
            {showPresets && (
              <div className="absolute right-0 top-6 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-64 overflow-hidden">
                <div className="p-2 border-b border-gray-200">
                  <button
                    onClick={() => addExclusion()}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    Custom exclusion…
                  </button>
                </div>
                <div className="p-2 max-h-60 overflow-y-auto">
                  {EXCLUSION_PRESETS.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => addExclusion(p)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      {p.condition}
                      <span className="text-xs text-gray-400 ml-2">
                        ({p.type === 'permanent' ? 'Permanent' : `${p.duration_months}mo`})
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {exclusions.map((ex, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ex.condition}
                  onChange={(e) => updateExclusion(i, 'condition', e.target.value)}
                  placeholder="Condition name"
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <button onClick={() => removeExclusion(i)} className="text-gray-400 hover:text-red-500 transition-colors p-2">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                {(['permanent', 'temporary'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateExclusion(i, 'type', t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      ex.type === t ? 'bg-teal-600 border-teal-500 text-white' : 'border-gray-300 text-gray-500'
                    }`}
                  >
                    {t === 'permanent' ? 'Permanent' : 'Temporary'}
                  </button>
                ))}
                {ex.type === 'temporary' && (
                  <input
                    type="number"
                    value={ex.duration_months ?? ''}
                    onChange={(e) => updateExclusion(i, 'duration_months', Number(e.target.value))}
                    placeholder="Months"
                    min={1}
                    className="w-24 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                )}
              </div>
            </div>
          ))}
          {exclusions.length === 0 && (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center text-gray-400 text-sm">
              No exclusions added yet. Click &ldquo;Add exclusion&rdquo; above.
            </div>
          )}
        </div>
      </div>

      <Textarea
        label="Message to customer"
        value={customerMessage || defaultMessage}
        onChange={setCustomerMessage}
        rows={5}
        required
      />
      <Textarea label="Internal notes" value={internalNotes} onChange={setInternalNotes} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ActionButtons
        onCancel={onClose}
        onConfirm={() => submit('exclusions', {
          exclusions,
          customer_message: customerMessage || defaultMessage,
          internal_notes: internalNotes,
        }, onClose)}
        loading={loading}
        confirmLabel="Confirm & Notify Customer"
        disabled={exclusions.length === 0 || exclusions.some((e) => !e.condition.trim())}
      />
    </ModalShell>
  )
}

// ── 4. More Docs Modal ─────────────────────────────────────────────────────────

const DOC_TYPES = ['Medical Report', 'Lab Test Result', 'Doctor Certificate', 'Discharge Summary', 'Prescription', 'Investigation Report', 'Other']

interface DocRequest { document_type: string; description: string; mandatory: boolean }

export function MoreDocsModal({ applicationId, applicationNumber, onClose }: ModalBase) {
  const { loading, error, submit } = useDecision(applicationId)
  const [docs, setDocs] = useState<DocRequest[]>([{ document_type: 'Medical Report', description: '', mandatory: true }])
  const [customerMessage, setCustomerMessage] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  function addDoc() { setDocs((prev) => [...prev, { document_type: 'Medical Report', description: '', mandatory: true }]) }
  function removeDoc(i: number) { setDocs((prev) => prev.filter((_, idx) => idx !== i)) }
  function updateDoc(i: number, field: keyof DocRequest, value: unknown) {
    setDocs((prev) => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d))
  }

  const defaultMessage = `To complete the review of your health insurance application (Ref: ${applicationNumber}), please provide the following document(s) within 7 days using the secure link in this email.`

  return (
    <ModalShell title={`Request Documents — ${applicationNumber}`} onClose={onClose}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Documents required <span className="text-red-500">*</span></label>
          <button onClick={addDoc} className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="space-y-3">
          {docs.map((doc, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex gap-2">
                <select
                  value={doc.document_type}
                  onChange={(e) => updateDoc(i, 'document_type', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {DOC_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <button onClick={() => removeDoc(i)} className="text-gray-400 hover:text-red-500 p-2 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={doc.description}
                onChange={(e) => updateDoc(i, 'description', e.target.value)}
                placeholder="Specific instructions…"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={doc.mandatory}
                  onChange={(e) => updateDoc(i, 'mandatory', e.target.checked)}
                  className="accent-teal-600"
                />
                Mandatory
              </label>
            </div>
          ))}
        </div>
      </div>
      <Textarea label="Message to customer" value={customerMessage || defaultMessage} onChange={setCustomerMessage} rows={3} required />
      <Textarea label="Internal notes" value={internalNotes} onChange={setInternalNotes} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ActionButtons
        onCancel={onClose}
        onConfirm={() => submit('request-docs', {
          requested_documents: docs,
          customer_message: customerMessage || defaultMessage,
          internal_notes: internalNotes,
        }, onClose)}
        loading={loading}
        confirmLabel="Send Request"
        confirmColor="bg-blue-600 hover:bg-blue-700"
        disabled={docs.some((d) => !d.description.trim())}
      />
    </ModalShell>
  )
}

// ── 5. Medical Test Modal ──────────────────────────────────────────────────────

const TEST_TYPES = ['HbA1c', 'Fasting Blood Sugar', 'Lipid Profile', 'ECG', '2D Echo', 'Chest X-Ray', 'Urine Routine', 'Complete Blood Count', 'Liver Function Test', 'Kidney Function Test', 'Other']

interface TestRequest { test_name: string; lab_preference: string; notes: string }

export function MedicalTestModal({ applicationId, applicationNumber, onClose }: ModalBase) {
  const { loading, error, submit } = useDecision(applicationId)
  const [tests, setTests] = useState<TestRequest[]>([{ test_name: 'HbA1c', lab_preference: '', notes: '' }])
  const [customerMessage, setCustomerMessage] = useState('')
  const [internalNotes, setInternalNotes] = useState('')

  function addTest() { setTests((prev) => [...prev, { test_name: 'HbA1c', lab_preference: '', notes: '' }]) }
  function removeTest(i: number) { setTests((prev) => prev.filter((_, idx) => idx !== i)) }
  function updateTest(i: number, field: keyof TestRequest, value: string) {
    setTests((prev) => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t))
  }

  const defaultMessage = `To complete the underwriting review of your health insurance application, we require medical tests. Please get them done at a certified diagnostic centre and upload the reports within 7 days.`

  return (
    <ModalShell title={`Request Medical Tests — ${applicationNumber}`} onClose={onClose}>
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">Tests required <span className="text-red-500">*</span></label>
          <button onClick={addTest} className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700">
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        </div>
        <div className="space-y-3">
          {tests.map((test, i) => (
            <div key={i} className="bg-gray-50 rounded-xl p-4 space-y-2">
              <div className="flex gap-2">
                <select
                  value={test.test_name}
                  onChange={(e) => updateTest(i, 'test_name', e.target.value)}
                  className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  {TEST_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <button onClick={() => removeTest(i)} className="text-gray-400 hover:text-red-500 p-2 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                value={test.lab_preference}
                onChange={(e) => updateTest(i, 'lab_preference', e.target.value)}
                placeholder="Lab preference (optional)"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <input
                type="text"
                value={test.notes}
                onChange={(e) => updateTest(i, 'notes', e.target.value)}
                placeholder="Additional notes (optional)"
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          ))}
        </div>
      </div>
      <Textarea label="Message to customer" value={customerMessage || defaultMessage} onChange={setCustomerMessage} rows={3} required />
      <Textarea label="Internal notes" value={internalNotes} onChange={setInternalNotes} />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ActionButtons
        onCancel={onClose}
        onConfirm={() => submit('request-tests', {
          requested_tests: tests,
          customer_message: customerMessage || defaultMessage,
          internal_notes: internalNotes,
        }, onClose)}
        loading={loading}
        confirmLabel="Send Request"
        confirmColor="bg-blue-600 hover:bg-blue-700"
      />
    </ModalShell>
  )
}

// ── 6. Reject Modal ────────────────────────────────────────────────────────────

const REJECTION_REASONS = [
  { value: 'high_risk_medical', label: 'High-risk medical condition' },
  { value: 'multiple_ped', label: 'Multiple pre-existing conditions' },
  { value: 'fraud_risk', label: 'Fraud risk indicated' },
  { value: 'age_limit', label: 'Age exceeds product limit' },
  { value: 'hazardous_occupation', label: 'Hazardous occupation' },
  { value: 'insufficient_docs', label: 'Insufficient documentation' },
  { value: 'prior_claim_history', label: 'Previous claim history — high risk' },
  { value: 'customer_declined_info', label: 'Customer declined to provide information' },
  { value: 'other', label: 'Other' },
]

export function RejectModal({ applicationId, applicationNumber, onClose }: ModalBase) {
  const { loading, error, submit } = useDecision(applicationId)
  const [reason, setReason] = useState('')
  const [otherText, setOtherText] = useState('')
  const [customerMessage, setCustomerMessage] = useState('We regret to inform you that after careful review, we are unable to offer health insurance coverage for your application at this time. You may reapply after 12 months or contact us for more information.')
  const [internalNotes, setInternalNotes] = useState('')

  return (
    <ModalShell title={`Reject Application — ${applicationNumber}`} onClose={onClose}>
      <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
        <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
        <p className="text-red-700 text-sm">This action is irreversible. The customer will be notified by email.</p>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Rejection reason <span className="text-red-500">*</span>
        </label>
        <div className="space-y-2">
          {REJECTION_REASONS.map((r) => (
            <label key={r.value} className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                reason === r.value ? 'border-teal-500 bg-teal-500' : 'border-gray-400 group-hover:border-gray-600'
              }`}>
                {reason === r.value && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
              </div>
              <input type="radio" value={r.value} checked={reason === r.value} onChange={(e) => setReason(e.target.value)} className="sr-only" />
              <span className="text-sm text-gray-700 group-hover:text-gray-900 transition-colors">{r.label}</span>
            </label>
          ))}
        </div>
        {reason === 'other' && (
          <input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Specify reason…"
            className="mt-3 w-full px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        )}
      </div>

      <Textarea label="Message to customer" value={customerMessage} onChange={setCustomerMessage} rows={4} required />
      <Textarea label="Internal notes (required)" value={internalNotes} onChange={setInternalNotes} required />
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <ActionButtons
        onCancel={onClose}
        onConfirm={() => submit('reject', {
          rejection_reason: reason,
          rejection_reason_text: reason === 'other' ? otherText : undefined,
          customer_message: customerMessage,
          internal_notes: internalNotes,
        }, onClose)}
        loading={loading}
        confirmLabel="Confirm Rejection"
        confirmColor="bg-red-600 hover:bg-red-700"
        disabled={!reason || !internalNotes.trim() || (reason === 'other' && !otherText.trim())}
      />
    </ModalShell>
  )
}

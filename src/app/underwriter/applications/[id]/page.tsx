'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  ChevronLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  User,
  FileText,
  Heart,
  ShieldCheck,
  Activity,
  MessageSquare,
  ExternalLink,
  Loader2,
  FlaskConical,
  Landmark,
  Zap,
  FileBarChart2,
} from 'lucide-react'
import type { IAdoreReport, CheckResult } from '@/lib/mock/iadore.mock'
import UWShell from '@/components/underwriter/uw-shell'
import {
  ApproveModal,
  LoadingModal,
  ExclusionModal,
  MoreDocsModal,
  MedicalTestModal,
  RejectModal,
} from '@/components/underwriter/decision-modals'

type ModalType = 'approve' | 'loading' | 'exclusion' | 'more-docs' | 'medical-test' | 'reject' | null

interface AppDetail {
  application: {
    id: string
    application_number: string
    status: string
    stp_decision: string | null
    stp_score: number | null
    stp_message: string | null
    uw_decision: string | null
    uw_decided_at: string | null
    uw_loading_percent: string | null
    uw_revised_premium: string | null
    uw_exclusions: unknown[]
    uw_rejection_reason: string | null
    final_premium: number | null
    created_at: string
  }
  customer: {
    name: string | null
    dob: string | null
    age: number | null
    gender: string | null
    pan: string | null
    mobile: string
    email: string | null
    address: { city: string; state: string; pincode: string } | null
    occupation_type: string | null
    employer_name: string | null
    bureau_score: number | null
    company_checks: { hazardous_biz: boolean; gst_registered: boolean; litigation_count: number } | null
  }
  income: {
    customer_declared: number | null
    selected_annual_income: number | null
  }
  selected_quote: {
    plan_name: string
    plan_type: string
    sum_insured: number
    annual_premium: number
    gst_amount: number
    total_premium: number
    riders: Array<{ code: string; name: string; total: number; selected?: boolean }>
  } | null
  medical: {
    height_cm: number | null
    weight_kg: number | null
    bmi: number | null
    is_smoker: boolean
    cigarettes_per_day: number | null
    alcohol_consumption: string
    has_diabetes: boolean
    has_hypertension: boolean
    has_heart_disease: boolean
    has_cancer: boolean
    has_kidney_disease: boolean
    has_liver_disease: boolean
    has_neurological_disorder: boolean
    has_thyroid_disorder: boolean
    has_mental_health: boolean
    has_respiratory_disorder: boolean
    has_musculoskeletal: boolean
    has_other_condition: boolean
    other_condition_details: string | null
    has_had_surgery: boolean
    surgery_details: unknown[]
    has_family_history: boolean
    family_history: Array<{ relation: string; condition: string; age_of_onset?: number }>
    is_on_medication: boolean
    current_medications: string | null
    has_existing_insurance: boolean
    had_claim_last_3_years: boolean
    was_ever_declined: boolean
    risk_flags: string[]
    risk_score: number | null
  } | null
  documents: Array<{
    id: string
    document_type: string
    category: string
    file_name: string | null
    mime_type: string | null
    signed_url: string
    ocr_status: string
    ocr_result: Record<string, unknown> | null
    ocr_confidence: string | null
  }>
  id_verifications: Array<{
    id_type: string
    id_value: string
    verification_status: string
    match_score: string | null
    verified_name: string | null
  }>
  biometrics: {
    session_type: string
    status: string
    result: Record<string, unknown> | null
  } | null
  iadore_report: IAdoreReport | null
  uw_history: Array<{
    id: string
    action: string
    customer_message: string | null
    internal_notes: string | null
    created_at: string
    underwriter_name: string | null
  }>
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-200">
        <span className="text-teal-600">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-gray-100 last:border-0">
      <span className="text-gray-500 text-sm shrink-0">{label}</span>
      <span className={`text-sm font-medium text-right ${highlight ? 'text-teal-600' : 'text-gray-800'}`}>{value ?? '—'}</span>
    </div>
  )
}

function CondBadge({ active, label }: { active: boolean; label: string }) {
  return active ? (
    <span className="inline-flex items-center gap-1 text-xs font-medium bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">
      <AlertCircle className="w-3 h-3" /> {label}
    </span>
  ) : null
}

function CheckBadge({ result, label }: { result: CheckResult; label: string }) {
  const cfg = {
    pass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
    fail: 'bg-red-50 text-red-700 border-red-200',
  }
  const icon = result === 'pass' ? <CheckCircle2 className="w-3 h-3" /> : result === 'warn' ? <AlertCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />
  return (
    <div className={`inline-flex items-center gap-1.5 text-xs font-medium border px-2.5 py-1 rounded-full ${cfg[result]}`}>
      {icon} {label}
    </div>
  )
}

function LabBadge({ status }: { status: 'normal' | 'low' | 'high' | 'critical' }) {
  const cfg = {
    normal: 'bg-emerald-50 text-emerald-700',
    low: 'bg-amber-50 text-amber-700',
    high: 'bg-red-50 text-red-700',
    critical: 'bg-red-100 text-red-900 font-bold',
  }
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium uppercase ${cfg[status]}`}>{status}</span>
}

function SafetyGauge({ score, level }: { score: number; level: string }) {
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : score >= 30 ? '#ef4444' : '#991b1b'
  const levelColor = score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'
  return (
    <div className="flex items-center gap-4">
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
          <circle
            cx="18" cy="18" r="15.9" fill="none"
            stroke={color} strokeWidth="3"
            strokeDasharray={`${score} ${100 - score}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-gray-900">{score}</span>
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-400 uppercase tracking-widest">Safety Score</p>
        <p className={`text-base font-bold ${levelColor}`}>{level} Risk</p>
        <p className="text-xs text-gray-400">out of 100</p>
      </div>
    </div>
  )
}

function StatusHeader({ status }: { status: string }) {
  const cfg: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    uw_pending: { icon: <Clock className="w-4 h-4" />, label: 'PENDING REVIEW', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    uw_approved: { icon: <CheckCircle2 className="w-4 h-4" />, label: 'APPROVED', cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    uw_rejected: { icon: <XCircle className="w-4 h-4" />, label: 'REJECTED', cls: 'text-red-700 bg-red-50 border-red-200' },
    uw_more_docs: { icon: <FileText className="w-4 h-4" />, label: 'MORE DOCS NEEDED', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
  }
  const c = cfg[status] ?? { icon: <Clock className="w-4 h-4" />, label: status.toUpperCase(), cls: 'text-gray-600 bg-gray-100 border-gray-200' }
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${c.cls}`}>
      {c.icon} {c.label}
    </span>
  )
}

export default function ApplicationDetailPage({ params }: { params: { id: string } }) {
  const [id] = useState<string>(params.id)
  const [data, setData] = useState<AppDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  const fetchDetail = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const res = await fetch(`/api/underwriter/applications/${id}`)
      const json = await res.json() as { success: boolean } & AppDetail
      if (json.success) setData(json)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { fetchDetail() }, [fetchDetail])

  function closeModal() {
    setActiveModal(null)
    fetchDetail()
  }

  if (loading) {
    return (
      <UWShell userName="Loading…" userRole="underwriter">
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
        </div>
      </UWShell>
    )
  }

  if (!data) {
    return (
      <UWShell userName="Underwriter" userRole="underwriter">
        <div className="p-8 text-center text-gray-500">Application not found.</div>
      </UWShell>
    )
  }

  const { application: app, customer, income, selected_quote, medical, documents, id_verifications, biometrics, iadore_report, uw_history } = data
  const isDecided = ['uw_approved', 'uw_rejected'].includes(app.status)
  const bureauLabel = !customer.bureau_score ? 'N/A' : customer.bureau_score >= 750 ? 'Excellent' : customer.bureau_score >= 700 ? 'Good' : customer.bureau_score >= 650 ? 'Fair' : 'Poor'
  const bureauColor = !customer.bureau_score ? 'text-gray-500' : customer.bureau_score >= 750 ? 'text-emerald-600' : customer.bureau_score >= 700 ? 'text-teal-600' : customer.bureau_score >= 650 ? 'text-amber-600' : 'text-red-600'
  const bmiLabel = !medical?.bmi ? '' : medical.bmi < 18.5 ? 'Underweight' : medical.bmi < 25 ? 'Normal' : medical.bmi < 30 ? 'Overweight' : 'Obese'
  const bmiColor = !medical?.bmi ? '' : medical.bmi < 18.5 || medical.bmi >= 30 ? 'text-red-600' : medical.bmi >= 25 ? 'text-amber-600' : 'text-emerald-600'

  const activePeds = medical ? [
    medical.has_diabetes && 'Diabetes',
    medical.has_hypertension && 'Hypertension',
    medical.has_heart_disease && 'Heart Disease',
    medical.has_cancer && 'Cancer',
    medical.has_kidney_disease && 'Kidney Disease',
    medical.has_liver_disease && 'Liver Disease',
    medical.has_neurological_disorder && 'Neurological Disorder',
    medical.has_thyroid_disorder && 'Thyroid Disorder',
    medical.has_mental_health && 'Mental Health',
    medical.has_respiratory_disorder && 'Respiratory Disorder',
    medical.has_musculoskeletal && 'Musculoskeletal',
    medical.has_other_condition && (medical.other_condition_details ?? 'Other condition'),
  ].filter(Boolean) as string[] : []

  const selectedRiderTotal = selected_quote?.riders
    ?.filter((r) => r.selected)
    .reduce((s, r) => s + r.total, 0) ?? 0

  return (
    <UWShell userName="Underwriter" userRole="underwriter">
      {/* Modals */}
      {activeModal === 'approve' && (
        <ApproveModal applicationId={app.id} applicationNumber={app.application_number} onClose={closeModal} />
      )}
      {activeModal === 'loading' && (
        <LoadingModal
          applicationId={app.id}
          applicationNumber={app.application_number}
          originalPremium={selected_quote?.total_premium ?? 0}
          onClose={closeModal}
        />
      )}
      {activeModal === 'exclusion' && (
        <ExclusionModal applicationId={app.id} applicationNumber={app.application_number} onClose={closeModal} />
      )}
      {activeModal === 'more-docs' && (
        <MoreDocsModal applicationId={app.id} applicationNumber={app.application_number} onClose={closeModal} />
      )}
      {activeModal === 'medical-test' && (
        <MedicalTestModal applicationId={app.id} applicationNumber={app.application_number} onClose={closeModal} />
      )}
      {activeModal === 'reject' && (
        <RejectModal applicationId={app.id} applicationNumber={app.application_number} onClose={closeModal} />
      )}

      <div className="p-6 lg:p-8">
        {/* Back */}
        <Link
          href="/underwriter/applications"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Applications
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">

          {/* ── Left: Decision Panel ───────────────────────────────────────────── */}
          <div className="space-y-4">
            {/* App Header */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400 uppercase tracking-widest">Application</p>
                <StatusHeader status={app.status} />
              </div>
              <p className="font-mono text-teal-600 text-lg font-bold">{app.application_number}</p>
              <div className="space-y-1 text-xs text-gray-400">
                <p>Submitted: {new Date(app.created_at).toLocaleString('en-IN')}</p>
                {app.stp_decision && (
                  <p>STP: <span className={app.stp_decision === 'approved' ? 'text-emerald-600' : 'text-amber-600'}>{app.stp_decision.toUpperCase()}</span>
                    {app.stp_score !== null && <span> (score {app.stp_score}/100)</span>}
                  </p>
                )}
                {app.stp_message && (
                  <p className="text-amber-600 italic mt-1">&ldquo;{app.stp_message}&rdquo;</p>
                )}
              </div>
            </div>

            {/* iAdore Report Button */}
            {data.iadore_report && (
              <Link
                href={`/underwriter/applications/${app.id}/iadore-report`}
                target="_blank"
                className="flex items-center justify-between gap-3 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl px-5 py-3.5 transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <FileBarChart2 className="w-5 h-5 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">iAdore Risk Report</p>
                    <p className="text-[11px] text-teal-200">Safety Score: {data.iadore_report.safetyScore}/100 · {data.iadore_report.safetyLevel} Risk</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-teal-300 group-hover:text-white transition-colors shrink-0" />
              </Link>
            )}

            {/* Quick Summary */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
              <p className="text-xs text-gray-400 uppercase tracking-widest">Quick Summary</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Applicant</span>
                  <span className="text-gray-900 font-medium">{customer.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Age / Gender</span>
                  <span className="text-gray-700">{customer.age ? `${customer.age} yrs` : '—'} / {customer.gender ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan</span>
                  <span className="text-gray-700">{selected_quote?.plan_name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Sum Insured</span>
                  <span className="text-gray-700">
                    {selected_quote ? `₹${(selected_quote.sum_insured / 100000).toFixed(0)}L` : '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Premium</span>
                  <span className="text-gray-900 font-bold">
                    {selected_quote ? `₹${(selected_quote.total_premium + selectedRiderTotal).toLocaleString('en-IN')}` : '—'}
                  </span>
                </div>
                {activePeds.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-gray-400 text-xs mb-2">PED Conditions</p>
                    <div className="flex flex-wrap gap-1.5">
                      {activePeds.map((p) => (
                        <span key={p} className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Decision Buttons */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-3">
              <p className="text-xs text-gray-400 uppercase tracking-widest">Decision</p>
              {isDecided ? (
                <div className="text-center py-4">
                  {app.uw_decision === 'rejected' ? (
                    <div className="space-y-2">
                      <XCircle className="w-8 h-8 text-red-500 mx-auto" />
                      <p className="text-red-600 font-medium text-sm">Application Rejected</p>
                      <p className="text-gray-500 text-xs">{app.uw_rejection_reason}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                      <p className="text-emerald-600 font-medium text-sm">Decision Recorded</p>
                      <p className="text-gray-500 text-xs capitalize">{app.uw_decision?.replace(/_/g, ' ')}</p>
                      {app.uw_decided_at && (
                        <p className="text-gray-400 text-xs">{new Date(app.uw_decided_at).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveModal('approve')}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-sm transition-all"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => setActiveModal('loading')}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm transition-all"
                  >
                    ↑ Approve with Loading
                  </button>
                  <button
                    onClick={() => setActiveModal('exclusion')}
                    className="w-full py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl text-sm transition-all"
                  >
                    ⊘ Approve with Exclusions
                  </button>
                  <button
                    onClick={() => setActiveModal('more-docs')}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-all"
                  >
                    ⊡ Request More Documents
                  </button>
                  <button
                    onClick={() => setActiveModal('medical-test')}
                    className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl text-sm transition-all"
                  >
                    ⊕ Request Medical Tests
                  </button>
                  <button
                    onClick={() => setActiveModal('reject')}
                    className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-all"
                  >
                    ✕ Reject
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Detail Sections ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* Customer Profile */}
            <Section title="Personal Details" icon={<User className="w-4 h-4" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                <div>
                  <Row label="Full Name" value={customer.name} />
                  <Row label="Date of Birth" value={customer.dob ? new Date(customer.dob).toLocaleDateString('en-IN') : null} />
                  <Row label="Gender" value={customer.gender} />
                  <Row label="PAN" value={<span className="font-mono">{customer.pan}</span>} highlight />
                  <Row label="Mobile" value={customer.mobile.replace(/(\d{2})(\d{4})(\d{4})/, '$1****$3')} />
                  <Row label="Email" value={customer.email?.replace(/(.{2})(.+)(@.+)/, '$1***$3')} />
                  <Row label="Location" value={customer.address ? `${customer.address.city}, ${customer.address.state} — ${customer.address.pincode}` : null} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 pt-1">Financial Profile</p>
                  <Row label="Occupation" value={customer.occupation_type} />
                  <Row label="Employer" value={customer.employer_name} />
                  <Row label="Annual Income" value={income.selected_annual_income ? `₹${income.selected_annual_income.toLocaleString('en-IN')}` : null} />
                  <Row label="Bureau Score" value={
                    customer.bureau_score ? (
                      <span className={bureauColor}>{customer.bureau_score} ({bureauLabel})</span>
                    ) : null
                  } />
                  {customer.company_checks && (
                    <>
                      <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 mt-4">iAdore Checks</p>
                      <Row label="Hazardous Business" value={<span className={customer.company_checks.hazardous_biz ? 'text-red-600' : 'text-emerald-600'}>{customer.company_checks.hazardous_biz ? 'YES ⚠' : 'No ✓'}</span>} />
                      <Row label="Litigation Cases" value={<span className={customer.company_checks.litigation_count > 0 ? 'text-amber-600' : 'text-emerald-600'}>{customer.company_checks.litigation_count}</span>} />
                    </>
                  )}
                </div>
              </div>
            </Section>

            {/* Selected Plan */}
            {selected_quote && (
              <Section title="Selected Plan" icon={<ShieldCheck className="w-4 h-4" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  <div>
                    <Row label="Plan" value={selected_quote.plan_name} />
                    <Row label="Plan Type" value={selected_quote.plan_type} />
                    <Row label="Sum Insured" value={`₹${(selected_quote.sum_insured / 100000).toFixed(0)} Lakh`} highlight />
                    <Row label="Base Premium" value={`₹${selected_quote.annual_premium.toLocaleString('en-IN')}`} />
                    <Row label="GST (18%)" value={`₹${selected_quote.gst_amount.toLocaleString('en-IN')}`} />
                    <Row label="Total Premium" value={`₹${selected_quote.total_premium.toLocaleString('en-IN')}`} />
                    {selectedRiderTotal > 0 && (
                      <Row label="Riders" value={`+₹${selectedRiderTotal.toLocaleString('en-IN')}`} />
                    )}
                    <Row label="Final Total" value={<span className="text-gray-900 font-bold text-base">₹{(selected_quote.total_premium + selectedRiderTotal).toLocaleString('en-IN')}</span>} />
                  </div>
                  <div>
                    {selected_quote.riders.length > 0 && (
                      <>
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Add-on Riders</p>
                        {selected_quote.riders.map((r) => (
                          <div key={r.code} className={`flex items-center justify-between py-1.5 text-sm ${r.selected ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                            <span>{r.name}</span>
                            <span>₹{r.total.toLocaleString('en-IN')}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* Medical Questionnaire */}
            {medical && (
              <Section title="Medical Questionnaire" icon={<Heart className="w-4 h-4" />}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-1">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Physical Measurements</p>
                    <Row label="Height" value={medical.height_cm ? `${medical.height_cm} cm` : null} />
                    <Row label="Weight" value={medical.weight_kg ? `${medical.weight_kg} kg` : null} />
                    <Row label="BMI" value={
                      medical.bmi ? <span className={bmiColor}>{Number(medical.bmi).toFixed(1)} — {bmiLabel}</span> : null
                    } />
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 mt-4">Lifestyle</p>
                    <Row label="Tobacco" value={medical.is_smoker ? <span className="text-amber-600">Smoker{medical.cigarettes_per_day ? ` (${medical.cigarettes_per_day} cig/day)` : ''}</span> : <span className="text-emerald-600">Non-smoker ✓</span>} />
                    <Row label="Alcohol" value={medical.alcohol_consumption === 'none' ? <span className="text-emerald-600">None ✓</span> : <span className="text-amber-600 capitalize">{medical.alcohol_consumption}</span>} />
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 mt-4">Insurance History</p>
                    <Row label="Existing Insurance" value={medical.has_existing_insurance ? 'Yes' : <span className="text-gray-400">No</span>} />
                    <Row label="Prior Claims (3 yrs)" value={medical.had_claim_last_3_years ? <span className="text-amber-600">Yes</span> : <span className="text-gray-400">No</span>} />
                    <Row label="Ever Declined" value={medical.was_ever_declined ? <span className="text-red-600">Yes ⚠</span> : <span className="text-gray-400">No</span>} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Pre-existing Conditions</p>
                    {activePeds.length === 0 ? (
                      <p className="text-emerald-600 text-sm">✓ None declared</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {activePeds.map((ped) => (
                          <span key={ped} className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200 font-medium">
                            ⚠ {ped}
                          </span>
                        ))}
                      </div>
                    )}
                    {medical.has_had_surgery && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Surgical History</p>
                        <p className="text-amber-600 text-sm">⚠ Surgery disclosed</p>
                      </div>
                    )}
                    {medical.has_family_history && medical.family_history && (medical.family_history as unknown[]).length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Family History</p>
                        {(medical.family_history as Array<{ relation: string; condition: string }>).map((fh, i) => (
                          <p key={i} className="text-amber-600 text-sm">⚠ {fh.relation}: {fh.condition}</p>
                        ))}
                      </div>
                    )}
                    {medical.is_on_medication && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-1">Current Medications</p>
                        <p className="text-gray-700 text-sm">{medical.current_medications ?? 'Not specified'}</p>
                      </div>
                    )}
                    {medical.risk_score !== null && (
                      <div className="mt-4 p-3 bg-gray-100 rounded-xl">
                        <p className="text-xs text-gray-500 mb-1">Risk Score</p>
                        <p className={`text-xl font-bold ${medical.risk_score <= 30 ? 'text-emerald-600' : medical.risk_score <= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                          {medical.risk_score}/100
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(medical.risk_flags as string[]).map((f) => (
                            <span key={f} className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">{f}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            )}

            {/* iAdore Risk Report */}
            {iadore_report && (
              <Section title="iAdore Risk Report" icon={<Zap className="w-4 h-4" />}>
                {/* Safety Score + UW Recommendation */}
                <div className="flex flex-col md:flex-row gap-4 mb-5 pb-5 border-b border-gray-100">
                  <div className="flex-1">
                    <SafetyGauge score={iadore_report.safetyScore} level={iadore_report.safetyLevel} />
                  </div>
                  <div className="flex-1 bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-xs text-amber-700 uppercase tracking-widest font-semibold mb-1">UW Recommendation</p>
                    <p className="text-sm font-bold text-amber-900 capitalize mb-1">
                      {iadore_report.uwRecommendation.decision === 'load'
                        ? `Load Premium ${iadore_report.uwRecommendation.loadingRange ?? ''}`
                        : iadore_report.uwRecommendation.decision === 'decline' ? 'Decline' : 'Accept'}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {iadore_report.uwRecommendation.keyTriggers.map((t, i) => (
                        <span key={i} className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200">{t}</span>
                      ))}
                    </div>
                    <p className="text-xs text-amber-700 italic">{iadore_report.uwRecommendation.notes}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Identity Checks */}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Identity Checks</p>
                    <div className="flex flex-wrap gap-1.5">
                      <CheckBadge result={iadore_report.identityChecks.panVerification} label="PAN" />
                      <CheckBadge result={iadore_report.identityChecks.nameMatch} label="Name Match" />
                      <CheckBadge result={iadore_report.identityChecks.dobMatch} label="DOB Match" />
                      <CheckBadge result={iadore_report.identityChecks.aadhaarSeeding} label="Aadhaar" />
                      <CheckBadge result={iadore_report.identityChecks.mobileAuth} label="Mobile" />
                      <CheckBadge result={iadore_report.identityChecks.emailAuth} label="Email" />
                    </div>

                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 mt-4">Consistency Check</p>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Face Match</span>
                        <span className={`font-medium ${(iadore_report.consistencyCheck.faceMatchScore ?? 0) >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {iadore_report.consistencyCheck.faceMatchScore?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Liveness</span>
                        <span className={`font-medium ${(iadore_report.consistencyCheck.livenessScore ?? 0) >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                          {iadore_report.consistencyCheck.livenessScore?.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Documents</span>
                        <CheckBadge result={iadore_report.consistencyCheck.documentConsistency} label={iadore_report.consistencyCheck.documentConsistency.toUpperCase()} />
                      </div>
                    </div>

                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 mt-4">Fraud Check</p>
                    <div className="flex flex-wrap gap-1.5">
                      <CheckBadge result={iadore_report.fraudCheck.ipConsistency} label="IP" />
                      <CheckBadge result={iadore_report.fraudCheck.deviceFingerprint} label="Device" />
                      <CheckBadge result={iadore_report.fraudCheck.panDatabaseCrosscheck} label="PAN DB" />
                    </div>
                    {iadore_report.fraudCheck.behavioralAnomaly && (
                      <p className="text-xs text-red-600 mt-1">⚠ Behavioral anomaly detected</p>
                    )}
                  </div>

                  {/* Financial + Lifestyle */}
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">Financial Evaluation</p>
                    <div className="space-y-0">
                      <Row label="Credit Score" value={
                        <span className={iadore_report.financialEvaluation.creditScore >= 750 ? 'text-emerald-600' : iadore_report.financialEvaluation.creditScore >= 700 ? 'text-teal-600' : 'text-amber-600'}>
                          {iadore_report.financialEvaluation.creditScore} ({iadore_report.financialEvaluation.creditScoreLabel})
                        </span>
                      } />
                      {iadore_report.financialEvaluation.annualIncomeFromBSA && (
                        <Row label="Income (Bank Stmt)" value={`₹${(iadore_report.financialEvaluation.annualIncomeFromBSA / 100000).toFixed(1)}L /yr`} />
                      )}
                      <Row label="Imputed Income" value={`₹${(iadore_report.financialEvaluation.imputedIncome / 100000).toFixed(1)}L /yr`} />
                      {iadore_report.financialEvaluation.incomeInconsistency !== 'none' && (
                        <Row label="Income Inconsistency" value={
                          <span className="text-amber-600 capitalize">{iadore_report.financialEvaluation.incomeInconsistency}</span>
                        } />
                      )}
                    </div>

                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 mt-4">Lifestyle Analysis</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      <CheckBadge result={iadore_report.lifestyleAnalysis.tobaccoSpending ? 'fail' : 'pass'} label="Tobacco" />
                      <CheckBadge result={iadore_report.lifestyleAnalysis.alcoholSpending ? 'warn' : 'pass'} label="Alcohol" />
                      <CheckBadge result={iadore_report.lifestyleAnalysis.gamblingTransactions ? 'fail' : 'pass'} label="Gambling" />
                    </div>
                    {iadore_report.lifestyleAnalysis.flagDetails.map((f, i) => (
                      <p key={i} className="text-xs text-amber-700 mt-1">⚠ {f}</p>
                    ))}

                    {iadore_report.insurancePortfolio.existingPolicies.length > 0 && (
                      <>
                        <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 mt-4">Existing Policies</p>
                        {iadore_report.insurancePortfolio.existingPolicies.map((p, i) => (
                          <div key={i} className="flex justify-between text-sm py-1 border-b border-gray-100 last:border-0">
                            <span className="text-gray-600">{p.type} — {p.insurer}</span>
                            <span className={`text-xs font-medium ${p.status === 'active' ? 'text-emerald-600' : 'text-gray-400'}`}>{p.status}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {/* Lab Results */}
                {iadore_report.medicalEvaluation.labResults.length > 0 && (
                  <div className="mt-5 pt-5 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <FlaskConical className="w-3 h-3" /> Lab Results
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-gray-400 uppercase tracking-wide border-b border-gray-100">
                            <th className="text-left pb-2 font-medium">Test</th>
                            <th className="text-right pb-2 font-medium">Value</th>
                            <th className="text-right pb-2 font-medium">Reference</th>
                            <th className="text-right pb-2 font-medium">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {iadore_report.medicalEvaluation.labResults.map((lab, i) => (
                            <tr key={i} className="border-b border-gray-50 last:border-0">
                              <td className="py-1.5 text-gray-700">{lab.test}</td>
                              <td className="py-1.5 text-right font-mono font-medium text-gray-900">{lab.value} <span className="text-gray-400 font-normal">{lab.unit}</span></td>
                              <td className="py-1.5 text-right text-gray-400">{lab.referenceRange}</td>
                              <td className="py-1.5 text-right"><LabBadge status={lab.status} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Radiology */}
                {iadore_report.medicalEvaluation.radiologyResults.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Activity className="w-3 h-3" /> Radiology
                    </p>
                    {iadore_report.medicalEvaluation.radiologyResults.map((r, i) => (
                      <div key={i} className="flex justify-between items-start py-1.5 border-b border-gray-50 last:border-0 text-sm">
                        <span className="text-gray-700 font-medium">{r.test}</span>
                        <div className="text-right ml-4">
                          <span className={`text-xs ${r.status === 'abnormal' ? 'text-red-600' : 'text-emerald-600'}`}>{r.finding}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Litigation */}
                {iadore_report.litigationCheck.totalCases > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                      <Landmark className="w-3 h-3" /> Litigation ({iadore_report.litigationCheck.totalCases} case{iadore_report.litigationCheck.totalCases > 1 ? 's' : ''})
                    </p>
                    {iadore_report.litigationCheck.cases.map((c, i) => (
                      <div key={i} className="flex justify-between items-start py-2 border-b border-gray-50 last:border-0 text-sm">
                        <div>
                          <p className="text-gray-700 font-medium capitalize">{c.type} — {c.court}</p>
                          <p className="text-gray-500 text-xs">{c.description} ({c.year})</p>
                        </div>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ml-4 shrink-0 ${c.severity === 'high' ? 'bg-red-100 text-red-700' : c.severity === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                          {c.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* ID Verification */}
            <Section title="ID Verification" icon={<ShieldCheck className="w-4 h-4" />}>
              {id_verifications.length === 0 ? (
                <p className="text-gray-500 text-sm">No verifications recorded.</p>
              ) : (
                <div className="space-y-2">
                  {id_verifications.map((v, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <p className="text-sm text-gray-900 font-medium uppercase">{v.id_type.replace('_', ' ')}</p>
                        <p className="text-xs font-mono text-gray-500">{v.id_value}</p>
                      </div>
                      <div className="text-right">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${v.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {v.verification_status.toUpperCase()}
                        </span>
                        {v.match_score && (
                          <p className="text-xs text-gray-400 mt-1">Match: {Number(v.match_score).toFixed(0)}%</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Documents */}
            <Section title="Documents" icon={<FileText className="w-4 h-4" />}>
              {documents.length === 0 ? (
                <p className="text-gray-500 text-sm">No documents uploaded.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {documents.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.signed_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex flex-col items-center gap-2 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 hover:border-teal-300 rounded-xl transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 bg-gray-200 group-hover:bg-teal-100 rounded-lg flex items-center justify-center transition-all">
                        {doc.mime_type?.includes('pdf') ? (
                          <FileText className="w-5 h-5 text-gray-500 group-hover:text-teal-600" />
                        ) : (
                          <ExternalLink className="w-5 h-5 text-gray-500 group-hover:text-teal-600" />
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-xs font-medium text-gray-700 capitalize">
                          {doc.document_type.replace(/_/g, ' ')}
                        </p>
                        <span className={`text-[10px] font-medium ${doc.ocr_status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}`}>
                          OCR: {doc.ocr_status}
                        </span>
                      </div>
                      {doc.ocr_result && doc.ocr_confidence && (
                        <p className="text-[10px] text-gray-400">
                          {Number(doc.ocr_confidence).toFixed(0)}% confidence
                        </p>
                      )}
                    </a>
                  ))}
                </div>
              )}
            </Section>

            {/* Biometrics */}
            {biometrics && (
              <Section title="Biometrics" icon={<Activity className="w-4 h-4" />}>
                <Row label="Session Type" value={biometrics.session_type.toUpperCase()} />
                <Row label="Status" value={
                  <span className={biometrics.status === 'completed' ? 'text-emerald-600' : 'text-amber-600'}>
                    {biometrics.status.toUpperCase()}
                  </span>
                } />
                {biometrics.result && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-3">
                    {Object.entries(biometrics.result as Record<string, { value: string | number; unit: string; status: string }>).map(([key, val]) => (
                      <div key={key} className="bg-gray-100 rounded-xl p-3 text-center">
                        <p className="text-[10px] text-gray-500 uppercase mb-1">{key.replace(/_/g, ' ')}</p>
                        <p className="text-gray-900 font-semibold text-sm">{typeof val === 'object' ? val.value : val}</p>
                        {typeof val === 'object' && val.unit && (
                          <p className="text-[10px] text-gray-400">{val.unit}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            )}

            {/* UW History */}
            {uw_history.length > 0 && (
              <Section title="Underwriter Actions" icon={<MessageSquare className="w-4 h-4" />}>
                <div className="space-y-3">
                  {uw_history.map((h) => (
                    <div key={h.id} className="border-l-2 border-teal-400 pl-4 py-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-900 capitalize">{h.action.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-gray-400">{new Date(h.created_at).toLocaleString('en-IN')}</p>
                      </div>
                      {h.underwriter_name && <p className="text-xs text-teal-600">by {h.underwriter_name}</p>}
                      {h.customer_message && (
                        <p className="text-xs text-gray-500 mt-1 italic">&ldquo;{h.customer_message}&rdquo;</p>
                      )}
                      {h.internal_notes && (
                        <p className="text-xs text-gray-400 mt-1">Note: {h.internal_notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

          </div>
        </div>
      </div>
    </UWShell>
  )
}

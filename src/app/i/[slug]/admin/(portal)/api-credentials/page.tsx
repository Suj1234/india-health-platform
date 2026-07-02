'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Check, X, ChevronDown, ChevronUp, Circle, CheckCircle2 } from 'lucide-react'
import { Breadcrumb } from '@/components/insurer-admin/shell'

interface ApiRow {
  apiName: string
  configured: boolean
  credentials: Record<string, string> | null
  updatedAt: string | null
}

const API_LABELS: Record<string, { label: string; description: string; fields: string[] }> = {
  iadore: {
    label: 'iAdore — Income & Needs',
    description: 'Customer profiling, income verification, and needs analysis',
    fields: ['base_url', 'org_key', 'hmac_key', 'income_api_url'],
  },
  iadore_consolidated: {
    label: 'iAdore Consolidated',
    description: 'Consolidated iAdore endpoint (if separate from base)',
    fields: ['base_url', 'org_key', 'hmac_key'],
  },
  karza_tkyc: {
    label: 'Karza — tKYC (PAN)',
    description: 'PAN verification and identity check',
    fields: ['base_url', 'api_key'],
  },
  karza_ocr: {
    label: 'Karza — OCR + Face Match',
    description: 'Aadhaar OCR and selfie vs Aadhaar face matching',
    fields: ['base_url', 'api_key'],
  },
  karza_mobile_otp: {
    label: 'Karza — Mobile OTP',
    description: 'OTP delivery via Karza SMS gateway',
    fields: ['base_url', 'api_key'],
  },
  pmw: {
    label: 'PMW — Premium Calculator',
    description: 'Premium quotes from the policy management system',
    fields: ['base_url', 'api_key'],
  },
  quotes: {
    label: 'Quote API',
    description: 'Product-level quote fetching',
    fields: ['base_url', 'api_key', 'insurer_code'],
  },
  nuralx: {
    label: 'NuralX — Vitals Scan',
    description: 'rPPG-based health vitals (HR, BP, SpO2, stress)',
    fields: ['base_url', 'email', 'password', 'callback_url'],
  },
  pivc: {
    label: 'PIVC — Post-Issuance Call',
    description: 'Automated post-issuance verification call',
    fields: ['base_url', 'api_key'],
  },
  stp: {
    label: 'STP Engine',
    description: 'Straight-through processing underwriting decision engine',
    fields: ['base_url', 'api_key', 'insurer_code'],
  },
}

function FieldLabel(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function ApiCard({ row, onSaved }: { row: ApiRow; onSaved: (r: ApiRow) => void }) {
  const meta = API_LABELS[row.apiName]
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<Record<string, string>>(() => {
    if (!row.credentials) return {}
    // Pre-fill with masked values — user must re-enter to change
    return {}
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/insurer-admin/api-credentials/${row.apiName}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentials: form, isActive: true }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) { setError(data.error ?? 'Save failed'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
      onSaved({ ...row, configured: true, updatedAt: new Date().toISOString() })
      setOpen(false)
      setForm({})
    } catch {
      setError('Network error')
    } finally {
      setSaving(false)
    }
  }

  if (!meta) return null

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 bg-white hover:bg-slate-50 transition-colors text-left"
      >
        <span className="shrink-0">
          {row.configured
            ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            : <Circle className="w-5 h-5 text-slate-300" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium text-slate-800">{meta.label}</span>
          <span className="block text-xs text-slate-500 mt-0.5">{meta.description}</span>
        </span>
        <span className="shrink-0 flex items-center gap-2">
          {row.configured && row.updatedAt && (
            <span className="text-xs text-slate-400">Updated {new Date(row.updatedAt).toLocaleDateString('en-IN')}</span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </span>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4">
          {row.configured && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              Existing credentials are masked. Enter new values below to replace them — leave fields empty to keep existing.
            </p>
          )}
          {error && (
            <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 text-xs">
              ⚠ {error}
              <button type="button" onClick={() => setError('')} className="ml-auto"><X className="w-3 h-3" /></button>
            </div>
          )}
          <form onSubmit={handleSave} className="space-y-3">
            {meta.fields.map((field) => (
              <div key={field}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{FieldLabel(field)}</label>
                <input
                  type={field === 'password' ? 'password' : 'text'}
                  value={form[field] ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, [field]: e.target.value }))}
                  placeholder={row.configured ? '(unchanged)' : ''}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            ))}
            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : saved ? <><Check className="w-3.5 h-3.5" />Saved</> : 'Save Credentials'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default function ApiCredentialsPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [rows, setRows] = useState<ApiRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/insurer-admin/api-credentials')
      .then((r) => r.json())
      .then((d: { success: boolean; data: ApiRow[] }) => {
        if (d.success) setRows(d.data)
        else router.push(`/i/${slug}/admin/login`)
      })
      .finally(() => setLoading(false))
  }, [slug, router])

  function handleSaved(updated: ApiRow) {
    setRows((prev) => prev.map((r) => r.apiName === updated.apiName ? updated : r))
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>

  const configuredCount = rows.filter((r) => r.configured).length

  return (
    <div className="p-8 max-w-2xl">
      <Breadcrumb items={[{ label: 'Dashboard', href: `/i/${slug}/admin` }, { label: 'API Credentials' }]} />
      <h1 className="text-2xl font-bold text-slate-900 mb-1">API Credentials</h1>
      <p className="text-slate-500 text-sm mb-2">Configure credentials for external API integrations</p>
      <p className="text-xs text-slate-400 mb-8">{configuredCount} of {rows.length} APIs configured · All values are encrypted at rest · Displayed values are masked</p>

      <div className="space-y-3">
        {rows.map((row) => (
          <ApiCard key={row.apiName} row={row} onSaved={handleSaved} />
        ))}
      </div>
    </div>
  )
}

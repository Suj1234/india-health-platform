'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Check, X } from 'lucide-react'
import { Breadcrumb } from '@/components/insurer-admin/shell'
import type { InsurerConfig } from '@/types/insurer'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-4 border-b border-slate-100 last:border-0 grid grid-cols-3 gap-4 items-start">
      <div className="col-span-1 pt-2">
        <p className="text-sm font-medium text-slate-700">{label}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </div>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

function NumInput({ value, onChange, min, max, step }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) {
  return (
    <input
      type="number"
      value={value}
      onChange={(e) => onChange(parseInt(e.target.value) || 0)}
      min={min}
      max={max}
      step={step}
      className="w-40 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
    />
  )
}

export default function ProductPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [config, setConfig] = useState<Partial<InsurerConfig> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/insurer-admin/config')
      .then((r) => r.json())
      .then((d: { success: boolean; data: { config: Partial<InsurerConfig> } }) => {
        if (d.success) setConfig(d.data.config)
        else router.push(`/i/${slug}/admin/login`)
      })
      .finally(() => setLoading(false))
  }, [slug, router])

  function set<K extends keyof InsurerConfig>(key: K, value: InsurerConfig[K]) {
    setConfig((p) => p ? { ...p, [key]: value } : p)
    setSaved(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!config) return
    setSaveLoading(true)
    setError('')
    try {
      const res = await fetch('/api/insurer-admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) { setError(data.error ?? 'Save failed'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Network error')
    } finally {
      setSaveLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
  if (!config) return null

  return (
    <div className="p-8 max-w-2xl">
      <Breadcrumb items={[{ label: 'Dashboard', href: `/i/${slug}/admin` }, { label: 'Product Config' }]} />
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Product Configuration</h1>
      <p className="text-slate-500 text-sm mb-8">Policy settings and underwriting thresholds</p>

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
          ⚠ {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="bg-white rounded-xl border border-slate-200 mb-4">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Policy Settings</p>
          </div>
          <Field label="Policy Number Prefix" hint="Required for live mode">
            <input
              type="text"
              value={config.policy_number_prefix ?? ''}
              onChange={(e) => set('policy_number_prefix', e.target.value.toUpperCase())}
              placeholder="POL"
              maxLength={10}
              className="w-32 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
          <Field label="Policy Duration" hint="In months">
            <NumInput value={config.policy_duration_months ?? 12} onChange={(v) => set('policy_duration_months', v)} min={1} max={60} />
          </Field>
          <Field label="Free Look Period" hint="Days to cancel after issuance">
            <NumInput value={config.free_look_days ?? 15} onChange={(v) => set('free_look_days', v)} min={1} max={30} />
          </Field>
          <Field label="Sum Insured Options" hint="Comma-separated, in rupees">
            <input
              type="text"
              value={(config.sum_insured_options ?? []).join(', ')}
              onChange={(e) => {
                const nums = e.target.value.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
                set('sum_insured_options', nums)
              }}
              placeholder="300000, 500000, 750000, 1000000"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 mb-4">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Underwriting Thresholds</p>
          </div>
          <Field label="Financial Docs Threshold" hint="Sum insured (₹) above which income docs required">
            <NumInput value={config.financial_docs_threshold_sum_insured ?? 500000} onChange={(v) => set('financial_docs_threshold_sum_insured', v)} min={0} step={100000} />
          </Field>
          <Field label="Biometric Threshold" hint="Sum insured (₹) above which NuralX required">
            <NumInput value={config.biometric_threshold_sum_insured ?? 1000000} onChange={(v) => set('biometric_threshold_sum_insured', v)} min={0} step={100000} />
          </Field>
          <Field label="Auto Biometric Age" hint="Age above which NuralX is required regardless of SI">
            <NumInput value={config.stp_auto_biometric_age ?? 55} onChange={(v) => set('stp_auto_biometric_age', v)} min={18} max={80} />
          </Field>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 mb-4">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Payment Expiry</p>
          </div>
          <Field label="STP Payment Expiry" hint="Hours after STP approval">
            <NumInput value={config.payment_expiry_hours_stp ?? 24} onChange={(v) => set('payment_expiry_hours_stp', v)} min={1} max={168} />
          </Field>
          <Field label="UW Payment Expiry" hint="Days after UW approval">
            <NumInput value={config.payment_expiry_days_uw ?? 7} onChange={(v) => set('payment_expiry_days_uw', v)} min={1} max={30} />
          </Field>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saveLoading}
            className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {saveLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Saving…</> : saved ? <><Check className="w-4 h-4" />Saved</> : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}

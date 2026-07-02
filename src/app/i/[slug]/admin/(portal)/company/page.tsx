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

function Input({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${mono ? 'font-mono' : ''}`}
    />
  )
}

export default function CompanyPage() {
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
      <Breadcrumb items={[{ label: 'Dashboard', href: `/i/${slug}/admin` }, { label: 'Company' }]} />
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Company Details</h1>
      <p className="text-slate-500 text-sm mb-8">Legal and contact information shown on policy documents and emails</p>

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
          ⚠ {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="bg-white rounded-xl border border-slate-200 mb-4">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Contact Information</p>
          </div>
          <Field label="Contact Email"><Input value={config.contact_email ?? ''} onChange={(v) => set('contact_email', v)} placeholder="support@insurer.in" /></Field>
          <Field label="Contact Phone"><Input value={config.contact_phone ?? ''} onChange={(v) => set('contact_phone', v)} placeholder="1800-XXX-XXXX" /></Field>
          <Field label="Website"><Input value={config.website ?? ''} onChange={(v) => set('website', v)} placeholder="https://insurer.in" /></Field>
          <Field label="Grievance Email"><Input value={config.grievance_email ?? ''} onChange={(v) => set('grievance_email', v)} placeholder="grievance@insurer.in" /></Field>
          <Field label="Grievance Phone"><Input value={config.grievance_phone ?? ''} onChange={(v) => set('grievance_phone', v)} placeholder="1800-XXX-XXXX" /></Field>
          <Field label="Email Sender Name" hint="Displayed in email From field"><Input value={config.email_sender_name ?? ''} onChange={(v) => set('email_sender_name', v)} /></Field>
          <Field label="Email Reply-To"><Input value={config.email_reply_to ?? ''} onChange={(v) => set('email_reply_to', v)} placeholder="noreply@insurer.in" /></Field>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 mb-4">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 rounded-t-xl">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Legal & Regulatory</p>
          </div>
          <Field label="IRDAI Registration" hint="Required for live mode"><Input value={config.irdai_registration ?? ''} onChange={(v) => set('irdai_registration', v)} placeholder="IRDAI/HLT/XXX/YYYY" mono /></Field>
          <Field label="CIN"><Input value={config.cin ?? ''} onChange={(v) => set('cin', v)} placeholder="U66010MH2001PLC..." mono /></Field>
          <Field label="GSTIN" hint="Required for live mode"><Input value={config.gstin ?? ''} onChange={(v) => set('gstin', v)} placeholder="27AAAAA0000A1Z5" mono /></Field>
          <Field label="Registered Office" hint="Required for live mode">
            <textarea
              value={config.registered_office_address ?? ''}
              onChange={(e) => set('registered_office_address', e.target.value)}
              rows={3}
              placeholder="Full registered office address"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
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

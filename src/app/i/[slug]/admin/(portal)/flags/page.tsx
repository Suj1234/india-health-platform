'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Check, X } from 'lucide-react'
import { Breadcrumb } from '@/components/insurer-admin/shell'
import type { InsurerConfig } from '@/types/insurer'

interface FlagDef {
  key: keyof InsurerConfig
  label: string
  description: string
  warn?: string
}

const FLAGS: FlagDef[] = [
  {
    key: 'skip_needs_analysis',
    label: 'Skip Needs Analysis',
    description: 'Bypasses iAdore needs analysis step. Journey moves directly from identity verification to member collection.',
    warn: 'Enabling this means no financial needs data is collected for the customer.',
  },
  {
    key: 'skip_pivc',
    label: 'Skip PIVC',
    description: 'Bypasses Post-Issuance Verification Call (PIVC) after policy is issued.',
  },
  {
    key: 'skip_nuralx',
    label: 'Skip NuralX Vitals',
    description: 'Bypasses NuralX rPPG face-scan for all members regardless of sum insured or age thresholds.',
    warn: 'May increase UW risk. NuralX thresholds from Product Config will be ignored.',
  },
  {
    key: 'require_voter_or_passport',
    label: 'Require Voter ID or Passport',
    description: 'Adds voter ID or passport as a mandatory KYC document for the proposer in addition to Aadhaar and PAN.',
  },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
        checked ? 'bg-indigo-600' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

export default function FlagsPage() {
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
      <Breadcrumb items={[{ label: 'Dashboard', href: `/i/${slug}/admin` }, { label: 'Feature Flags' }]} />
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Feature Flags</h1>
      <p className="text-slate-500 text-sm mb-8">Toggle optional journey steps and requirements</p>

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
          ⚠ {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 mb-4">
          {FLAGS.map((flag) => {
            const enabled = !!(config[flag.key])
            return (
              <div key={flag.key} className="px-6 py-5 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{flag.label}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{flag.description}</p>
                  {flag.warn && enabled && (
                    <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-2">
                      ⚠ {flag.warn}
                    </p>
                  )}
                </div>
                <div className="shrink-0 pt-0.5">
                  <Toggle
                    checked={enabled}
                    onChange={(v) => set(flag.key, v as InsurerConfig[typeof flag.key])}
                  />
                </div>
              </div>
            )
          })}
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

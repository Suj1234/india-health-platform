'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, X, ChevronRight, ToggleLeft, Loader2 } from 'lucide-react'
import type { InsurerConfig } from '@/types/insurer'

interface InsurerData {
  id: string
  slug: string
  name: string
  mode: 'test' | 'live'
  config: InsurerConfig
}

interface CheckItem {
  label: string
  done: boolean
  href: string
}

function getChecklist(insurer: InsurerData): CheckItem[] {
  const c = insurer.config
  return [
    { label: 'Logo uploaded', done: !!(c.logo_url), href: 'branding' },
    { label: 'Primary color set', done: !!(c.primary_color && c.primary_color !== '#0d9488'), href: 'branding' },
    { label: 'Contact email & phone', done: !!(c.contact_email && c.contact_phone), href: 'company' },
    { label: 'Grievance details', done: !!(c.grievance_email && c.grievance_phone), href: 'company' },
    { label: 'IRDAI registration', done: !!(c.irdai_registration), href: 'company' },
    { label: 'GSTIN entered', done: !!(c.gstin), href: 'company' },
    { label: 'Registered office address', done: !!(c.registered_office_address), href: 'company' },
    { label: 'Sum insured options', done: !!(c.sum_insured_options?.length), href: 'product' },
    { label: 'Policy number prefix', done: !!(c.policy_number_prefix), href: 'product' },
  ]
}

export default function InsurerAdminDashboard() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [insurer, setInsurer] = useState<InsurerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [modeLoading, setModeLoading] = useState(false)
  const [preflightBlockers, setPreflightBlockers] = useState<string[]>([])
  const [showPreflightModal, setShowPreflightModal] = useState(false)

  useEffect(() => {
    fetch('/api/insurer-admin/config')
      .then((r) => r.json())
      .then((d: { success: boolean; data: InsurerData }) => {
        if (d.success) setInsurer(d.data)
        else router.push(`/i/${slug}/admin/login`)
      })
      .finally(() => setLoading(false))
  }, [slug, router])

  async function handleModeToggle() {
    if (!insurer) return
    const targetMode = insurer.mode === 'test' ? 'live' : 'test'

    if (targetMode === 'live') {
      // Run pre-flight first
      const res = await fetch(`/api/insurer-admin/mode?target=live`)
      const data = await res.json() as { success: boolean; preflight: { canSwitch: boolean; blockers: string[] } }
      if (!data.preflight.canSwitch) {
        setPreflightBlockers(data.preflight.blockers)
        setShowPreflightModal(true)
        return
      }
    }

    setModeLoading(true)
    try {
      const res = await fetch('/api/insurer-admin/mode', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: targetMode }),
      })
      const data = await res.json() as { success: boolean; data?: { mode: string } }
      if (data.success && data.data) {
        setInsurer({ ...insurer, mode: data.data.mode as 'test' | 'live' })
      }
    } finally {
      setModeLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  if (!insurer) return null

  const checklist = getChecklist(insurer)
  const doneCount = checklist.filter((c) => c.done).length
  const completionPct = Math.round((doneCount / checklist.length) * 100)

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-0.5">Configure your insurer portal settings</p>
      </div>

      {/* Mode toggle card */}
      <div className={`rounded-xl border p-5 mb-6 flex items-center justify-between ${
        insurer.mode === 'live' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'
      }`}>
        <div>
          <p className={`font-semibold ${insurer.mode === 'live' ? 'text-amber-900' : 'text-slate-900'}`}>
            {insurer.mode === 'live' ? '● Live Mode — Real customers & policies' : '○ Test Mode — All APIs are mocked'}
          </p>
          <p className={`text-sm mt-0.5 ${insurer.mode === 'live' ? 'text-amber-700' : 'text-slate-500'}`}>
            {insurer.mode === 'live'
              ? 'Payments are real. Policies are legally binding.'
              : 'Safe for testing. No real data is processed.'}
          </p>
        </div>
        <button
          onClick={handleModeToggle}
          disabled={modeLoading}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            insurer.mode === 'live'
              ? 'bg-amber-200 hover:bg-amber-300 text-amber-900'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          } disabled:opacity-50`}
        >
          {modeLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ToggleLeft className="w-4 h-4" />}
          Switch to {insurer.mode === 'live' ? 'Test' : 'Live'}
        </button>
      </div>

      {/* Setup checklist */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">Setup Checklist</h2>
            <p className="text-sm text-slate-500 mt-0.5">{doneCount} of {checklist.length} complete</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${completionPct}%` }}
              />
            </div>
            <span className="text-sm font-semibold text-slate-700">{completionPct}%</span>
          </div>
        </div>
        <div className="divide-y divide-slate-50">
          {checklist.map((item) => (
            <Link
              key={item.label}
              href={`/i/${slug}/admin/${item.href}`}
              className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors group"
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                item.done ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {item.done ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
              </span>
              <span className={`text-sm flex-1 ${item.done ? 'text-slate-700' : 'text-slate-500'}`}>
                {item.label}
              </span>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </Link>
          ))}
        </div>
      </div>

      {/* Pre-flight modal */}
      {showPreflightModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-md shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-2">Cannot switch to Live Mode</h3>
            <p className="text-sm text-slate-500 mb-4">Complete the following before going live:</p>
            <ul className="space-y-2 mb-5">
              {preflightBlockers.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-red-700">
                  <X className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  {b}
                </li>
              ))}
            </ul>
            <button
              onClick={() => setShowPreflightModal(false)}
              className="w-full py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

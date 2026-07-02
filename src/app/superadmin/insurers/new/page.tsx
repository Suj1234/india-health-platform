'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle, Check, Info } from 'lucide-react'
import SuperadminShell, { Breadcrumb } from '@/components/superadmin/shell'

const SLUG_REGEX = /^[a-z0-9-]+$/
const RESERVED = new Set(['admin', 'api', 'www', 'superadmin', 'i', 'underwriter', 'policy', 'payment', 'apply'])

export default function NewInsurerPage() {
  const router = useRouter()
  const [form, setForm] = useState({ slug: '', name: '', mode: 'test' as 'test' | 'live' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const slugError = form.slug.length > 0 && (
    !SLUG_REGEX.test(form.slug) ? 'Slug must use only lowercase letters, numbers, and hyphens' :
    form.slug.length < 3 ? 'Slug must be at least 3 characters' :
    RESERVED.has(form.slug) ? `"${form.slug}" is a reserved slug` :
    null
  )

  const isValid = form.slug.length >= 3 && form.name.length >= 2 && !slugError

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/admin/insurers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json() as { success: boolean; error?: string; data?: { id: string } }
      if (!data.success) {
        setError(data.error ?? 'Failed to create insurer')
        return
      }
      router.push(`/superadmin/insurers/${data.data!.id}`)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SuperadminShell>
      <div className="p-8 max-w-xl">
        <Breadcrumb items={[{ label: 'Insurers', href: '/superadmin' }, { label: 'New Insurer' }]} />

        <h1 className="text-2xl font-bold text-slate-900 mb-1">New Insurer</h1>
        <p className="text-slate-500 text-sm mb-8">Create a new insurer on the platform. The slug cannot be changed after creation.</p>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Insurer Name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Star Health Insurance"
                required
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm transition-all"
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                URL Slug
                <span className="ml-2 text-xs font-normal text-slate-400">permanent, cannot be changed</span>
              </label>
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase() })}
                placeholder="e.g. star-health"
                required
                className={`w-full px-4 py-2.5 bg-slate-50 border rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm font-mono transition-all ${
                  slugError ? 'border-red-400 bg-red-50' : 'border-slate-300'
                }`}
              />
              {slugError ? (
                <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {slugError}
                </p>
              ) : form.slug.length >= 3 ? (
                <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  Customer portal will be at <span className="font-mono text-indigo-600">/i/{form.slug}</span>
                </p>
              ) : null}
            </div>

            {/* Mode */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Initial Mode</label>
              <div className="grid grid-cols-2 gap-3">
                {(['test', 'live'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setForm({ ...form, mode: m })}
                    className={`flex items-center gap-2.5 px-4 py-3 rounded-lg border text-sm font-medium transition-all ${
                      form.mode === m
                        ? m === 'live'
                          ? 'border-amber-400 bg-amber-50 text-amber-800'
                          : 'border-indigo-400 bg-indigo-50 text-indigo-800'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${form.mode === m ? (m === 'live' ? 'bg-amber-500' : 'bg-indigo-500') : 'bg-slate-300'}`} />
                    <div className="text-left">
                      <p className="font-medium capitalize">{m}</p>
                      <p className="text-xs font-normal mt-0.5 opacity-70">
                        {m === 'test' ? 'All APIs mocked' : 'Real API calls'}
                      </p>
                    </div>
                    {form.mode === m && <Check className="w-4 h-4 ml-auto" />}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => router.push('/superadmin')}
                className="flex-1 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || loading}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 disabled:text-indigo-400 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Creating…
                  </>
                ) : (
                  'Create Insurer'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SuperadminShell>
  )
}

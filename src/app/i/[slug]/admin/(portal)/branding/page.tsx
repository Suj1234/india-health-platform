'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, Check, Upload, X } from 'lucide-react'
import { Breadcrumb } from '@/components/insurer-admin/shell'
import type { InsurerConfig } from '@/types/insurer'

const GOOGLE_FONTS = ['Inter', 'Poppins', 'Roboto', 'Lato', 'Nunito', 'Montserrat', 'Open Sans', 'Raleway', 'Source Sans Pro']

export default function BrandingPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [config, setConfig] = useState<Partial<InsurerConfig> | null>(null)
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadLoading, setUploadLoading] = useState(false)
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

  function setField<K extends keyof InsurerConfig>(key: K, value: InsurerConfig[K]) {
    setConfig((prev) => prev ? { ...prev, [key]: value } : prev)
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

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadLoading(true)
    setError('')
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/insurer-admin/logo', { method: 'POST', body: form })
      const data = await res.json() as { success: boolean; url?: string; error?: string }
      if (!data.success) { setError(data.error ?? 'Upload failed'); return }
      setField('logo_url', data.url!)
    } catch {
      setError('Upload failed')
    } finally {
      setUploadLoading(false)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
  if (!config) return null

  return (
    <div className="p-8 max-w-2xl">
      <Breadcrumb items={[{ label: 'Dashboard', href: `/i/${slug}/admin` }, { label: 'Branding' }]} />
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Branding</h1>
      <p className="text-slate-500 text-sm mb-8">Customize how your portal looks to customers</p>

      {error && (
        <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
          ⚠ {error}
          <button onClick={() => setError('')} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-0 bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
        {/* Logo */}
        <div className="px-6 py-5">
          <p className="text-sm font-medium text-slate-700 mb-3">Logo</p>
          <div className="flex items-start gap-4">
            <div className="w-24 h-16 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
              {config.logo_url ? (
                <img src={config.logo_url} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <span className="text-slate-400 text-xs text-center px-2">No logo</span>
              )}
            </div>
            <div>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadLoading}
                className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
              >
                {uploadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {uploadLoading ? 'Uploading…' : 'Upload Logo'}
              </button>
              <p className="text-xs text-slate-400 mt-1.5">PNG, JPG or WebP. Max 2MB. Will be resized to 400×200.</p>
            </div>
          </div>
        </div>

        {/* Primary color */}
        <div className="px-6 py-5">
          <p className="text-sm font-medium text-slate-700 mb-3">Primary Color</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={config.primary_color ?? '#0d9488'}
              onChange={(e) => setField('primary_color', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-slate-300"
            />
            <input
              type="text"
              value={config.primary_color ?? ''}
              onChange={(e) => setField('primary_color', e.target.value)}
              className="w-36 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="w-10 h-10 rounded border border-slate-200" style={{ backgroundColor: config.primary_color ?? '#0d9488' }} />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">Used for buttons, links, and accents in the customer portal</p>
        </div>

        {/* Secondary color */}
        <div className="px-6 py-5">
          <p className="text-sm font-medium text-slate-700 mb-3">Secondary Color</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={config.secondary_color ?? '#134e4a'}
              onChange={(e) => setField('secondary_color', e.target.value)}
              className="w-10 h-10 rounded cursor-pointer border border-slate-300"
            />
            <input
              type="text"
              value={config.secondary_color ?? ''}
              onChange={(e) => setField('secondary_color', e.target.value)}
              className="w-36 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="w-10 h-10 rounded border border-slate-200" style={{ backgroundColor: config.secondary_color ?? '#134e4a' }} />
          </div>
        </div>

        {/* Font */}
        <div className="px-6 py-5">
          <p className="text-sm font-medium text-slate-700 mb-3">Font Family</p>
          <select
            value={config.font_family ?? 'Inter'}
            onChange={(e) => setField('font_family', e.target.value)}
            className="w-56 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {GOOGLE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <p className="text-xs text-slate-400 mt-1.5">Google Font loaded in the customer portal</p>
        </div>

        {/* Save */}
        <div className="px-6 py-4 bg-slate-50 flex justify-end">
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

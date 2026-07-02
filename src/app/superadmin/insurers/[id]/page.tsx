'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle, Check, Loader2, Plus, Trash2, KeyRound, Power, LogIn } from 'lucide-react'
import SuperadminShell, { Breadcrumb } from '@/components/superadmin/shell'
import type { InsurerConfig } from '@/types/insurer'

type Tab = 'branding' | 'company' | 'product' | 'flags' | 'users'

interface InsurerData {
  id: string
  slug: string
  name: string
  mode: 'test' | 'live'
  isActive: boolean
  logoUrl: string | null
  config: InsurerConfig
}

interface UserRow {
  id: string
  email: string | null
  name: string | null
  role: string
  isActive: boolean
  mustChangePassword: boolean
  lastLoginAt: string | null
  createdAt: string
}

const GOOGLE_FONTS = ['Inter', 'Poppins', 'Roboto', 'Lato', 'Nunito', 'Montserrat', 'Open Sans', 'Raleway', 'Source Sans Pro']

// ── Helpers ───────────────────────────────────────────────────────────────────

function SaveButton({ loading, saved }: { loading: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg transition-colors"
    >
      {loading ? (
        <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</>
      ) : saved ? (
        <><Check className="w-4 h-4" /> Saved</>
      ) : 'Save Changes'}
    </button>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-4 items-start py-4 border-b border-slate-100 last:border-0">
      <label className="text-sm font-medium text-slate-700 pt-2.5 col-span-1">{label}</label>
      <div className="col-span-2">{children}</div>
    </div>
  )
}

function TextInput({ value, onChange, placeholder, mono }: { value: string; onChange: (v: string) => void; placeholder?: string; mono?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${mono ? 'font-mono' : ''}`}
    />
  )
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc: string }) {
  return (
    <div className="flex items-start gap-4 py-3 border-b border-slate-100 last:border-0">
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors shrink-0 mt-0.5 ${checked ? 'bg-indigo-600' : 'bg-slate-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EditInsurerPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('branding')
  const [insurer, setInsurer] = useState<InsurerData | null>(null)
  const [config, setConfig] = useState<InsurerConfig | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)

  const setConfigField = <K extends keyof InsurerConfig>(key: K, value: InsurerConfig[K]) => {
    setConfig((prev) => prev ? { ...prev, [key]: value } : prev)
    setSaved(false)
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [insurerRes, usersRes] = await Promise.all([
        fetch(`/api/admin/insurers/${id}`),
        fetch(`/api/admin/insurers/${id}/users`),
      ])
      if (insurerRes.status === 403) { router.push('/superadmin/login'); return }
      if (insurerRes.status === 404) { router.push('/superadmin'); return }

      const insurerData = await insurerRes.json() as { success: boolean; data: InsurerData }
      const usersData = await usersRes.json() as { success: boolean; data: UserRow[] }

      setInsurer(insurerData.data)
      setConfig(insurerData.data.config)
      setUsers(usersData.data ?? [])
    } catch {
      setError('Failed to load insurer')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { load() }, [load])

  async function saveConfig() {
    if (!config || !insurer) return
    setSaveLoading(true)
    setSaved(false)
    try {
      const res = await fetch(`/api/admin/insurers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: insurer.name, mode: insurer.mode, isActive: insurer.isActive, logoUrl: insurer.logoUrl, config }),
      })
      const data = await res.json() as { success: boolean; error?: string }
      if (!data.success) { setError(data.error ?? 'Failed to save'); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaveLoading(false)
    }
  }

  async function toggleMode() {
    if (!insurer) return
    const newMode = insurer.mode === 'test' ? 'live' : 'test'
    const res = await fetch(`/api/admin/insurers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: newMode }),
    })
    const data = await res.json() as { success: boolean }
    if (data.success) setInsurer({ ...insurer, mode: newMode })
  }

  async function toggleActive() {
    if (!insurer) return
    const res = await fetch(`/api/admin/insurers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !insurer.isActive }),
    })
    const data = await res.json() as { success: boolean }
    if (data.success) setInsurer({ ...insurer, isActive: !insurer.isActive })
  }

  async function handleImpersonate() {
    if (!insurer) return
    const res = await fetch(`/api/admin/insurers/${id}/impersonate`, { method: 'POST' })
    const data = await res.json() as { success: boolean; redirectTo?: string; error?: string }
    if (data.success && data.redirectTo) {
      window.open(data.redirectTo, '_blank')
    } else {
      setError(data.error ?? 'Impersonation failed')
    }
  }

  async function deactivateUser(userId: string, isActive: boolean) {
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !isActive }),
    })
    setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, isActive: !isActive } : u))
  }

  if (loading) {
    return (
      <SuperadminShell>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      </SuperadminShell>
    )
  }

  if (!insurer || !config) {
    return (
      <SuperadminShell>
        <div className="p-8">
          <p className="text-red-600">{error || 'Insurer not found'}</p>
        </div>
      </SuperadminShell>
    )
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'branding', label: 'Branding' },
    { id: 'company', label: 'Company' },
    { id: 'product', label: 'Product' },
    { id: 'flags', label: 'Feature Flags' },
    { id: 'users', label: `Users (${users.length})` },
  ]

  return (
    <SuperadminShell>
      <div className="p-8">
        <Breadcrumb items={[{ label: 'Insurers', href: '/superadmin' }, { label: insurer.name }]} />

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{insurer.name}</h1>
            <p className="text-slate-400 text-sm font-mono mt-0.5">/i/{insurer.slug}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleImpersonate}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-indigo-300 text-indigo-700 hover:bg-indigo-50 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5" />
              Impersonate
            </button>
            <button
              onClick={toggleActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                insurer.isActive
                  ? 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              {insurer.isActive ? 'Deactivate' : 'Activate'}
            </button>
            <button
              onClick={toggleMode}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                insurer.mode === 'live'
                  ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {insurer.mode === 'live' ? '● Live Mode' : '○ Test Mode'}
              <span className="text-slate-400 ml-1">— click to toggle</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">✕</button>
          </div>
        )}

        {/* Tab bar */}
        <div className="border-b border-slate-200 mb-6">
          <nav className="flex gap-0 -mb-px">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab content */}
        <form onSubmit={(e) => { e.preventDefault(); saveConfig() }} className="max-w-2xl">
          <div className="bg-white rounded-xl border border-slate-200 px-6">
            {/* ── BRANDING ─────────────────────────────────────────── */}
            {tab === 'branding' && (
              <>
                <FieldRow label="Insurer Name">
                  <TextInput value={insurer.name} onChange={(v) => setInsurer({ ...insurer, name: v })} />
                </FieldRow>
                <FieldRow label="Logo URL">
                  <TextInput value={config.logo_url ?? ''} onChange={(v) => setConfigField('logo_url', v)} placeholder="https://..." />
                  {config.logo_url && (
                    <img src={config.logo_url} alt="Logo preview" className="mt-2 h-12 object-contain rounded border border-slate-200 bg-slate-50 p-1" />
                  )}
                </FieldRow>
                <FieldRow label="Primary Color">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.primary_color}
                      onChange={(e) => setConfigField('primary_color', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                    />
                    <TextInput value={config.primary_color} onChange={(v) => setConfigField('primary_color', v)} mono />
                  </div>
                </FieldRow>
                <FieldRow label="Secondary Color">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={config.secondary_color}
                      onChange={(e) => setConfigField('secondary_color', e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer border border-slate-300"
                    />
                    <TextInput value={config.secondary_color} onChange={(v) => setConfigField('secondary_color', v)} mono />
                  </div>
                </FieldRow>
                <FieldRow label="Font Family">
                  <select
                    value={config.font_family ?? 'Inter'}
                    onChange={(e) => setConfigField('font_family', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {GOOGLE_FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <p className="text-xs text-slate-400 mt-1.5">Google Font loaded for the customer portal</p>
                </FieldRow>
              </>
            )}

            {/* ── COMPANY ──────────────────────────────────────────── */}
            {tab === 'company' && (
              <>
                <FieldRow label="Contact Email">
                  <TextInput value={config.contact_email} onChange={(v) => setConfigField('contact_email', v)} placeholder="support@insurer.in" />
                </FieldRow>
                <FieldRow label="Contact Phone">
                  <TextInput value={config.contact_phone} onChange={(v) => setConfigField('contact_phone', v)} placeholder="1800-XXX-XXXX" />
                </FieldRow>
                <FieldRow label="Website">
                  <TextInput value={config.website} onChange={(v) => setConfigField('website', v)} placeholder="https://insurer.in" />
                </FieldRow>
                <FieldRow label="Grievance Email">
                  <TextInput value={config.grievance_email} onChange={(v) => setConfigField('grievance_email', v)} placeholder="grievance@insurer.in" />
                </FieldRow>
                <FieldRow label="Grievance Phone">
                  <TextInput value={config.grievance_phone} onChange={(v) => setConfigField('grievance_phone', v)} placeholder="1800-XXX-XXXX" />
                </FieldRow>
                <FieldRow label="IRDAI Registration">
                  <TextInput value={config.irdai_registration} onChange={(v) => setConfigField('irdai_registration', v)} placeholder="IRDAI/HLT/XXX/YYYY" mono />
                </FieldRow>
                <FieldRow label="CIN">
                  <TextInput value={config.cin} onChange={(v) => setConfigField('cin', v)} placeholder="U66010MH2001PLC..." mono />
                </FieldRow>
                <FieldRow label="GSTIN">
                  <TextInput value={config.gstin} onChange={(v) => setConfigField('gstin', v)} placeholder="27AAAAA0000A1Z5" mono />
                </FieldRow>
                <FieldRow label="Registered Office">
                  <textarea
                    value={config.registered_office_address}
                    onChange={(e) => setConfigField('registered_office_address', e.target.value)}
                    rows={3}
                    placeholder="Full registered office address"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </FieldRow>
                <FieldRow label="Email Sender Name">
                  <TextInput value={config.email_sender_name} onChange={(v) => setConfigField('email_sender_name', v)} />
                </FieldRow>
                <FieldRow label="Email Reply-To">
                  <TextInput value={config.email_reply_to} onChange={(v) => setConfigField('email_reply_to', v)} placeholder="noreply@insurer.in" />
                </FieldRow>
              </>
            )}

            {/* ── PRODUCT ──────────────────────────────────────────── */}
            {tab === 'product' && (
              <>
                <FieldRow label="Policy Number Prefix">
                  <TextInput value={config.policy_number_prefix} onChange={(v) => setConfigField('policy_number_prefix', v)} mono placeholder="POL" />
                </FieldRow>
                <FieldRow label="Policy Duration (months)">
                  <input
                    type="number"
                    value={config.policy_duration_months}
                    onChange={(e) => setConfigField('policy_duration_months', parseInt(e.target.value) || 12)}
                    min={1}
                    max={60}
                    className="w-32 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </FieldRow>
                <FieldRow label="Free Look Period (days)">
                  <input
                    type="number"
                    value={config.free_look_days}
                    onChange={(e) => setConfigField('free_look_days', parseInt(e.target.value) || 15)}
                    min={1}
                    max={30}
                    className="w-32 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </FieldRow>
                <FieldRow label="Sum Insured Options (₹)">
                  <TextInput
                    value={config.sum_insured_options.join(', ')}
                    onChange={(v) => {
                      const nums = v.split(',').map((s) => parseInt(s.trim())).filter((n) => !isNaN(n))
                      setConfigField('sum_insured_options', nums)
                    }}
                    placeholder="300000, 500000, 750000, 1000000"
                    mono
                  />
                  <p className="text-xs text-slate-400 mt-1.5">Comma-separated values in rupees</p>
                </FieldRow>
                <FieldRow label="Financial Docs Threshold (₹)">
                  <input
                    type="number"
                    value={config.financial_docs_threshold_sum_insured}
                    onChange={(e) => setConfigField('financial_docs_threshold_sum_insured', parseInt(e.target.value) || 0)}
                    step={100000}
                    className="w-48 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">Sum insured above which income docs are required</p>
                </FieldRow>
                <FieldRow label="Biometric Threshold (₹)">
                  <input
                    type="number"
                    value={config.biometric_threshold_sum_insured}
                    onChange={(e) => setConfigField('biometric_threshold_sum_insured', parseInt(e.target.value) || 0)}
                    step={100000}
                    className="w-48 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </FieldRow>
                <FieldRow label="Auto Biometric Age">
                  <input
                    type="number"
                    value={config.stp_auto_biometric_age}
                    onChange={(e) => setConfigField('stp_auto_biometric_age', parseInt(e.target.value) || 55)}
                    min={18}
                    max={80}
                    className="w-32 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-slate-400 mt-1.5">Age above which NuralX is required automatically</p>
                </FieldRow>
                <FieldRow label="STP Payment Expiry (hours)">
                  <input
                    type="number"
                    value={config.payment_expiry_hours_stp}
                    onChange={(e) => setConfigField('payment_expiry_hours_stp', parseInt(e.target.value) || 24)}
                    min={1}
                    max={168}
                    className="w-32 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </FieldRow>
                <FieldRow label="UW Payment Expiry (days)">
                  <input
                    type="number"
                    value={config.payment_expiry_days_uw}
                    onChange={(e) => setConfigField('payment_expiry_days_uw', parseInt(e.target.value) || 7)}
                    min={1}
                    max={30}
                    className="w-32 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </FieldRow>
              </>
            )}

            {/* ── FLAGS ────────────────────────────────────────────── */}
            {tab === 'flags' && (
              <div className="py-2">
                <Toggle
                  checked={config.skip_needs_analysis}
                  onChange={(v) => setConfigField('skip_needs_analysis', v)}
                  label="Skip Needs Analysis"
                  desc="Skip the PMW needs analysis step entirely. Enabled for most insurers."
                />
                <Toggle
                  checked={config.skip_pivc}
                  onChange={(v) => setConfigField('skip_pivc', v)}
                  label="Skip PIVC"
                  desc="Skip the PIVC (Pre-issuance Verification Call) step."
                />
                <Toggle
                  checked={config.skip_nuralx}
                  onChange={(v) => setConfigField('skip_nuralx', v)}
                  label="Skip NuralX Vitals"
                  desc="Skip NuralX face scan for all applicants (overrides age/SI thresholds)."
                />
                <Toggle
                  checked={config.require_voter_or_passport}
                  onChange={(v) => setConfigField('require_voter_or_passport', v)}
                  label="Require Voter ID or Passport"
                  desc="Require additional address proof (Voter ID or Passport) alongside Aadhaar."
                />
              </div>
            )}
          </div>

          {/* Save button — not shown on users tab */}
          {tab !== 'users' && (
            <div className="flex justify-end mt-4">
              <SaveButton loading={saveLoading} saved={saved} />
            </div>
          )}
        </form>

        {/* ── USERS TAB (outside the form) ────────────────────────── */}
        {tab === 'users' && (
          <div className="max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-slate-500">{users.length} user{users.length !== 1 ? 's' : ''} for this insurer</p>
              <button
                onClick={() => setShowAddUser(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add User
              </button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {users.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">No users yet for this insurer.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Last Login</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{u.name}</p>
                          <p className="text-xs text-slate-400">{u.email}</p>
                          {u.mustChangePassword && (
                            <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">Must reset pwd</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded font-mono">{u.role}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded ${u.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {u.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-IN') : 'Never'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <ResetPasswordButton userId={u.id} />
                            <button
                              onClick={() => deactivateUser(u.id, u.isActive)}
                              title={u.isActive ? 'Deactivate' : 'Activate'}
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                            >
                              <Power className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {showAddUser && (
              <AddUserModal
                insurerId={id}
                onClose={() => setShowAddUser(false)}
                onCreated={(u) => { setUsers((prev) => [...prev, u]); setShowAddUser(false) }}
              />
            )}
          </div>
        )}
      </div>
    </SuperadminShell>
  )
}

// ── Reset Password Button ─────────────────────────────────────────────────────

function ResetPasswordButton({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [pwd, setPwd] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleReset() {
    if (!pwd || pwd.length < 8) return
    setLoading(true)
    try {
      await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwd, mustChangePassword: true }),
      })
      setDone(true)
      setTimeout(() => { setOpen(false); setDone(false); setPwd('') }, 1500)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Reset password"
        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded hover:bg-indigo-50 transition-colors"
      >
        <KeyRound className="w-4 h-4" />
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-sm shadow-xl">
            <h3 className="font-semibold text-slate-900 mb-4">Reset Password</h3>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              placeholder="New password (min 8 chars)"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button onClick={() => setOpen(false)} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
              <button
                onClick={handleReset}
                disabled={pwd.length < 8 || loading}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-200 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              >
                {done ? <><Check className="w-4 h-4" /> Done</> : loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Add User Modal ────────────────────────────────────────────────────────────

function AddUserModal({
  insurerId,
  onClose,
  onCreated,
}: {
  insurerId: string
  onClose: () => void
  onCreated: (u: UserRow) => void
}) {
  const [form, setForm] = useState({ name: '', email: '', role: 'insurer_admin' as 'insurer_admin' | 'underwriter', password: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/insurers/${insurerId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, mustChangePassword: true }),
      })
      const data = await res.json() as { success: boolean; error?: string; data?: UserRow }
      if (!data.success) { setError(data.error ?? 'Failed to create user'); return }
      onCreated(data.data!)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl border border-slate-200 p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-slate-900 mb-4">Add User</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value as 'insurer_admin' | 'underwriter' })}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="insurer_admin">Insurer Admin</option>
            <option value="underwriter">Underwriter</option>
          </select>
          <input
            type="password"
            placeholder="Temporary password (min 8 chars)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
            minLength={8}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {error && <p className="text-red-600 text-xs">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

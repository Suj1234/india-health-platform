'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Building2, Plus, Pencil, Users, RefreshCw, AlertCircle } from 'lucide-react'
import SuperadminShell from '@/components/superadmin/shell'

interface InsurerRow {
  id: string
  slug: string
  name: string
  mode: string
  isActive: boolean
  logoUrl: string | null
  createdAt: string
  userCount: number
}

export default function SuperadminHome() {
  const router = useRouter()
  const [insurers, setInsurers] = useState<InsurerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function load() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin/insurers')
      if (res.status === 403) { router.push('/superadmin/login'); return }
      const data = await res.json() as { success: boolean; data: InsurerRow[]; error?: string }
      if (!data.success) throw new Error(data.error ?? 'Failed to load')
      setInsurers(data.data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load insurers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const activeCount = insurers.filter((i) => i.isActive).length
  const liveCount = insurers.filter((i) => i.mode === 'live').length

  return (
    <SuperadminShell>
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Insurers</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage all insurers on the platform</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              href="/superadmin/insurers/new"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Insurer
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Total Insurers', value: insurers.length, color: 'text-slate-900' },
            { label: 'Active', value: activeCount, color: 'text-emerald-700' },
            { label: 'Live Mode', value: liveCount, color: 'text-amber-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
              <p className="text-sm text-slate-500">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-6 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading && insurers.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin mr-3" />
              Loading insurers…
            </div>
          ) : insurers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Building2 className="w-10 h-10 mb-3 text-slate-300" />
              <p className="font-medium text-slate-600">No insurers yet</p>
              <p className="text-sm mt-1">Create your first insurer to get started</p>
              <Link
                href="/superadmin/insurers/new"
                className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Insurer
              </Link>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Insurer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Mode</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Users</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {insurers.map((insurer) => (
                  <tr key={insurer.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {insurer.logoUrl ? (
                          <img src={insurer.logoUrl} alt="" className="w-8 h-8 rounded object-contain border border-slate-200 bg-white" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-indigo-100 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900">{insurer.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{insurer.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        insurer.mode === 'live'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {insurer.mode === 'live' ? '● Live' : '○ Test'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                        insurer.isActive
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {insurer.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {insurer.userCount}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-slate-500 text-xs">
                      {new Date(insurer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/superadmin/insurers/${insurer.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </SuperadminShell>
  )
}

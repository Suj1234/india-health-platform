'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, AlertCircle, Filter } from 'lucide-react'
import SuperadminShell, { Breadcrumb } from '@/components/superadmin/shell'

interface AuditRow {
  id: string
  action: string
  entityType: string | null
  fieldChanged: string | null
  oldValue: string | null
  newValue: string | null
  ipAddress: string | null
  createdAt: string
  actorName: string | null
  actorEmail: string | null
  actorRole: string
  insurerName: string | null
  insurerSlug: string | null
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  mode_change: 'Mode Changed',
  login: 'Logged In',
  impersonate_start: 'Started Impersonation',
  impersonate_end: 'Ended Impersonation',
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-100 text-emerald-700',
  update: 'bg-blue-100 text-blue-700',
  delete: 'bg-red-100 text-red-700',
  mode_change: 'bg-amber-100 text-amber-700',
  login: 'bg-slate-100 text-slate-600',
  impersonate_start: 'bg-purple-100 text-purple-700',
  impersonate_end: 'bg-purple-100 text-purple-700',
}

export default function AuditLogPage() {
  const router = useRouter()
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [filters, setFilters] = useState({ action: '', from: '', to: '' })
  const [showFilters, setShowFilters] = useState(false)

  async function load(p = 1, replace = true) {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams({ page: String(p) })
      if (filters.action) params.set('action', filters.action)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)

      const res = await fetch(`/api/admin/audit?${params}`)
      if (res.status === 403) { router.push('/superadmin/login'); return }
      const data = await res.json() as { success: boolean; data: AuditRow[]; perPage: number }
      if (!data.success) throw new Error('Failed to load')

      setRows((prev) => replace ? data.data : [...prev, ...data.data])
      setHasMore(data.data.length === data.perPage)
    } catch {
      setError('Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(1, true) }, [])

  function applyFilters() {
    setPage(1)
    load(1, true)
    setShowFilters(false)
  }

  function loadMore() {
    const next = page + 1
    setPage(next)
    load(next, false)
  }

  return (
    <SuperadminShell>
      <div className="p-8">
        <Breadcrumb items={[{ label: 'Insurers', href: '/superadmin' }, { label: 'Audit Log' }]} />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Audit Log</h1>
            <p className="text-slate-500 text-sm mt-0.5">All platform configuration changes and logins</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filters
            </button>
            <button
              onClick={() => load(1, true)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="bg-white border border-slate-200 rounded-xl p-4 mb-4 flex items-end gap-4 flex-wrap">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All actions</option>
                {Object.entries(ACTION_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Apply
            </button>
            <button
              onClick={() => { setFilters({ action: '', from: '', to: '' }); load(1, true) }}
              className="px-4 py-2 border border-slate-300 text-slate-600 text-sm rounded-lg hover:bg-slate-50 transition-colors"
            >
              Clear
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          {loading && rows.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
              <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-500 rounded-full animate-spin mr-3" />
              Loading audit log…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">No audit entries found.</div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">When</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Actor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Insurer</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(row.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[row.action] ?? 'bg-slate-100 text-slate-600'}`}>
                          {ACTION_LABELS[row.action] ?? row.action}
                        </span>
                        {row.entityType && (
                          <p className="text-xs text-slate-400 mt-0.5">{row.entityType}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-slate-800 font-medium">{row.actorName ?? '—'}</p>
                        <p className="text-xs text-slate-400">{row.actorEmail}</p>
                      </td>
                      <td className="px-4 py-3">
                        {row.insurerName ? (
                          <>
                            <p className="text-slate-700">{row.insurerName}</p>
                            <p className="text-xs text-slate-400 font-mono">{row.insurerSlug}</p>
                          </>
                        ) : (
                          <span className="text-slate-400 text-xs">Platform</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {row.fieldChanged ? (
                          <div className="text-xs">
                            <span className="font-mono text-slate-600">{row.fieldChanged}</span>
                            {row.oldValue && (
                              <span className="text-slate-400"> {row.oldValue} → {row.newValue}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {hasMore && (
                <div className="p-4 border-t border-slate-100 text-center">
                  <button
                    onClick={loadMore}
                    disabled={loading}
                    className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
                  >
                    {loading ? 'Loading…' : 'Load more'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </SuperadminShell>
  )
}

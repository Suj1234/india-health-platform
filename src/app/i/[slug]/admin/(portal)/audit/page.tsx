'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, ChevronDown } from 'lucide-react'
import { Breadcrumb } from '@/components/insurer-admin/shell'

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
  actorRole: string | null
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function ActionBadge({ action }: { action: string }) {
  const lower = action.toLowerCase()
  let cls = 'bg-slate-100 text-slate-600'
  if (lower.includes('create') || lower.includes('add')) cls = 'bg-emerald-50 text-emerald-700'
  else if (lower.includes('delete') || lower.includes('remove') || lower.includes('reject')) cls = 'bg-red-50 text-red-700'
  else if (lower.includes('update') || lower.includes('edit') || lower.includes('change')) cls = 'bg-blue-50 text-blue-700'
  else if (lower.includes('login') || lower.includes('auth')) cls = 'bg-indigo-50 text-indigo-700'
  else if (lower.includes('mode') || lower.includes('live')) cls = 'bg-amber-50 text-amber-700'
  return <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{formatAction(action)}</span>
}

export default function AuditPage() {
  const { slug } = useParams<{ slug: string }>()
  const router = useRouter()
  const [rows, setRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const fetchPage = useCallback(async (p: number, replace: boolean) => {
    const params = new URLSearchParams({ page: String(p) })
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    const res = await fetch(`/api/insurer-admin/audit?${params}`)
    const data = await res.json() as { success: boolean; data: AuditRow[]; perPage: number }
    if (!data.success) {
      router.push(`/i/${slug}/admin/login`)
      return
    }
    setRows((prev) => replace ? data.data : [...prev, ...data.data])
    setHasMore(data.data.length === data.perPage)
  }, [from, to, slug, router])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchPage(1, true).finally(() => setLoading(false))
  }, [fetchPage])

  async function handleLoadMore() {
    setLoadingMore(true)
    const next = page + 1
    await fetchPage(next, false)
    setPage(next)
    setLoadingMore(false)
  }

  function handleFilter(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setPage(1)
    fetchPage(1, true).finally(() => setLoading(false))
  }

  return (
    <div className="p-8 max-w-4xl">
      <Breadcrumb items={[{ label: 'Dashboard', href: `/i/${slug}/admin` }, { label: 'Audit Log' }]} />
      <h1 className="text-2xl font-bold text-slate-900 mb-1">Audit Log</h1>
      <p className="text-slate-500 text-sm mb-6">All configuration changes and admin actions for this insurer</p>

      <form onSubmit={handleFilter} className="flex items-end gap-3 mb-6">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Filter
        </button>
        {(from || to) && (
          <button
            type="button"
            onClick={() => { setFrom(''); setTo('') }}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
          >
            Clear
          </button>
        )}
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">No audit entries found</div>
        ) : (
          <>
            <div className="divide-y divide-slate-50">
              {rows.map((row) => (
                <div key={row.id} className="px-5 py-3.5 grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ActionBadge action={row.action} />
                      {row.entityType && (
                        <span className="text-xs text-slate-500">{row.entityType}{row.fieldChanged ? ` › ${row.fieldChanged}` : ''}</span>
                      )}
                    </div>
                    {(row.oldValue || row.newValue) && (
                      <p className="text-xs text-slate-400 mt-1 font-mono truncate">
                        {row.oldValue && <span className="line-through mr-1 text-red-400">{row.oldValue}</span>}
                        {row.newValue && <span className="text-emerald-600">{row.newValue}</span>}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">
                      {row.actorName ?? row.actorEmail ?? row.actorRole ?? 'System'}
                      {row.actorRole && <span className="ml-1 text-slate-400">({row.actorRole})</span>}
                      {row.ipAddress && <span className="ml-1 text-slate-300">· {row.ipAddress}</span>}
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 whitespace-nowrap pt-0.5">
                    {new Date(row.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                </div>
              ))}
            </div>
            {hasMore && (
              <div className="border-t border-slate-100 px-5 py-3 flex justify-center">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 disabled:opacity-50"
                >
                  {loadingMore ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronDown className="w-4 h-4" />}
                  Load more
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

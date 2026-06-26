'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Search,
  Filter,
  ArrowRight,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  Loader2,
} from 'lucide-react'
import UWShell from '@/components/underwriter/uw-shell'

const STATUS_TABS = [
  { value: 'uw_pending', label: 'Pending' },
  { value: 'uw_more_docs', label: 'More Docs' },
  { value: 'uw_approved', label: 'Approved' },
  { value: 'uw_rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
]

interface AppRow {
  id: string
  application_number: string
  customer_name: string
  age: number | null
  pan: string | null
  status: string
  stp_score: number | null
  plan_name: string
  sum_insured: number | null
  final_premium: number | null
  days_pending: number
  quick_flags: string[]
  created_at: string
  uw_decided_at: string | null
}

interface Pagination {
  page: number
  per_page: number
  total: number
  total_pages: number
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">—</span>
  const color = score >= 71 ? 'text-emerald-700 bg-emerald-100' : score >= 41 ? 'text-amber-700 bg-amber-100' : 'text-red-700 bg-red-100'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{score}</span>
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    uw_pending: 'bg-amber-100 text-amber-700',
    uw_approved: 'bg-emerald-100 text-emerald-700',
    uw_rejected: 'bg-red-100 text-red-700',
    uw_more_docs: 'bg-blue-100 text-blue-700',
  }
  const labels: Record<string, string> = {
    uw_pending: 'Pending',
    uw_approved: 'Approved',
    uw_rejected: 'Rejected',
    uw_more_docs: 'More Docs',
  }
  const cls = map[status] ?? 'bg-gray-100 text-gray-600'
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{labels[status] ?? status}</span>
}

export default function ApplicationsPage() {
  const [status, setStatus] = useState('uw_pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [apps, setApps] = useState<AppRow[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

  const fetchApps = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status, page: String(page) })
      if (search) params.set('search', search)
      const res = await fetch(`/api/underwriter/applications?${params}`)
      const data = await res.json() as { success: boolean; data: AppRow[]; pagination: Pagination }
      if (data.success) {
        setApps(data.data)
        setPagination(data.pagination)
      }
    } finally {
      setLoading(false)
    }
  }, [status, page, search])

  const fetchPending = useCallback(async () => {
    const res = await fetch('/api/underwriter/stats')
    const data = await res.json() as { success: boolean; stats: { pending_review: number } }
    if (data.success) setPendingCount(data.stats.pending_review)
  }, [])

  useEffect(() => {
    fetchPending()
  }, [fetchPending])

  useEffect(() => {
    const t = setTimeout(fetchApps, search ? 400 : 0)
    return () => clearTimeout(t)
  }, [fetchApps, search])

  function handleStatusChange(s: string) {
    setStatus(s)
    setPage(1)
  }

  return (
    <UWShell userName="Underwriter" userRole="underwriter" pendingCount={pendingCount}>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
            <p className="text-gray-500 text-sm mt-1">
              {pagination ? `${pagination.total.toLocaleString()} total applications` : 'Loading…'}
            </p>
          </div>
        </div>

        {/* Search + Filter bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by app number, name, or PAN…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-500 hover:text-gray-900 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-1 bg-gray-100 border border-gray-200 p-1 rounded-xl w-fit">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => handleStatusChange(tab.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                status === tab.value
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500">No applications found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Application', 'Applicant', 'Plan', 'Sum Insured', 'STP Score', 'Status', 'Days Pending', ''].map((h) => (
                      <th key={h} className="text-left px-5 py-3 text-gray-500 font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app, i) => (
                    <tr
                      key={app.id}
                      className={`hover:bg-gray-50 transition-colors ${i < apps.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <p className="font-mono text-teal-600 text-xs">{app.application_number}</p>
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {app.quick_flags.includes('has_ped') && (
                            <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">PED</span>
                          )}
                          {app.quick_flags.includes('smoker') && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Smoker</span>
                          )}
                          {app.quick_flags.includes('high_risk') && (
                            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">High Risk</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-gray-900 font-medium">{app.customer_name}</p>
                        {app.age && <p className="text-gray-400 text-xs">Age {app.age}</p>}
                      </td>
                      <td className="px-5 py-4 text-gray-700">{app.plan_name}</td>
                      <td className="px-5 py-4 text-gray-700 whitespace-nowrap">
                        {app.sum_insured ? `₹${(app.sum_insured / 100000).toFixed(0)}L` : '—'}
                      </td>
                      <td className="px-5 py-4">
                        <ScoreBadge score={app.stp_score} />
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={app.status} />
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-xs font-medium ${app.days_pending > 2 ? 'text-red-600' : 'text-gray-400'}`}>
                          {app.days_pending === 0 ? 'Today' : `${app.days_pending}d`}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/underwriter/applications/${app.id}`}
                          className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors whitespace-nowrap"
                        >
                          Review <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {(page - 1) * pagination.per_page + 1}–{Math.min(page * pagination.per_page, pagination.total)} of {pagination.total}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-4 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg">
                {page} / {pagination.total_pages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pagination.total_pages}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </UWShell>
  )
}

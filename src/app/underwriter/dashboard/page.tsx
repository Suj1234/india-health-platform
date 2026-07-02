import { redirect } from 'next/navigation'
import Link from 'next/link'
import { and, count, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, quotes, medicalQuestionnaires } from '@/lib/db/schema'
import { getStaffSession } from '@/lib/auth'
import UWShell from '@/components/underwriter/uw-shell'
import {
  Clock,
  CheckCircle2,
  XCircle,
  FileSearch,
  TrendingUp,
  Timer,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'

function StatCard({ icon, label, value, color, sub }: {
  icon: React.ReactNode; label: string; value: string | number; color: string; sub?: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-sm font-medium">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-gray-400 text-xs mt-1">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-xl bg-gray-100">
          <span className={color}>{icon}</span>
        </div>
      </div>
    </div>
  )
}

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return <span className="text-gray-400 text-xs">—</span>
  const color = score >= 71
    ? 'text-emerald-700 bg-emerald-100'
    : score >= 41
    ? 'text-amber-700 bg-amber-100'
    : 'text-red-700 bg-red-100'
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{score}</span>
}

export default async function UnderwriterDashboard() {
  const session = await getStaffSession()
  if (!session) redirect('/underwriter/login')

  const isSuperAdmin = session.role === 'superadmin'
  const insurerFilter = (isSuperAdmin || !session.insurer_id) ? undefined : eq(applications.insurerId, session.insurer_id)

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  const pendingWhere = insurerFilter
    ? and(insurerFilter, eq(applications.status, 'uw_pending'))
    : eq(applications.status, 'uw_pending')

  const approvedTodayWhere = insurerFilter
    ? and(
        insurerFilter,
        sql`uw_decision IN ('approved','approved_with_loading','approved_with_exclusion')`,
        gte(applications.uwDecidedAt, today),
        lte(applications.uwDecidedAt, tomorrow)
      )
    : and(
        sql`uw_decision IN ('approved','approved_with_loading','approved_with_exclusion')`,
        gte(applications.uwDecidedAt, today),
        lte(applications.uwDecidedAt, tomorrow)
      )

  const rejectedTodayWhere = insurerFilter
    ? and(insurerFilter, eq(applications.uwDecision, 'rejected'), gte(applications.uwDecidedAt, today), lte(applications.uwDecidedAt, tomorrow))
    : and(eq(applications.uwDecision, 'rejected'), gte(applications.uwDecidedAt, today), lte(applications.uwDecidedAt, tomorrow))

  const moreDocsWhere = insurerFilter
    ? and(insurerFilter, eq(applications.status, 'uw_more_docs'))
    : eq(applications.status, 'uw_more_docs')

  const monthlyWhere = insurerFilter
    ? and(insurerFilter, gte(applications.createdAt, monthStart))
    : gte(applications.createdAt, monthStart)

  const [
    [pendingResult],
    [approvedTodayResult],
    [rejectedTodayResult],
    [moreDocsResult],
    [monthlyResult],
    pendingApps,
  ] = await Promise.all([
    db.select({ count: count() }).from(applications).where(pendingWhere),
    db.select({ count: count() }).from(applications).where(approvedTodayWhere),
    db.select({ count: count() }).from(applications).where(rejectedTodayWhere),
    db.select({ count: count() }).from(applications).where(moreDocsWhere),
    db.select({ count: count() }).from(applications).where(monthlyWhere),
    db.select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      name: applications.name,
      dob: applications.dob,
      stpScore: applications.stpScore,
      status: applications.status,
      createdAt: applications.createdAt,
    })
    .from(applications)
    .where(pendingWhere)
    .orderBy(applications.createdAt)
    .limit(8),
  ])

  const appIds = pendingApps.map((a) => a.id)
  const quotesData = appIds.length
    ? await db
        .select({ applicationId: quotes.applicationId, planName: quotes.planName, sumInsured: quotes.sumInsured })
        .from(quotes)
        .where(
          and(
            eq(quotes.isSelected, true),
            sql`${quotes.applicationId} = ANY(${sql`ARRAY[${sql.join(appIds.map((id) => sql`${id}::uuid`), sql`, `)}]`})`
          )
        )
    : []
  const medData = appIds.length
    ? await db
        .select({ applicationId: medicalQuestionnaires.applicationId, isSmoker: medicalQuestionnaires.isSmoker, hasDiabetes: medicalQuestionnaires.hasDiabetes, hasHypertension: medicalQuestionnaires.hasHypertension })
        .from(medicalQuestionnaires)
        .where(
          sql`${medicalQuestionnaires.applicationId} = ANY(${sql`ARRAY[${sql.join(appIds.map((id) => sql`${id}::uuid`), sql`, `)}]`})`
        )
    : []

  const quoteMap = Object.fromEntries(quotesData.map((q) => [q.applicationId, q]))
  const medMap = Object.fromEntries(medData.map((m) => [m.applicationId, m]))

  const stats = {
    pending: pendingResult?.count ?? 0,
    approvedToday: approvedTodayResult?.count ?? 0,
    rejectedToday: rejectedTodayResult?.count ?? 0,
    moreDocs: moreDocsResult?.count ?? 0,
    monthly: monthlyResult?.count ?? 0,
  }

  return (
    <UWShell userName={session.name} userRole={session.role} pendingCount={stats.pending}>
      <div className="p-6 lg:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">
            Welcome back, {session.name.split(' ')[0]}. Here&apos;s what needs your attention.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard icon={<Clock className="w-5 h-5" />} label="Pending Review" value={stats.pending} color="text-amber-600" sub="Awaiting decision" />
          <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Approved Today" value={stats.approvedToday} color="text-emerald-600" />
          <StatCard icon={<XCircle className="w-5 h-5" />} label="Rejected Today" value={stats.rejectedToday} color="text-red-600" />
          <StatCard icon={<FileSearch className="w-5 h-5" />} label="Docs Requested" value={stats.moreDocs} color="text-blue-600" />
          <StatCard icon={<TrendingUp className="w-5 h-5" />} label="This Month" value={stats.monthly} color="text-violet-600" sub="Total applications" />
        </div>

        {/* Pending Queue */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pending Review Queue</h2>
            <Link href="/underwriter/applications" className="flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 transition-colors">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {pendingApps.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="text-gray-900 font-medium">Queue is clear!</p>
              <p className="text-gray-500 text-sm mt-1">No applications pending review.</p>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left px-5 py-3 text-gray-500 font-medium">Application</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium hidden sm:table-cell">Applicant</th>
                    <th className="text-left px-5 py-3 text-gray-500 font-medium hidden md:table-cell">Plan</th>
                    <th className="text-right px-5 py-3 text-gray-500 font-medium hidden lg:table-cell">Sum Insured</th>
                    <th className="text-center px-5 py-3 text-gray-500 font-medium">STP Score</th>
                    <th className="text-right px-5 py-3 text-gray-500 font-medium">Days</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {pendingApps.map((app, i) => {
                    const quote = quoteMap[app.id]
                    const med = medMap[app.id]
                    const dob = app.dob ? new Date(app.dob) : null
                    const age = dob ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25)) : null
                    const daysPending = Math.floor((Date.now() - (app.createdAt?.getTime() ?? Date.now())) / (1000 * 60 * 60 * 24))
                    const nameParts = (app.name ?? '').trim().split(' ')
                    const maskedName = nameParts.length > 1 ? `${nameParts[0]} ${nameParts[nameParts.length - 1]![0]}.` : (app.name ?? '')
                    const hasPed = med?.hasDiabetes || med?.hasHypertension
                    return (
                      <tr key={app.id} className={`hover:bg-gray-50 transition-colors ${i < pendingApps.length - 1 ? 'border-b border-gray-100' : ''}`}>
                        <td className="px-5 py-4">
                          <p className="font-mono text-teal-600 text-xs">{app.applicationNumber}</p>
                          <div className="flex gap-1 mt-1">
                            {hasPed && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">PED</span>}
                            {med?.isSmoker && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Smoker</span>}
                          </div>
                        </td>
                        <td className="px-5 py-4 hidden sm:table-cell">
                          <p className="text-gray-900 font-medium">{maskedName}</p>
                          {age && <p className="text-gray-400 text-xs">Age {age}</p>}
                        </td>
                        <td className="px-5 py-4 hidden md:table-cell text-gray-700">{quote?.planName ?? '—'}</td>
                        <td className="px-5 py-4 hidden lg:table-cell text-right text-gray-700">
                          {quote?.sumInsured ? `₹${(Number(quote.sumInsured) / 100000).toFixed(0)}L` : '—'}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <ScoreBadge score={app.stpScore ? Number(app.stpScore) : null} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className={`text-xs font-medium ${daysPending > 2 ? 'text-red-600' : 'text-gray-400'}`}>
                            {daysPending === 0 ? 'Today' : `${daysPending}d`}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link href={`/underwriter/applications/${app.id}`} className="inline-flex items-center gap-1 text-xs text-teal-600 hover:text-teal-700 font-medium transition-colors">
                            Review <ArrowRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {stats.pending > 5 && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-amber-800 font-medium text-sm">High volume alert</p>
              <p className="text-amber-700 text-xs mt-0.5">
                {stats.pending} applications are awaiting review. Applications pending more than 2 days may expire.
              </p>
            </div>
          </div>
        )}
      </div>
    </UWShell>
  )
}

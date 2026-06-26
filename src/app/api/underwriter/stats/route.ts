import { NextResponse } from 'next/server'
import { eq, and, gte, lte, sql, count, avg } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getStaffSession } from '@/lib/auth'

export async function GET() {
  try {
    const session = await getStaffSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const insurerId = session.insurer_id
    const isSuperAdmin = session.role === 'super_admin'

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    const baseFilter = (isSuperAdmin || !insurerId)
      ? undefined
      : eq(applications.insurerId, insurerId)

    const [pendingResult] = await db
      .select({ count: count() })
      .from(applications)
      .where(baseFilter ? and(baseFilter, eq(applications.status, 'uw_pending')) : eq(applications.status, 'uw_pending'))

    const [approvedTodayResult] = await db
      .select({ count: count() })
      .from(applications)
      .where(
        baseFilter
          ? and(
              baseFilter,
              sql`uw_decision IN ('approved','approved_with_loading','approved_with_exclusion')`,
              gte(applications.uwDecidedAt, today),
              lte(applications.uwDecidedAt, tomorrow)
            )
          : and(
              sql`uw_decision IN ('approved','approved_with_loading','approved_with_exclusion')`,
              gte(applications.uwDecidedAt, today),
              lte(applications.uwDecidedAt, tomorrow)
            )
      )

    const [rejectedTodayResult] = await db
      .select({ count: count() })
      .from(applications)
      .where(
        baseFilter
          ? and(
              baseFilter,
              eq(applications.uwDecision, 'rejected'),
              gte(applications.uwDecidedAt, today),
              lte(applications.uwDecidedAt, tomorrow)
            )
          : and(
              eq(applications.uwDecision, 'rejected'),
              gte(applications.uwDecidedAt, today),
              lte(applications.uwDecidedAt, tomorrow)
            )
      )

    const [moreDocsResult] = await db
      .select({ count: count() })
      .from(applications)
      .where(baseFilter ? and(baseFilter, eq(applications.status, 'uw_more_docs')) : eq(applications.status, 'uw_more_docs'))

    const [monthlyResult] = await db
      .select({ count: count() })
      .from(applications)
      .where(
        baseFilter
          ? and(baseFilter, gte(applications.createdAt, monthStart))
          : gte(applications.createdAt, monthStart)
      )

    const [avgDecisionResult] = await db
      .select({
        avgHours: avg(
          sql`EXTRACT(EPOCH FROM (uw_decided_at - created_at)) / 3600`
        ),
      })
      .from(applications)
      .where(
        baseFilter
          ? and(
              baseFilter,
              sql`uw_decided_at IS NOT NULL`,
              gte(applications.createdAt, monthStart)
            )
          : and(
              sql`uw_decided_at IS NOT NULL`,
              gte(applications.createdAt, monthStart)
            )
      )

    return NextResponse.json({
      success: true,
      stats: {
        pending_review: pendingResult?.count ?? 0,
        approved_today: approvedTodayResult?.count ?? 0,
        rejected_today: rejectedTodayResult?.count ?? 0,
        docs_requested: moreDocsResult?.count ?? 0,
        total_this_month: monthlyResult?.count ?? 0,
        avg_decision_hours: avgDecisionResult?.avgHours ? Number(avgDecisionResult.avgHours).toFixed(1) : null,
      },
    })
  } catch (err) {
    console.error('[underwriter/stats] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gte, lte, ilike, or, desc, count, sql } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, quotes, medicalQuestionnaires } from '@/lib/db/schema'
import { getStaffSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getStaffSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status') ?? 'uw_pending'
    const search = searchParams.get('search') ?? ''
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const perPage = 20

    const isSuperAdmin = session.role === 'superadmin'

    const conditions = []
    if (!isSuperAdmin && session.insurer_id) {
      conditions.push(eq(applications.insurerId, session.insurer_id))
    }
    if (status !== 'all') {
      conditions.push(eq(applications.status, status))
    }
    if (search) {
      conditions.push(
        or(
          ilike(applications.applicationNumber, `%${search}%`),
          ilike(applications.name, `%${search}%`),
          ilike(applications.pan, `%${search}%`)
        )
      )
    }
    if (dateFrom) {
      conditions.push(gte(applications.createdAt, new Date(dateFrom)))
    }
    if (dateTo) {
      const end = new Date(dateTo)
      end.setDate(end.getDate() + 1)
      conditions.push(lte(applications.createdAt, end))
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined

    const [totalResult] = await db
      .select({ count: count() })
      .from(applications)
      .where(where)

    const rows = await db
      .select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        name: applications.name,
        dob: applications.dob,
        pan: applications.pan,
        mobile: applications.mobile,
        status: applications.status,
        stpScore: applications.stpScore,
        stpDecision: applications.stpDecision,
        uwDecision: applications.uwDecision,
        uwDecidedAt: applications.uwDecidedAt,
        stpEvaluatedAt: applications.stpEvaluatedAt,
        createdAt: applications.createdAt,
        finalPremium: applications.finalPremium,
      })
      .from(applications)
      .where(where)
      .orderBy(desc(applications.createdAt))
      .limit(perPage)
      .offset((page - 1) * perPage)

    // Fetch selected quotes for sum insured + plan
    const appIds = rows.map((r) => r.id)
    const selectedQuotes = appIds.length
      ? await db
          .select({
            applicationId: quotes.applicationId,
            planName: quotes.planName,
            planType: quotes.planType,
            sumInsured: quotes.sumInsured,
          })
          .from(quotes)
          .where(
            and(
              eq(quotes.isSelected, true),
              sql`${quotes.applicationId} = ANY(${sql`ARRAY[${sql.join(appIds.map((id) => sql`${id}::uuid`), sql`, `)}]`})`
            )
          )
      : []

    // Fetch risk flags
    const medData = appIds.length
      ? await db
          .select({
            applicationId: medicalQuestionnaires.applicationId,
            riskFlags: medicalQuestionnaires.riskFlags,
            isSmoker: medicalQuestionnaires.isSmoker,
            hasDiabetes: medicalQuestionnaires.hasDiabetes,
            hasHypertension: medicalQuestionnaires.hasHypertension,
          })
          .from(medicalQuestionnaires)
          .where(
            sql`${medicalQuestionnaires.applicationId} = ANY(${sql`ARRAY[${sql.join(appIds.map((id) => sql`${id}::uuid`), sql`, `)}]`})`
          )
      : []

    const quoteMap = Object.fromEntries(selectedQuotes.map((q) => [q.applicationId, q]))
    const medMap = Object.fromEntries(medData.map((m) => [m.applicationId, m]))

    const list = rows.map((r) => {
      const quote = quoteMap[r.id]
      const med = medMap[r.id]
      const dob = r.dob ? new Date(r.dob) : null
      const age = dob
        ? Math.floor((Date.now() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        : null

      const now = Date.now()
      const createdMs = r.status === 'uw_pending' ? r.createdAt?.getTime() ?? now : now
      const daysPending = Math.floor((now - createdMs) / (1000 * 60 * 60 * 24))

      // Mask name to first name + initial
      const nameParts = (r.name ?? '').trim().split(' ')
      const maskedName =
        nameParts.length > 1
          ? `${nameParts[0]} ${nameParts[nameParts.length - 1]![0]}.`
          : (r.name ?? '')

      const quickFlags: string[] = []
      if (med?.isSmoker) quickFlags.push('smoker')
      if (med?.hasDiabetes || med?.hasHypertension) quickFlags.push('has_ped')
      if (Number(r.stpScore ?? 0) < 40) quickFlags.push('high_risk')

      return {
        id: r.id,
        application_number: r.applicationNumber,
        customer_name: maskedName,
        age,
        pan: r.pan,
        status: r.status,
        stp_score: r.stpScore ? Number(r.stpScore) : null,
        stp_decision: r.stpDecision,
        uw_decision: r.uwDecision,
        plan_name: quote?.planName ?? '—',
        plan_type: quote?.planType ?? '—',
        sum_insured: quote?.sumInsured ? Number(quote.sumInsured) : null,
        final_premium: r.finalPremium ? Number(r.finalPremium) : null,
        days_pending: daysPending,
        quick_flags: quickFlags,
        created_at: r.createdAt,
        uw_decided_at: r.uwDecidedAt,
      }
    })

    return NextResponse.json({
      success: true,
      data: list,
      pagination: {
        page,
        per_page: perPage,
        total: totalResult?.count ?? 0,
        total_pages: Math.ceil((totalResult?.count ?? 0) / perPage),
      },
    })
  } catch (err) {
    console.error('[underwriter/applications] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

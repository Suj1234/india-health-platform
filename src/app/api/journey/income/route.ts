import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI } from '@/lib/api-router'
import { mockPmwNeedsAnalysis } from '@/lib/mock/pmw.mock'
import type { IAdoreSummary, IncomeProfile, NeedsSummary } from '@/types/application'

const schema = z.object({
  customer_declared_income: z.number().int().min(100000).max(100000000),
  vehicle_reg_number: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 })
    }

    const { customer_declared_income } = parsed.data

    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    if (!['profiling_done', 'income_done'].includes(app.status)) {
      return NextResponse.json({ success: false, error: 'Invalid application status' }, { status: 409 })
    }

    const iadoreSummary = app.iadoreSummary as IAdoreSummary | null

    const income_profile: IncomeProfile = {
      sources: {
        customer_declared: customer_declared_income,
        bank_statement: iadoreSummary?.income_from_bank_statement ?? undefined,
        bureau: iadoreSummary?.income_from_bureau ?? undefined,
        vehicle_surrogate: iadoreSummary?.surrogate_income ?? undefined,
      },
      selected_source: 'customer_declared',
      selected_annual_income: customer_declared_income,
      cross_analysis: [
        {
          source: 'Bureau',
          amount: iadoreSummary?.income_from_bureau ?? 0,
          consistency: iadoreSummary?.income_from_bureau
            ? Math.abs(customer_declared_income - iadoreSummary.income_from_bureau) / customer_declared_income < 0.2
              ? 'consistent'
              : 'within_20'
            : 'not_available',
        },
        {
          source: 'Bank Statement',
          amount: iadoreSummary?.income_from_bank_statement ?? 0,
          consistency: iadoreSummary?.income_from_bank_statement
            ? Math.abs(customer_declared_income - iadoreSummary.income_from_bank_statement) / customer_declared_income < 0.2
              ? 'consistent'
              : 'within_20'
            : 'not_available',
        },
      ],
    }

    // Trigger PMW async
    const dob = app.dob ?? '1990-01-01'
    const age = Math.floor((Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    const city = iadoreSummary?.address.city?.toLowerCase() ?? ''
    const cityTier = ['mumbai', 'delhi', 'bangalore', 'bengaluru', 'chennai', 'hyderabad', 'kolkata', 'pune', 'ahmedabad'].includes(city) ? 1 : 2

    const needsSummary = await callExternalAPI<NeedsSummary>({
      insurerId: app.insurerId,
      apiName: 'pmw',
      realFn: async () =>
        mockPmwNeedsAnalysis({
          age,
          annualIncome: customer_declared_income,
          dependents: 0,
          existingCover: 0,
        }),
      mockFn: () =>
        mockPmwNeedsAnalysis({
          age,
          annualIncome: customer_declared_income,
          dependents: 0,
          existingCover: 0,
        }),
    })

    await db
      .update(applications)
      .set({
        customerDeclaredIncome: customer_declared_income,
        incomeProfile: income_profile as unknown as Record<string, unknown>,
        needsSummary: needsSummary as unknown as Record<string, unknown>,
        status: 'needs_done',
        currentStep: 5,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, session.application_id))

    return NextResponse.json({ success: true, income_profile, next_step: 5 })
  } catch (err) {
    console.error('[journey/income] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

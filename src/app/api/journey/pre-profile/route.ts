import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI } from '@/lib/api-router'
import { startConsolidatedProcess } from '@/lib/external/iadore'
import { mockConsolidatedPrefillResult } from '@/lib/mock/iadore.mock'
import type { IAdorePrefillData } from '@/lib/external/iadore'

type PreProfileResponse =
  | { success: true; status: 'running'; tx_id: string }
  | { success: true; status: 'done'; profile: IAdorePrefillData }
  | { success: false; error: string; code?: string }

// GET — called on Step 2 mount; mobile is resolved from session → application
export async function GET(_req: NextRequest): Promise<NextResponse<PreProfileResponse>> {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [application] = await db
      .select({ id: applications.id, mobile: applications.mobile, status: applications.status, insurerId: applications.insurerId })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    if (!['otp_verified', 'profiling_done', 'profiling_started'].includes(application.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid application state', code: 'INVALID_STATUS' },
        { status: 409 }
      )
    }

    const { mobile, insurerId } = application

    const result = await callExternalAPI<
      { status: 'running'; tx_id: string } | { status: 'done'; profile: IAdorePrefillData }
    >({
      insurerId,
      apiName: 'iadore_consolidated',
      realFn: async () => {
        const { txId } = await startConsolidatedProcess({ mobile })
        return { status: 'running' as const, tx_id: txId }
      },
      mockFn: () => ({
        status: 'done' as const,
        profile: mockConsolidatedPrefillResult(mobile),
      }),
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[pre-profile GET] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

const panSchema = z.object({
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
})

// POST — manual PAN fallback; runs same API with mobile + PAN
export async function POST(req: NextRequest): Promise<NextResponse<PreProfileResponse>> {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = panSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid PAN' },
        { status: 400 }
      )
    }
    const { pan } = parsed.data

    const [application] = await db
      .select({ id: applications.id, mobile: applications.mobile, status: applications.status, insurerId: applications.insurerId })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    const { mobile, insurerId } = application

    const result = await callExternalAPI<
      { status: 'running'; tx_id: string } | { status: 'done'; profile: IAdorePrefillData }
    >({
      insurerId,
      apiName: 'iadore_consolidated',
      realFn: async () => {
        const { txId } = await startConsolidatedProcess({ mobile, pan })
        return { status: 'running' as const, tx_id: txId }
      },
      mockFn: () => ({
        status: 'done' as const,
        profile: mockConsolidatedPrefillResult(mobile, pan),
      }),
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[pre-profile POST] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

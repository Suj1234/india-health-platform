import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI } from '@/lib/api-router'
import {
  pollConsolidatedProcessStatus,
  downloadAndParseConsolidatedReport,
} from '@/lib/external/iadore'
import { mockConsolidatedPrefillResult } from '@/lib/mock/iadore.mock'
import type { IAdorePrefillData } from '@/lib/external/iadore'

const querySchema = z.object({
  tx_id: z.string().min(1, 'tx_id is required'),
})

type StatusResponse =
  | { success: true; status: 'running' }
  | { success: true; status: 'done'; profile: IAdorePrefillData }
  | { success: true; status: 'failed' }
  | { success: false; error: string }

// GET /api/journey/pre-profile/status?tx_id=xxx
// Polled by the frontend every 3 s during the 'polling' content phase.
export async function GET(req: NextRequest): Promise<NextResponse<StatusResponse>> {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const parsed = querySchema.safeParse({ tx_id: searchParams.get('tx_id') })
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? 'Missing tx_id' },
        { status: 400 }
      )
    }
    const { tx_id } = parsed.data

    const [application] = await db
      .select({ id: applications.id, mobile: applications.mobile, insurerId: applications.insurerId })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    const { mobile, insurerId } = application

    const result = await callExternalAPI<
      { status: 'running' } | { status: 'done'; profile: IAdorePrefillData } | { status: 'failed' }
    >({
      insurerId,
      apiName: 'iadore_consolidated',
      realFn: async () => {
        const { status } = await pollConsolidatedProcessStatus(tx_id)

        if (status !== 'COMPLETED') {
          return { status: 'running' as const }
        }

        const profile = await downloadAndParseConsolidatedReport(tx_id)
        return { status: 'done' as const, profile }
      },
      mockFn: () => ({
        status: 'done' as const,
        profile: mockConsolidatedPrefillResult(mobile),
      }),
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    console.error('[pre-profile/status GET] Error:', err)
    return NextResponse.json({ success: true, status: 'failed' })
  }
}

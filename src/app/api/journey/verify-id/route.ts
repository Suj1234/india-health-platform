import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, idVerifications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI } from '@/lib/api-router'
import { mockKarzaPanVerification } from '@/lib/mock/karza.mock'

const schema = z.object({
  id_type: z.enum(['pan', 'voter_id', 'passport']),
  id_value: z.string().optional(),
  name: z.string().optional(),
  dob: z.string().optional(),
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

    const { id_type } = parsed.data
    const [app] = await db.select().from(applications).where(eq(applications.id, session.application_id)).limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    if (id_type === 'pan') {
      const pan = app.pan ?? ''
      const name = (app.proposalData as { name?: string } | null)?.name ?? app.name ?? ''
      const dob = app.dob ?? ''

      const result = await callExternalAPI({
        insurerId: app.insurerId,
        apiName: 'karza_tkyc',
        realFn: async () => mockKarzaPanVerification({ pan, name, dob }),
        mockFn: () => mockKarzaPanVerification({ pan, name, dob }),
      }) as import('@/lib/mock/karza.mock').KarzaTkycPanResponse

      const verificationStatus = result.result.status === 'VALID' ? 'verified' : 'failed'
      const matchScore = result.result.nameMatchScore ?? 0

      await db.insert(idVerifications).values({
        applicationId: session.application_id,
        idType: 'pan',
        idValue: pan,
        verificationStatus,
        matchScore: matchScore.toString(),
        verifiedName: result.result.name ?? name,
        verificationResponse: result as unknown as Record<string, unknown>,
      })

      if (verificationStatus === 'verified') {
        await db
          .update(applications)
          .set({ updatedAt: new Date() })
          .where(eq(applications.id, session.application_id))
      }

      return NextResponse.json({
        success: true,
        status: verificationStatus,
        match_score: matchScore,
        verified_name: result.result.name,
        message: verificationStatus === 'verified' ? 'PAN verified successfully' : 'PAN verification failed',
      })
    }

    return NextResponse.json({ success: false, error: 'Unsupported ID type' }, { status: 400 })
  } catch (err) {
    console.error('[journey/verify-id] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/journey/verify-id/complete handled below
export async function PUT(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    await db
      .update(applications)
      .set({ status: 'id_verified', currentStep: 10, updatedAt: new Date() })
      .where(eq(applications.id, session.application_id))

    return NextResponse.json({ success: true, next_step: 10 })
  } catch (err) {
    console.error('[verify-id/complete] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

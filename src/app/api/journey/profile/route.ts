import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI } from '@/lib/api-router'
import { mockIAdoreResponse, parseIAdoreResponse } from '@/lib/mock/iadore.mock'
import { randomUUID } from 'crypto'

const memberSchema = z.object({
  member_id: z.string().uuid(),
  relation: z.enum(['self', 'spouse', 'son', 'daughter', 'father', 'mother']),
  name: z.string().min(1),
  dob: z.string().min(1),
  gender: z.enum(['male', 'female', 'other']),
})

const schema = z.object({
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
  dob: z.string().min(1, 'DOB required'),
  gender: z.enum(['male', 'female', 'other']),
  email: z.string().email('Invalid email'),
  name: z.string().optional(),
  address_line: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  occupation_type: z.string().optional(),
  employer_name: z.string().optional(),
  hazardous_occupation: z.string().nullable().optional(),
  // New: cover type and insured members
  cover_type: z.enum(['individual', 'family_floater', 'parents']).default('individual'),
  members: z.array(memberSchema).default([]),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { pan, dob, gender, email, name, address_line, city, state, pincode, occupation_type, employer_name, cover_type, members } = parsed.data
    const applicationId = session.application_id

    // Get application
    const [application] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1)

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    if (!['otp_verified', 'profiling_started'].includes(application.status)) {
      return NextResponse.json(
        { success: false, error: 'Application is not in the correct state', code: 'INVALID_STATUS' },
        { status: 409 }
      )
    }

    const iadoreJobId = randomUUID()
    const proposerIsInsured = cover_type !== 'parents'

    // Update application with profile + cover type + members data
    await db
      .update(applications)
      .set({
        pan,
        dob,
        gender,
        email,
        name: name ?? null,
        coverType: cover_type,
        proposerIsInsured,
        membersData: members as unknown as Record<string, unknown>[],
        iadoreJobId,
        iadoreStatus: 'running',
        status: 'profiling_started',
        currentStep: 3,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId))

    // Trigger iAdore async (best-effort — UI polls for completion)
    triggerIAdore({
      applicationId,
      insurerId: application.insurerId,
      pan,
      mobile: application.mobile,
      email,
      name,
      jobId: iadoreJobId,
    }).catch((err) => console.error('[profile/route] iAdore trigger failed:', err))

    return NextResponse.json({ success: true, iadore_job_id: iadoreJobId, next_step: 3 })
  } catch (err) {
    console.error('[journey/profile] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

async function triggerIAdore({
  applicationId,
  insurerId,
  pan,
  mobile,
  email,
  name,
  jobId,
}: {
  applicationId: string
  insurerId: string
  pan: string
  mobile: string
  email: string
  name?: string
  jobId: string
}) {
  try {
    const result = await callExternalAPI<ReturnType<typeof mockIAdoreResponse>>({
      insurerId,
      apiName: 'iadore',
      realFn: async () => {
        return { status: 'COMPLETED', report: {} as never }
      },
      mockFn: () => mockIAdoreResponse({ pan, mobile }),
    })

    const summary = parseIAdoreResponse(result as ReturnType<typeof mockIAdoreResponse>, mobile)

    await db
      .update(applications)
      .set({
        iadoreReport: result as unknown as Record<string, unknown>,
        iadoreSummary: summary as unknown as Record<string, unknown>,
        iadoreStatus: 'done',
        status: 'members_added',
        currentStep: 3,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId))
  } catch (err) {
    console.error('[triggerIAdore] Failed:', err)
    await db
      .update(applications)
      .set({ iadoreStatus: 'failed', updatedAt: new Date() })
      .where(eq(applications.id, applicationId))
  }
}

// GET: poll iAdore status
export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [application] = await db
      .select({
        iadoreStatus: applications.iadoreStatus,
        iadoreSummary: applications.iadoreSummary,
        status: applications.status,
      })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!application) {
      return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })
    }

    if (application.iadoreStatus === 'done') {
      return NextResponse.json({
        success: true,
        status: 'done',
        summary: application.iadoreSummary,
      })
    }

    if (application.iadoreStatus === 'failed') {
      return NextResponse.json({ success: true, status: 'failed' })
    }

    return NextResponse.json({ success: true, status: 'running' })
  } catch (err) {
    console.error('[journey/profile GET] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

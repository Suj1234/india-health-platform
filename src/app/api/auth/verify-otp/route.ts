import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { verifyOtp, getOtpLog, markOtpUsed } from '@/lib/otp'
import { createCustomerToken, setCustomerCookie } from '@/lib/auth'
import { db } from '@/lib/db'
import { users, applications } from '@/lib/db/schema'
import { generateApplicationNumber } from '@/lib/utils'
import { getInsurerBySlug, callExternalAPI } from '@/lib/api-router'
import { verifyMobileOtpStatus, getMobileDetails } from '@/lib/external/karza'
import { mockKarzaMobileOtpStatus, mockKarzaMobileDetails } from '@/lib/mock/karza.mock'
import type { KarzaCredentials } from '@/types/insurer'

const schema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  otp: z.string().min(4).max(6).regex(/^\d{4,6}$/, 'OTP must be 4 or 6 digits'),
  otp_ref_id: z.string().uuid('Invalid OTP reference'),
  insurer_slug: z.string().min(1),
  initial_sum_insured: z.number().int().positive().optional(),
  initial_members: z.number().int().min(1).max(10).optional(),
  initial_plan_type: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      )
    }

    const { mobile, otp, otp_ref_id, insurer_slug, initial_sum_insured, initial_members, initial_plan_type } = parsed.data

    // Get insurer early — needed for both Karza callExternalAPI and application creation
    const insurer = await getInsurerBySlug(insurer_slug)
    if (!insurer) {
      return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })
    }

    // Look up OTP log to detect Karza vs internal path
    const otpLog = await getOtpLog(otp_ref_id)
    if (!otpLog) {
      return NextResponse.json({ success: false, error: 'OTP not found' }, { status: 400 })
    }

    let mobileEnrichment: Record<string, unknown> | null = null

    if (otpLog.karzaRequestId) {
      // ── Karza verification path ─────────────────────────────────────────────
      if (!otpLog.isValid) {
        return NextResponse.json({ success: false, error: 'OTP is no longer valid' }, { status: 400 })
      }
      if (otpLog.usedAt) {
        return NextResponse.json({ success: false, error: 'OTP already used' }, { status: 400 })
      }
      if (new Date() > otpLog.expiresAt) {
        return NextResponse.json({ success: false, error: 'OTP expired' }, { status: 400 })
      }

      const karzaCreds: KarzaCredentials = {
        base_url: process.env.KARZA_BASE_URL ?? 'https://testapi.karza.in',
        api_key: process.env.KARZA_API_KEY ?? '',
      }
      const karzaRequestId = otpLog.karzaRequestId

      const statusResult = await callExternalAPI({
        insurerId: insurer.id,
        apiName: 'karza_mobile_otp',
        realFn: () => verifyMobileOtpStatus(karzaCreds, { request_id: karzaRequestId, otp }),
        mockFn: () => mockKarzaMobileOtpStatus({ request_id: karzaRequestId, otp }),
      })

      // Log full response so we can inspect structure in Vercel function logs
      console.log('[verify-otp] Karza status raw response:', JSON.stringify(statusResult))

      // Karza docs show sim_details top-level, but /details puts it inside result —
      // check both locations defensively
      const resultObj = statusResult.result as Record<string, unknown> | undefined
      const simDetailsTopLevel = statusResult.sim_details
      const simDetailsInResult = resultObj?.sim_details as { otp_validated?: boolean } | undefined
      const otpValidated =
        simDetailsTopLevel?.otp_validated ?? simDetailsInResult?.otp_validated ?? false

      console.log('[verify-otp] otp_validated:', otpValidated, '| sim_details top-level:', simDetailsTopLevel, '| sim_details in result:', simDetailsInResult)

      if (!otpValidated) {
        return NextResponse.json({ success: false, error: 'Invalid OTP' }, { status: 400 })
      }

      await markOtpUsed(otp_ref_id)

      // Fetch enrichment — best-effort, never block on failure
      try {
        const detailsResult = await callExternalAPI({
          insurerId: insurer.id,
          apiName: 'karza_mobile_otp',
          realFn: () => getMobileDetails(karzaCreds, { request_id: karzaRequestId }),
          mockFn: () => mockKarzaMobileDetails({ request_id: karzaRequestId }),
        })
        if (detailsResult['status-code'] === '101') {
          mobileEnrichment = detailsResult.result as Record<string, unknown>
        }
      } catch (detailsErr) {
        console.error('[verify-otp] Karza /details failed (non-fatal):', detailsErr)
      }
    } else {
      // ── Internal hash verification path ────────────────────────────────────
      const result = await verifyOtp({ otpRefId: otp_ref_id, otp, mobile })
      if (!result.valid) {
        return NextResponse.json(
          { success: false, error: result.reason ?? 'Invalid OTP' },
          { status: 400 }
        )
      }
    }

    // Upsert customer user
    let customer = await db.query.users.findFirst({
      where: and(eq(users.mobile, mobile), eq(users.role, 'customer')),
    })

    if (!customer) {
      const [newUser] = await db
        .insert(users)
        .values({ mobile, role: 'customer' })
        .returning()
      customer = newUser!
    } else {
      await db
        .update(users)
        .set({ lastLoginAt: new Date(), updatedAt: new Date() })
        .where(eq(users.id, customer.id))
    }

    // Create application
    const applicationNumber = generateApplicationNumber()
    const [application] = await db
      .insert(applications)
      .values({
        applicationNumber,
        insurerId: insurer.id,
        customerId: customer.id,
        mobile,
        status: 'otp_verified',
        currentStep: 2,
        initialSumInsured: initial_sum_insured ?? null,
        initialMembers: initial_members ?? null,
        initialPlanType: initial_plan_type ?? null,
        mobileEnrichmentData: mobileEnrichment ?? undefined,
        ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null,
        userAgent: req.headers.get('user-agent') ?? null,
      })
      .returning()

    if (!application) {
      throw new Error('Failed to create application')
    }

    // Create customer JWT
    const token = await createCustomerToken({
      sub: customer.id,
      application_id: application.id,
      insurer_id: insurer.id,
      role: 'customer',
    })

    const cookieConfig = setCustomerCookie(token)
    const response = NextResponse.json({
      success: true,
      application_id: application.id,
      application_number: applicationNumber,
      next_step: 2,
    })

    response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig.options as Parameters<typeof response.cookies.set>[2])
    return response
  } catch (err) {
    console.error('[verify-otp] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

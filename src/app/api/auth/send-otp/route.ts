import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateOtp, storeOtp, checkRateLimit } from '@/lib/otp'
import { sendOtpSms } from '@/lib/brevo'
import { callExternalAPI, getInsurerBySlug } from '@/lib/api-router'
import { sendMobileOtp } from '@/lib/external/karza'
import { mockKarzaMobileOtpSend } from '@/lib/mock/karza.mock'
import type { KarzaCredentials } from '@/types/insurer'

const schema = z.object({
  mobile: z.string().regex(/^[6-9]\d{9}$/, 'Invalid mobile number'),
  insurer_slug: z.string().min(1),
  purpose: z.enum(['mobile_verification', 'payment_authorization']).default('mobile_verification'),
  application_id: z.string().uuid().optional(),
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

    const { mobile, insurer_slug, purpose, application_id } = parsed.data

    // Rate limit check
    const allowed = await checkRateLimit(mobile)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Please try again after 1 hour.' },
        { status: 429 }
      )
    }

    const exposeDebugOtp = process.env.APP_EXPOSE_TEST_OTP === 'true'

    // ── Karza Mobile OTP path (mobile_verification only) ─────────────────────
    if (purpose === 'mobile_verification') {
      const insurer = await getInsurerBySlug(insurer_slug)

      if (insurer) {
        const karzaCreds: KarzaCredentials = {
          base_url: process.env.KARZA_BASE_URL ?? 'https://testapi.karza.in',
          api_key: process.env.KARZA_API_KEY ?? '',
        }

        try {
          const karzaResult = await callExternalAPI({
            insurerId: insurer.id,
            apiName: 'karza_mobile_otp',
            realFn: () => sendMobileOtp(karzaCreds, { mobile }),
            mockFn: () => mockKarzaMobileOtpSend({ mobile }),
          })

          console.log('[send-otp] Karza /mobile/otp response:', JSON.stringify(karzaResult))

          if (karzaResult['status-code'] === '101' && karzaResult.request_id) {
            const otpRefId = await storeOtp({
              mobile,
              otp: '',
              purpose,
              applicationId: application_id,
              karzaRequestId: karzaResult.request_id,
            })

            return NextResponse.json({
              success: true,
              message: 'OTP sent',
              otp_ref_id: otpRefId,
              expires_in_seconds: 300,
              // No debug_otp for Karza path — Karza delivers the real OTP via SMS
            })
          }
        } catch (karzaErr) {
          console.error('[send-otp] Karza mobile OTP failed, falling back to internal:', karzaErr)
          // Fall through to internal OTP path below
        }
      }
    }

    // ── Internal OTP path (payment_authorization, or Karza fallback) ──────────
    const otp = generateOtp()
    const otpRefId = await storeOtp({ mobile, otp, purpose, applicationId: application_id })

    let smsSent = false
    try {
      smsSent = await sendOtpSms(mobile, otp, 'CareShield Insurance')
    } catch (smsErr) {
      console.error('[send-otp] SMS failed:', smsErr)
    }

    if (!smsSent && process.env.NODE_ENV !== 'production') {
      console.log(`[DEV OTP] ${mobile} → ${otp}`)
    }

    return NextResponse.json({
      success: true,
      message: 'OTP sent',
      otp_ref_id: otpRefId,
      expires_in_seconds: 600,
      ...(exposeDebugOtp ? { debug_otp: otp } : {}),
    })
  } catch (err) {
    console.error('[send-otp] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

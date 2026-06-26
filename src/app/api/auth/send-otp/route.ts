import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateOtp, storeOtp, checkRateLimit } from '@/lib/otp'
import { sendOtpSms, sendOtpEmail } from '@/lib/brevo'

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

    const { mobile, purpose, application_id } = parsed.data

    // Rate limit check
    const allowed = await checkRateLimit(mobile)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Please try again after 1 hour.' },
        { status: 429 }
      )
    }

    const otp = generateOtp()
    const otpRefId = await storeOtp({ mobile, otp, purpose, applicationId: application_id })

    // Send SMS; fall back to email if SMS fails (email not known here, handled by email caller)
    let smsSent = false
    try {
      smsSent = await sendOtpSms(mobile, otp, 'CareShield Insurance')
    } catch (smsErr) {
      console.error('[send-otp] SMS failed:', smsErr)
    }

    const exposeDebugOtp = process.env.APP_EXPOSE_TEST_OTP === 'true'

    if (!smsSent) {
      // In dev/test: log OTP to console so developer can test
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV OTP] ${mobile} → ${otp}`)
      }
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

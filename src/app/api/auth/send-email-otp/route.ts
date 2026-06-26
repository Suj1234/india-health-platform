import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { generateOtp, storeOtp, checkEmailRateLimit } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/brevo'
import { getCustomerSession } from '@/lib/auth'

const schema = z.object({
  email: z.string().email('Invalid email address'),
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

    const { email } = parsed.data

    const allowed = await checkEmailRateLimit(email)
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many OTP requests. Please try again after 1 hour.' },
        { status: 429 }
      )
    }

    const otp = generateOtp()
    const otpRefId = await storeOtp({
      email,
      otp,
      purpose: 'email_verification',
      applicationId: session.application_id,
    })

    let emailSent: string | null = null
    try {
      emailSent = await sendOtpEmail(email, otp, 'CareShield Insurance')
    } catch (err) {
      console.error('[send-email-otp] Email send failed:', err)
    }

    if (!emailSent && process.env.NODE_ENV !== 'production') {
      console.log(`[DEV EMAIL OTP] ${email} → ${otp}`)
    }

    const exposeDebugOtp =
      process.env.NODE_ENV !== 'production' && process.env.APP_EXPOSE_TEST_OTP === 'true'

    return NextResponse.json({
      success: true,
      message: 'OTP sent to your email',
      otp_ref_id: otpRefId,
      expires_in_seconds: 600,
      ...(exposeDebugOtp ? { debug_otp: otp } : {}),
    })
  } catch (err) {
    console.error('[send-email-otp] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

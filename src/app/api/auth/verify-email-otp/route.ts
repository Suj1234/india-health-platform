import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyOtp } from '@/lib/otp'
import { getCustomerSession } from '@/lib/auth'

const schema = z.object({
  email: z.string().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  otp_ref_id: z.string().uuid('Invalid OTP reference'),
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

    const { email, otp, otp_ref_id } = parsed.data

    const result = await verifyOtp({ otpRefId: otp_ref_id, otp, email })
    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.reason ?? 'Invalid OTP' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, message: 'Email verified' })
  } catch (err) {
    console.error('[verify-email-otp] Unexpected error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

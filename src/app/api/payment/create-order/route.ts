export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, payments } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { createRazorpayOrder } from '@/lib/razorpay'

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db.select().from(applications).where(eq(applications.id, session.application_id)).limit(1)
    if (!app) return NextResponse.json({ success: false, error: 'Not found' }, { status: 404 })

    if (!['stp_evaluated', 'uw_approved'].includes(app.status)) {
      return NextResponse.json({ success: false, error: 'Application not ready for payment' }, { status: 409 })
    }

    const finalPremium = Number(app.finalPremium ?? app.uwRevisedPremium ?? 0)
    if (!finalPremium) {
      return NextResponse.json({ success: false, error: 'Premium not calculated' }, { status: 400 })
    }

    const order = await createRazorpayOrder({
      amountInRupees: finalPremium,
      receiptId: app.applicationNumber,
      notes: {
        application_id: app.id,
        insurer_id: app.insurerId,
      },
    })

    const amountPaise = order.amountPaise

    // Store payment record
    const isTestMode = process.env.RAZORPAY_MODE !== 'live'
    const [payment] = await db
      .insert(payments)
      .values({
        applicationId: app.id,
        razorpayOrderId: order.orderId,
        amount: finalPremium.toString(),
        amountPaise,
        currency: 'INR',
        status: 'created',
        isTestMode,
      })
      .returning()

    await db
      .update(applications)
      .set({ paymentId: payment!.id, status: 'payment_pending', updatedAt: new Date() })
      .where(eq(applications.id, app.id))

    const razorpayKey = process.env.RAZORPAY_MODE === 'live'
      ? process.env.RAZORPAY_LIVE_KEY_ID!
      : process.env.RAZORPAY_TEST_KEY_ID!

    return NextResponse.json({
      success: true,
      order_id: order.orderId,
      amount: amountPaise,
      currency: 'INR',
      razorpay_key: razorpayKey,
      prefill: {
        name: app.name ?? '',
        email: app.email ?? '',
        contact: `91${app.mobile}`,
      },
    })
  } catch (err) {
    console.error('[payment/create-order] Error:', err)
    return NextResponse.json({ success: false, error: 'Failed to create payment order' }, { status: 500 })
  }
}

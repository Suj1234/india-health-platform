import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { payments, applications } from '@/lib/db/schema'
import { verifyRazorpayWebhookSignature } from '@/lib/razorpay'

// Must read raw body before any parsing — HMAC verification requires the exact bytes Razorpay sent
export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const signature = req.headers.get('x-razorpay-signature') ?? ''

  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook/razorpay] RAZORPAY_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    console.error('[webhook/razorpay] Signature mismatch — rejecting')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  type RazorpayEvent = {
    event: string
    payload: {
      payment?: {
        entity: {
          id: string
          order_id: string
          status: string
          amount: number
        }
      }
    }
  }

  let event: RazorpayEvent
  try {
    event = JSON.parse(rawBody) as RazorpayEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const paymentEntity = event.payload.payment?.entity

  if (event.event === 'payment.captured' && paymentEntity) {
    const [existing] = await db
      .select()
      .from(payments)
      .where(eq(payments.razorpayOrderId, paymentEntity.order_id))
      .limit(1)

    if (!existing) {
      console.warn('[webhook/razorpay] No payment record for order:', paymentEntity.order_id)
      return NextResponse.json({ ok: true })
    }

    // Already marked paid by client-side verify — idempotent, nothing to do
    if (existing.status === 'paid') {
      return NextResponse.json({ ok: true })
    }

    // Reconciliation: client-side verify must have failed — mark paid here
    await db
      .update(payments)
      .set({ razorpayPaymentId: paymentEntity.id, status: 'paid', updatedAt: new Date() })
      .where(eq(payments.razorpayOrderId, paymentEntity.order_id))

    await db
      .update(applications)
      .set({ status: 'payment_done', updatedAt: new Date() })
      .where(eq(applications.paymentId, existing.id))

    console.log('[webhook/razorpay] payment.captured reconciled:', paymentEntity.id)
  }

  if (event.event === 'payment.failed' && paymentEntity) {
    await db
      .update(payments)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(payments.razorpayOrderId, paymentEntity.order_id))

    console.log('[webhook/razorpay] payment.failed recorded:', paymentEntity.order_id)
  }

  return NextResponse.json({ ok: true })
}

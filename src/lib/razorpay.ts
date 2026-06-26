import Razorpay from 'razorpay'
import { createHmac } from 'crypto'
import { allowInsecureTlsIfEnabled } from './server-network'

allowInsecureTlsIfEnabled()

function getRazorpayInstance(): Razorpay {
  const isLive = process.env.RAZORPAY_MODE === 'live'
  return new Razorpay({
    key_id: isLive
      ? process.env.RAZORPAY_LIVE_KEY_ID!
      : process.env.RAZORPAY_TEST_KEY_ID!,
    key_secret: isLive
      ? process.env.RAZORPAY_LIVE_KEY_SECRET!
      : process.env.RAZORPAY_TEST_KEY_SECRET!,
  })
}

export function getRazorpayPublicKey(): string {
  return process.env.RAZORPAY_MODE === 'live'
    ? process.env.RAZORPAY_LIVE_KEY_ID!
    : process.env.RAZORPAY_TEST_KEY_ID!
}

export async function createRazorpayOrder({
  amountInRupees,
  receiptId,
  notes,
}: {
  amountInRupees: number
  receiptId: string
  notes: Record<string, string>
}): Promise<{ orderId: string; amountPaise: number }> {
  const rzp = getRazorpayInstance()
  const amountPaise = Math.round(amountInRupees * 100)

  const order = await rzp.orders.create({
    amount: amountPaise,
    currency: 'INR',
    receipt: receiptId,
    notes,
  })

  return { orderId: order.id, amountPaise }
}

export function verifyRazorpaySignature({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string
  paymentId: string
  signature: string
}): boolean {
  const secret = process.env.RAZORPAY_MODE === 'live'
    ? process.env.RAZORPAY_LIVE_KEY_SECRET!
    : process.env.RAZORPAY_TEST_KEY_SECRET!

  const expected = createHmac('sha256', secret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex')

  return expected === signature
}

export function verifyRazorpayWebhookSignature(body: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET!
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  return expected === signature
}

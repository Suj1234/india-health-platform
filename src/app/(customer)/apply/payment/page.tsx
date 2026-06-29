'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { Shield, CreditCard, Lock, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => {
      open(): void
      on(event: string, handler: (response: Record<string, unknown>) => void): void
    }
  }
}

export default function PaymentPage() {
  const router = useRouter()
  const [orderData, setOrderData] = useState<{
    order_id: string
    amount: number
    razorpay_key: string
    prefill: { name: string; email: string; contact: string }
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    document.head.appendChild(script)

    fetch('/api/payment/create-order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setOrderData(d)
        else setError(d.error ?? 'Failed to create order')
      })
      .catch(() => setError('Something went wrong'))
      .finally(() => setLoading(false))

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const handlePay = () => {
    if (!orderData || !window.Razorpay) {
      setError('Razorpay is not loaded. Please refresh.')
      return
    }
    setPaying(true)

    const rzp = new window.Razorpay({
      key: orderData.razorpay_key,
      amount: orderData.amount,
      currency: 'INR',
      order_id: orderData.order_id,
      name: 'CareShield Insurance',
      description: 'Health Insurance Premium',
      image: '/logo.png',
      prefill: orderData.prefill,
      theme: { color: '#0D5C63' },
      modal: {
        ondismiss: () => setPaying(false),
      },
      handler: async (response: {
        razorpay_payment_id: string
        razorpay_order_id: string
        razorpay_signature: string
      }) => {
        try {
          const res = await fetch('/api/payment/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            }),
          })
          const data = await res.json()
          if (data.success) {
            router.push('/policy')
          } else {
            setError(data.error ?? 'Payment verification failed')
            setPaying(false)
          }
        } catch {
          setError('Payment verification failed. Contact support.')
          setPaying(false)
        }
      },
    })

    rzp.open()
  }

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-100 mb-4">
            <CreditCard className="h-7 w-7 text-primary-700" strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Complete Payment</h1>
          <p className="text-muted-foreground text-sm">
            Secure payment via Razorpay. Your policy is issued instantly after payment.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden mb-6">
          <div className="bg-primary-900 px-5 py-4">
            <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Amount Due</p>
            <p className="text-3xl font-bold text-white">
              ₹{orderData ? (orderData.amount / 100).toLocaleString('en-IN') : '—'}
            </p>
            <p className="text-white/60 text-xs mt-0.5">Annual premium (incl. 18% GST)</p>
          </div>

          <div className="p-5 space-y-2.5">
            {[
              '✓ IRDAI-regulated payment — 100% secure',
              '✓ Policy PDF generated and emailed immediately',
              '✓ Coverage starts from today',
              '✓ Free-look period: 15 days from receipt',
            ].map((item) => (
              <p key={item} className="text-xs text-foreground">{item}</p>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button
          onClick={handlePay}
          disabled={!orderData || paying}
          loading={paying}
          size="xl"
          variant="accent"
          className="w-full font-bold shadow-xl shadow-accent-500/30 mb-3"
        >
          {paying ? 'Processing...' : `Pay ₹${orderData ? (orderData.amount / 100).toLocaleString('en-IN') : '...'} via Razorpay`}
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
          <Lock className="h-3.5 w-3.5" />
          <span>256-bit SSL · PCI DSS Compliant · Powered by Razorpay</span>
        </div>
      </motion.div>
    </div>
  )
}

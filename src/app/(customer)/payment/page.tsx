'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Script from 'next/script'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield, ArrowRight, CheckCircle2, CreditCard,
  Lock, Clock, RefreshCw, AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JourneyShell } from '@/components/customer/journey-shell'

// ─── Temporary plan display — replace with API fetch once quote data flows through ──

const PLAN_SUMMARY = {
  plan: 'Standard Care',
  sumInsured: '₹5 Lakh',
  riders: 'Critical Illness',
  policyTerm: '1 Year',
  basePremium: 4200,
  riderPremium: 1800,
  gst: 1080,
}

type PayPhase = 'summary' | 'processing' | 'success' | 'failed'

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentPage() {
  const router = useRouter()
  const [phase, setPhase] = useState<PayPhase>('summary')
  const [failureMessage, setFailureMessage] = useState<string | null>(null)

  const totalPremium = PLAN_SUMMARY.basePremium + PLAN_SUMMARY.riderPremium
  const total = totalPremium + PLAN_SUMMARY.gst

  const handlePay = async () => {
    setPhase('processing')
    setFailureMessage(null)
    try {
      // 1. Create order server-side — amount comes from app.finalPremium, not the display values
      const orderRes = await fetch('/api/payment/create-order', { method: 'POST' })
      const order = await orderRes.json() as {
        success: boolean; error?: string
        order_id: string; amount: number; currency: string
        razorpay_key: string; prefill: { name: string; email: string; contact: string }
      }
      if (!order.success) throw new Error(order.error ?? 'Order creation failed')

      // 2. Open Razorpay modal and wait for success or failure
      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: order.razorpay_key,
          amount: order.amount,
          currency: order.currency,
          order_id: order.order_id,
          name: 'CareShield Insurance',
          description: 'Health Insurance Premium',
          prefill: order.prefill,
          theme: { color: '#0D5C63' },
          modal: { ondismiss: () => reject(new Error('dismissed')) },
          handler: async (response: Record<string, unknown>) => {
            try {
              const verifyRes = await fetch('/api/payment/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              })
              const verify = await verifyRes.json() as { success: boolean; error?: string }
              if (!verify.success) reject(new Error(verify.error ?? 'Verification failed'))
              else resolve()
            } catch (err) {
              reject(err)
            }
          },
        })
        rzp.open()
      })

      setPhase('success')
      setTimeout(() => router.push('/policy'), 2200)
    } catch (err) {
      const msg = (err as Error).message
      if (msg === 'dismissed') {
        // User closed the modal — let them retry
        setPhase('summary')
      } else {
        setFailureMessage(msg)
        setPhase('failed')
      }
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Script id="razorpay-checkout-js" src="https://checkout.razorpay.com/v1/checkout.js" />

      {/* Sticky header — matches apply/layout.tsx */}
      <header className="sticky top-0 z-40 h-14 shrink-0 border-b border-border bg-white/95 backdrop-blur-xl">
        <div className="h-full flex items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-800 group-hover:bg-primary-900 transition-colors">
              <Shield className="h-[15px] w-[15px] text-white" />
            </div>
            <span className="text-sm font-bold text-foreground">CareShield</span>
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Lock className="h-3 w-3 text-emerald-500" />
            <span className="hidden sm:inline">256-bit SSL · IRDAI Approved</span>
            <span className="sm:hidden">Secured</span>
          </div>
        </div>
      </header>

      {/* flex-1 wrapper so JourneyShell fills remaining viewport height */}
      <div className="flex flex-col flex-1">
        <JourneyShell currentStep={8}>
          <AnimatePresence mode="wait">

            {/* ── Payment Summary ───────────────────────────────────────── */}
            {phase === 'summary' && (
              <motion.div
                key="summary"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.25 }}
              >
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  {/* Card header */}
                  <div className="px-8 pt-6 pb-5 border-b border-border">
                    <h1 className="text-xl font-bold text-foreground tracking-tight">Complete Your Payment</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Review the summary and pay to activate your policy
                    </p>
                  </div>

                  {/* Two-column body */}
                  <div className="grid grid-cols-2 divide-x divide-border">

                    {/* Left: Order summary */}
                    <div className="px-8 py-6 space-y-5">
                      <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Order Summary</p>

                      {/* Plan identity */}
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-800 shrink-0">
                          <Shield className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{PLAN_SUMMARY.plan}</p>
                          <p className="text-xs text-muted-foreground">
                            {PLAN_SUMMARY.sumInsured} · {PLAN_SUMMARY.policyTerm}
                          </p>
                        </div>
                      </div>

                      {/* Premium breakdown */}
                      <div className="border-t border-border/60 pt-4 space-y-2.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Base premium</span>
                          <span className="font-medium text-foreground">
                            ₹{PLAN_SUMMARY.basePremium.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Rider ({PLAN_SUMMARY.riders})</span>
                          <span className="font-medium text-foreground">
                            ₹{PLAN_SUMMARY.riderPremium.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">GST @ 18%</span>
                          <span className="font-medium text-foreground">
                            ₹{PLAN_SUMMARY.gst.toLocaleString('en-IN')}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-border">
                          <span className="text-sm font-bold text-foreground">Total payable</span>
                          <span className="text-xl font-bold text-primary-800">
                            ₹{total.toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Payment action */}
                    <div className="px-8 py-6 flex flex-col justify-between gap-5">
                      <div className="space-y-4">
                        <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Payment</p>

                        {/* Validity notice */}
                        <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                          <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                          <p className="text-xs text-amber-700">
                            <strong>Offer expires in 24 hours.</strong> Policy starts on the date of payment.
                          </p>
                        </div>

                      </div>

                      <div className="space-y-3">
                        <Button
                          size="lg"
                          className="w-full"
                          rightIcon={<CreditCard className="h-4 w-4" />}
                          onClick={handlePay}
                        >
                          Pay ₹{total.toLocaleString('en-IN')}
                        </Button>
                        <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                          <Lock className="h-3 w-3 text-emerald-500" />
                          <span>Secured by Razorpay · 256-bit SSL encryption</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Processing ────────────────────────────────────────────── */}
            {phase === 'processing' && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="px-8 pt-6 pb-5 border-b border-border">
                    <h1 className="text-xl font-bold text-foreground tracking-tight">Processing Payment…</h1>
                    <p className="text-sm text-muted-foreground mt-1">Please wait, do not close this window</p>
                  </div>
                  <div className="px-8 py-16 text-center">
                    <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 mb-5">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                      >
                        <RefreshCw className="h-8 w-8 text-primary-700" />
                      </motion.div>
                    </div>
                    <p className="text-sm text-muted-foreground">Verifying your transaction securely…</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Success ───────────────────────────────────────────────── */}
            {phase === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 20 }}
              >
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="px-8 pt-6 pb-5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.1 }}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 shrink-0"
                      >
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
                      </motion.div>
                      <div>
                        <h1 className="text-xl font-bold text-foreground tracking-tight">Payment Successful!</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          ₹{total.toLocaleString('en-IN')} paid · Generating your policy document…
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-8 py-10 text-center">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </motion.div>
                      <span>Redirecting to your policy…</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Failed ────────────────────────────────────────────────── */}
            {phase === 'failed' && (
              <motion.div
                key="failed"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
              >
                <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div className="px-8 pt-6 pb-5 border-b border-border">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-100 shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-foreground tracking-tight">Payment Failed</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {failureMessage ?? 'Something went wrong. Your account has not been charged.'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="px-8 py-6">
                    <Button
                      size="lg"
                      className="w-full"
                      rightIcon={<ArrowRight className="h-4 w-4" />}
                      onClick={() => { setPhase('summary'); setFailureMessage(null) }}
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </JourneyShell>
      </div>
    </div>
  )
}

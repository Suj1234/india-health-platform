'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, Clock, ArrowRight, Shield,
  Mail, CreditCard, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ProgressSteps } from '@/components/ui/progress-steps'
import { cn } from '@/lib/utils'
import { JourneyShell } from '@/components/customer/journey-shell'

// ─── Config ───────────────────────────────────────────────────────────────────

const JOURNEY_STEPS = [
  { number: 1, label: 'Mobile',    shortLabel: 'Mobile' },
  { number: 2, label: 'Identity',  shortLabel: 'Identity' },
  { number: 3, label: 'Health',    shortLabel: 'Health' },
  { number: 4, label: 'Plan',      shortLabel: 'Plan' },
  { number: 5, label: 'Proposal',  shortLabel: 'Proposal' },
  { number: 6, label: 'Documents', shortLabel: 'Docs' },
  { number: 7, label: 'Policy',    shortLabel: 'Policy' },
]

type STPDecision = 'approved' | 'referred'
type Phase = 'evaluating' | 'result'

// ─── Component ────────────────────────────────────────────────────────────────

export function ApplyStep7() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('evaluating')
  const [decision, setDecision] = useState<STPDecision>('approved')
  const [progress, setProgress] = useState(0)
  const [stpScore, setStpScore] = useState<number | null>(null)

  useEffect(() => {
    let animTimer: ReturnType<typeof setInterval>
    let p = 0

    const runStp = async () => {
      animTimer = setInterval(() => {
        p = Math.min(p + 2, 90)
        setProgress(p)
      }, 80)

      try {
        const res = await fetch('/api/journey/stp', { method: 'POST' })
        const data = await res.json()
        clearInterval(animTimer)
        setProgress(100)
        setDecision(data.decision === 'referred' ? 'referred' : 'approved')
        if (typeof data.stp_score === 'number') setStpScore(data.stp_score)
        setTimeout(() => setPhase('result'), 600)
      } catch {
        clearInterval(animTimer)
        setProgress(100)
        setDecision('approved')
        setTimeout(() => setPhase('result'), 600)
      }
    }

    runStp()
    return () => clearInterval(animTimer)
  }, [])

  const handleProceedToPayment = () => {
    router.push('/payment')
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <JourneyShell currentStep={7}>
      <AnimatePresence mode="wait">

        {/* ── Evaluating ──────────────────────────────────────────────────── */}
        {phase === 'evaluating' && (
          <motion.div
            key="evaluating"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Evaluating Your Application</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  Our system is reviewing your profile and health data
                </p>
              </div>
              <div className="px-8 py-12 text-center">
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 mb-5">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                  >
                    <Shield className="h-8 w-8 text-primary-700" strokeWidth={1.5} />
                  </motion.div>
                </div>

                <div className="mx-auto max-w-xs bg-border/40 rounded-full h-1.5 overflow-hidden mb-3">
                  <motion.div
                    className="h-full bg-primary-800 rounded-full"
                    style={{ width: `${progress}%` }}
                    transition={{ duration: 0.09 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mb-8">{progress}%</p>

                <div className="space-y-3 max-w-xs mx-auto">
                  {[
                    { label: 'Identity verification', done: progress > 20 },
                    { label: 'Health risk assessment', done: progress > 55 },
                    { label: 'STP eligibility check', done: progress > 85 },
                  ].map(({ label, done }) => (
                    <div key={label} className="flex items-center gap-3 justify-center">
                      <div className={cn(
                        'h-4 w-4 rounded-full flex items-center justify-center transition-all duration-500',
                        done ? 'bg-emerald-500' : 'bg-border'
                      )}>
                        {done && (
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                            <CheckCircle2 className="h-4 w-4 text-white" strokeWidth={2.5} />
                          </motion.div>
                        )}
                      </div>
                      <span className={cn(
                        'text-sm transition-colors duration-300',
                        done ? 'text-foreground font-medium' : 'text-muted-foreground'
                      )}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── STP Approved ────────────────────────────────────────────────── */}
        {phase === 'result' && decision === 'approved' && (
          <motion.div
            key="approved"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 shrink-0"
                  >
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
                  </motion.div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight">You&apos;re Approved!</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Your application has been instantly approved
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 divide-x divide-border">
                <div className="px-8 py-6">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Your Plan</p>
                  <div className="space-y-4">
                    <div>
                      <p className="text-base font-bold text-foreground">Standard Care · ₹5 L</p>
                      <p className="text-xl font-bold text-primary-800 mt-1">
                        ₹4,200
                        <span className="text-sm font-normal text-muted-foreground"> / year</span>
                      </p>
                    </div>
                    <div className="border-t border-border/60 pt-4 space-y-3">
                      {[
                        { icon: Shield, label: 'Cover', value: '₹5 Lakh' },
                        { icon: FileText, label: 'Policy Term', value: '1 Year' },
                        { icon: Clock, label: 'Valid from', value: 'On payment' },
                      ].map(({ icon: Icon, label, value }) => (
                        <div key={label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{label}</span>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-8 py-6 flex flex-col justify-between gap-6">
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Next Step</p>
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-start gap-3">
                      <Clock className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-emerald-800">Payment window: 24 hours</p>
                        <p className="text-xs text-emerald-700 mt-0.5">
                          Complete payment before the offer expires
                        </p>
                      </div>
                    </div>
                    {stpScore !== null && (
                      <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">Risk Score</span>
                        <span className={cn(
                          'text-sm font-bold',
                          stpScore >= 75 ? 'text-emerald-600' : stpScore >= 60 ? 'text-amber-600' : 'text-red-600',
                        )}>
                          {stpScore} / 100
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="lg"
                    className="w-full"
                    rightIcon={<CreditCard className="h-4 w-4" />}
                    onClick={handleProceedToPayment}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Under Review (Non-STP) ──────────────────────────────────────── */}
        {phase === 'result' && decision === 'referred' && (
          <motion.div
            key="referred"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 shrink-0">
                    <Clock className="h-5 w-5 text-amber-600" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-foreground tracking-tight">Application Under Review</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Sent to our underwriting team for a detailed review
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-8 py-6 space-y-5">
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <ProgressSteps
                    steps={JOURNEY_STEPS}
                    currentStep={6}
                    lockedFrom={7}
                  />
                  <p className="text-xs text-amber-600 text-center mt-3 font-medium">
                    Step 7 (Policy) unlocks after underwriter approval
                  </p>
                </div>

                <div className="space-y-3">
                  {stpScore !== null && (
                    <div className="rounded-xl border border-border bg-slate-50 px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-medium">Risk Score</span>
                      <span className={cn(
                        'text-sm font-bold',
                        stpScore >= 75 ? 'text-emerald-600' : stpScore >= 60 ? 'text-amber-600' : 'text-red-600',
                      )}>
                        {stpScore} / 100
                      </span>
                    </div>
                  )}
                  {[
                    {
                      icon: Mail,
                      title: 'Decision in 2–5 business days',
                      desc: 'You will receive an email with the underwriter\'s decision',
                    },
                    {
                      icon: Clock,
                      title: '7 days to complete payment',
                      desc: 'Once approved, you have 7 days to pay and activate your policy',
                    },
                    {
                      icon: Shield,
                      title: 'Application ID saved',
                      desc: 'Use your application link in the email to resume exactly where you left off',
                    },
                  ].map(({ icon: Icon, title, desc }) => (
                    <div key={title} className="flex items-start gap-3 rounded-xl border border-border bg-slate-50 p-4">
                      <div className="flex h-8 w-8 shrink-0 rounded-lg bg-white border border-border items-center justify-center">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => router.push('/')}
                >
                  Continue
                </Button>
              </div>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </JourneyShell>
  )
}

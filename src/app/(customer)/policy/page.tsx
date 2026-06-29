'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  Shield, Download, CheckCircle2, Mail, Calendar,
  FileText, Lock, Copy, Check, Phone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { JourneyShell } from '@/components/customer/journey-shell'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface PolicyData {
  policy_number: string
  plan_name: string
  sum_insured: number
  total_premium_paid: number
  policy_start_date: string
  policy_end_date: string
  insured_name: string
  nominee_name: string
  email: string
  policy_document_url: string | null
  free_look_period_expires: string
}

const MOCK_POLICY: PolicyData = {
  policy_number: 'CSH-2026-0042891',
  plan_name: 'Standard Care',
  sum_insured: 500000,
  total_premium_paid: 7080,
  policy_start_date: '25 Jun 2026',
  policy_end_date: '24 Jun 2027',
  insured_name: 'Rahul Sharma',
  nominee_name: 'Priya Sharma (Spouse)',
  email: '',
  policy_document_url: null,
  free_look_period_expires: '10 Jul 2026',
}

function formatInr(val: number) {
  if (val >= 100000) return `₹${(val / 100000).toFixed(0)} Lakh`
  return `₹${val.toLocaleString('en-IN')}`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PolicyPage() {
  const [policy, setPolicy] = useState<PolicyData>(MOCK_POLICY)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    fetch('/api/policy')
      .then((r) => r.json())
      .then((d) => { if (d.success && d.policy) setPolicy(d.policy) })
      .catch(() => {})
  }, [])

  const copyPolicyNumber = () => {
    navigator.clipboard.writeText(policy.policy_number).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Sticky header */}
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

      {/* flex-1 wrapper so JourneyShell fills remaining viewport */}
      <div className="flex flex-col flex-1">
        {/* step 9 = unmapped → journey-shell shows all 6 phases as complete */}
        <JourneyShell currentStep={9}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="bg-white rounded-2xl border border-border shadow-sm overflow-hidden">

              {/* Card header */}
              <div className="px-8 pt-6 pb-5 border-b border-border">
                <div className="flex items-start justify-between gap-6">

                  {/* Left: title */}
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 240, damping: 18, delay: 0.1 }}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 shrink-0"
                    >
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={2} />
                    </motion.div>
                    <div>
                      <h1 className="text-xl font-bold text-foreground tracking-tight">Policy Issued!</h1>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        Your health insurance is now active. A copy has been sent to your registered email.
                      </p>
                    </div>
                  </div>

                  {/* Right: policy number chip */}
                  <div className="flex items-center gap-3 bg-primary-50 border border-primary-200 rounded-xl px-4 py-2.5 shrink-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-800">
                      <Shield className="h-[16px] w-[16px] text-white" />
                    </div>
                    <div>
                      <p className="text-[10px] text-primary-600 font-medium uppercase tracking-wider">Policy Number</p>
                      <p className="text-sm font-bold font-mono text-primary-900 tracking-wider">
                        {policy.policy_number}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={copyPolicyNumber}
                      className="ml-1 p-1.5 rounded-lg hover:bg-primary-100 transition-colors text-primary-600"
                      title="Copy policy number"
                    >
                      {copied
                        ? <Check className="h-4 w-4 text-emerald-600" strokeWidth={2.5} />
                        : <Copy className="h-4 w-4" />
                      }
                    </button>
                  </div>
                </div>
              </div>

              {/* Two-column body */}
              <div className="grid grid-cols-2 divide-x divide-border">

                {/* Left: Policy details */}
                <div className="px-8 py-6">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400 mb-4">Policy Details</p>

                  {/* Plan identity card */}
                  <div className="rounded-xl overflow-hidden border border-border mb-4">
                    <div className="bg-primary-800 px-5 py-4 flex items-center justify-between">
                      <div>
                        <p className="text-xs text-primary-200 font-medium">{policy.insured_name}</p>
                        <p className="text-sm font-bold text-white mt-0.5">{policy.plan_name}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-primary-200">Sum Insured</p>
                        <p className="text-base font-bold text-white mt-0.5">{formatInr(policy.sum_insured)}</p>
                      </div>
                    </div>
                    <div className="bg-emerald-50 border-t border-emerald-100 px-5 py-2 flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <p className="text-xs font-semibold text-emerald-700">
                        Active · {policy.policy_start_date} – {policy.policy_end_date}
                      </p>
                    </div>
                  </div>

                  {/* Detail rows */}
                  <div>
                    {[
                      { icon: FileText, label: 'Plan', value: policy.plan_name },
                      { icon: Shield, label: 'Nominee', value: policy.nominee_name },
                      { icon: Calendar, label: 'Coverage Period', value: `${policy.policy_start_date} – ${policy.policy_end_date}` },
                      { icon: Calendar, label: 'Free-look expires', value: policy.free_look_period_expires },
                      { icon: FileText, label: 'Premium Paid', value: `₹${policy.total_premium_paid.toLocaleString('en-IN')} (incl. GST)` },
                    ].map(({ icon: Icon, label, value }, i, arr) => (
                      <div
                        key={label}
                        className={cn(
                          'flex items-start gap-3 py-3',
                          i < arr.length - 1 && 'border-b border-border/60'
                        )}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="px-8 py-6 flex flex-col gap-5">
                  <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">What&apos;s Next</p>

                  {/* Free-look notice */}
                  <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                    <p className="text-xs text-amber-700">
                      <strong>Free-look period:</strong> Not satisfied? Return within{' '}
                      <strong>15 days</strong> for a full refund (before {policy.free_look_period_expires}).
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 flex-1 justify-end">
                    {/* Download PDF */}
                    {policy.policy_document_url ? (
                      <a href={policy.policy_document_url} target="_blank" rel="noopener noreferrer" className="block">
                        <Button size="lg" className="w-full" leftIcon={<Download className="h-4 w-4" />}>
                          Download Policy PDF
                        </Button>
                      </a>
                    ) : (
                      <Button size="lg" className="w-full" leftIcon={<Download className="h-4 w-4" />} disabled>
                        Policy PDF — sending to email
                      </Button>
                    )}

                    {/* Email + Claims */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 border border-border px-3 py-2.5">
                        <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">PDF sent to</p>
                          <p className="text-xs font-medium text-foreground truncate max-w-[120px]">
                            {policy.email || 'your email'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 rounded-xl bg-muted/50 border border-border px-3 py-2.5">
                        <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div>
                          <p className="text-[10px] text-muted-foreground">24/7 Claims</p>
                          <p className="text-xs font-medium text-foreground">1800-123-4567</p>
                        </div>
                      </div>
                    </div>

                    {/* IRDAI disclosure */}
                    <p className="text-center text-[10px] text-muted-foreground/60 leading-relaxed">
                      Insurance is the subject matter of solicitation · IRDAI Reg. No. 142 · CareShield Insurance Ltd.
                      <br />
                      Free-look: 15 days from receipt of policy document.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </JourneyShell>
      </div>
    </div>
  )
}

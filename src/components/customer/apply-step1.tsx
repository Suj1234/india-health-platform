'use client'

import { useState, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shield,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  HelpCircle,
  Lock,
  BadgeCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { TnCModal } from '@/components/ui/tnc-modal'
import { NeedHelpModal } from '@/components/ui/need-help-modal'

type Phase = 'entry' | 'verified'

export function ApplyStep1() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [phase, setPhase] = useState<Phase>('entry')
  const [mobile, setMobile] = useState('')
  const [mobileError, setMobileError] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)

  const [tncOpen, setTncOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  // OTP modal
  const [otpOpen, setOtpOpen] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpRefId, setOtpRefId] = useState('')
  const [otpError, setOtpError] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [otpSuccess, setOtpSuccess] = useState(false)
  const [debugOtp, setDebugOtp] = useState('')

  const resendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const validateMobile = (val: string) => /^[6-9]\d{9}$/.test(val)

  const startResendTimer = () => {
    setResendCooldown(30)
    resendTimerRef.current = setInterval(() => {
      setResendCooldown((c) => {
        if (c <= 1) {
          clearInterval(resendTimerRef.current!)
          return 0
        }
        return c - 1
      })
    }, 1000)
  }

  const handleSendOtp = useCallback(async () => {
    if (!validateMobile(mobile)) {
      setMobileError('Enter a valid 10-digit Indian mobile number')
      return
    }
    if (!consent) {
      setMobileError('Please accept the Terms & Conditions to continue')
      return
    }
    setMobileError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile, insurer_slug: 'careshield-india' }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? 'Failed to send OTP')
      setOtpRefId(data.otp_ref_id)
      setDebugOtp(data.debug_otp ?? '')
      setOtp('')
      setOtpError('')
      setOtpSuccess(false)
      setOtpOpen(true)
      startResendTimer()
    } catch (err) {
      setMobileError(err instanceof Error ? err.message : 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }, [mobile, consent])

  const handleVerifyOtp = useCallback(
    async (otpValue: string) => {
      if (otpValue.length < 4) return
      setOtpError('')
      setOtpLoading(true)
      try {
        const res = await fetch('/api/auth/verify-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mobile,
            otp: otpValue,
            otp_ref_id: otpRefId,
            insurer_slug: 'careshield-india',
            initial_sum_insured: searchParams.get('sum_insured')
              ? Number(searchParams.get('sum_insured'))
              : undefined,
            initial_members: searchParams.get('members')
              ? Number(searchParams.get('members'))
              : undefined,
            initial_plan_type: searchParams.get('plan_type') ?? undefined,
          }),
        })
        const data = await res.json()
        if (!data.success) throw new Error(data.error ?? 'Invalid OTP')
        setOtpSuccess(true)
        setTimeout(() => {
          setOtpOpen(false)
          setPhase('verified')
          setTimeout(() => router.push('/apply/2'), 800)
        }, 1000)
      } catch (err) {
        setOtpError(err instanceof Error ? err.message : 'Invalid OTP. Please try again.')
      } finally {
        setOtpLoading(false)
      }
    },
    [mobile, otpRefId, searchParams, router]
  )

  const handleResend = useCallback(async () => {
    if (resendCooldown > 0) return
    setOtp('')
    setOtpError('')
    await handleSendOtp()
  }, [resendCooldown, handleSendOtp])

  const formattedMobile =
    mobile.length === 10
      ? `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`
      : `+91 ${mobile}`

  return (
    <>
      {/* ── Two-column shell ─────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left brand panel (lg+) ─────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col w-[58%] relative overflow-hidden">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-800 to-primary-900" />
          {/* Decorative elements */}
          <div className="absolute -bottom-32 -right-32 h-[480px] w-[480px] rounded-full bg-white/[0.04]" />
          <div className="absolute top-[-80px] left-[-80px] h-[360px] w-[360px] rounded-full bg-white/[0.04]" />
          <div className="absolute bottom-[20%] left-[10%] h-[200px] w-[200px] rounded-full bg-primary-600/20" />

          {/* Content — three zones: top logo / middle hero / bottom trust */}
          <div className="relative flex flex-col h-full px-12 xl:px-16 py-10">

            {/* Top: logo */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm">
                <Shield className="h-5 w-5 text-white" strokeWidth={2} />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">CareShield</span>
            </div>

            {/* Middle: hero content — vertically centered */}
            <div className="flex-1 flex flex-col justify-center py-10">
              <div>
                <span className="inline-block text-xs font-semibold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-3 py-1 mb-6 tracking-wide uppercase">
                  IRDAI Regulated · Reg. No. 142
                </span>

                <h1 className="text-4xl xl:text-[3.25rem] 2xl:text-6xl font-bold text-white leading-[1.1] mb-5 tracking-tight">
                  Health insurance for every Indian family.
                </h1>

                <p className="text-primary-200 text-[15px] leading-relaxed mb-10">
                  Digital. Paperless. Get covered in under 10 minutes — no agent, no paperwork.
                </p>

                <div className="space-y-4">
                  {[
                    { icon: '🏥', text: 'Cashless at 5,000+ network hospitals' },
                    { icon: '⚡', text: 'Instant policy — no medical tests required' },
                    { icon: '🛡', text: 'Pre-existing diseases covered after 36 months' },
                  ].map(({ icon, text }) => (
                    <div key={text} className="flex items-center gap-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/10 text-base">
                        {icon}
                      </div>
                      <span className="text-[14px] text-primary-100 leading-snug">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom: trust + help */}
            <div className="flex items-center justify-between pt-6 border-t border-white/10">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-1.5 text-xs text-primary-300">
                  <Lock className="h-3 w-3" />
                  256-bit SSL
                </div>
                <div className="flex items-center gap-1.5 text-xs text-primary-300">
                  <BadgeCheck className="h-3 w-3" />
                  DPDP Act Compliant
                </div>
              </div>
              <button
                onClick={() => setHelpOpen(true)}
                className="flex items-center gap-1.5 text-xs text-primary-300 hover:text-white transition-colors font-medium"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Need help?
              </button>
            </div>
          </div>
        </div>

        {/* ── Right form area ────────────────────────────────────────────── */}
        <div className="flex flex-1 flex-col items-center justify-center bg-white px-5 sm:px-10 lg:px-12 py-10">
          <AnimatePresence mode="wait">
            {phase === 'entry' && (
              <motion.div
                key="entry"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="w-full max-w-[360px]"
              >
                {/* Mobile-only: logo + app name */}
                <div className="lg:hidden text-center mb-8">
                  <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-800 mb-4 shadow-lg shadow-primary-800/25">
                    <Shield className="h-7 w-7 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-foreground">CareShield</h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Health insurance — simple, digital, instant.
                  </p>
                </div>

                {/* Form heading */}
                <div className="mb-7">
                  <h2 className="text-2xl font-bold text-foreground mb-1.5">
                    Verify your mobile
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We'll send a one-time OTP to confirm your number.
                  </p>
                </div>

                {/* Mobile number field */}
                <div className="mb-4">
                  <label className="block text-sm font-semibold text-foreground mb-2">
                    Mobile Number
                  </label>
                  <div
                    className={`flex items-center rounded-xl border-2 bg-white transition-all duration-150 ${
                      mobileError
                        ? 'border-destructive'
                        : 'border-slate-200 hover:border-slate-300 focus-within:border-primary-700 focus-within:shadow-sm focus-within:shadow-primary-800/10'
                    }`}
                  >
                    <div className="flex items-center px-4 border-r-2 border-slate-200 shrink-0 h-[52px] select-none">
                      <span className="text-sm font-bold text-foreground tracking-wide">+91</span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      placeholder="98765 43210"
                      value={mobile}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 10)
                        setMobile(v)
                        setMobileError('')
                      }}
                      maxLength={10}
                      className="flex-1 bg-transparent px-4 py-0 h-[52px] text-base font-medium text-foreground placeholder:text-slate-300 focus:outline-none tracking-wide"
                    />
                  </div>
                  {mobileError ? (
                    <p className="mt-1.5 text-xs font-medium text-destructive">{mobileError}</p>
                  ) : (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      10-digit Indian mobile number
                    </p>
                  )}
                </div>

                {/* Consent */}
                <label className="flex items-start gap-3 cursor-pointer group select-none mb-5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={consent}
                    onClick={() => {
                      if (!consent) setTncOpen(true)
                      else setConsent(false)
                    }}
                    className={`mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                      consent
                        ? 'bg-primary-800 border-primary-800'
                        : 'border-slate-300 group-hover:border-primary-500'
                    }`}
                  >
                    {consent && (
                      <svg viewBox="0 0 10 10" className="h-2.5 w-2.5">
                        <path
                          d="M1.5 5L4 7.5L8.5 2.5"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          fill="none"
                        />
                      </svg>
                    )}
                  </button>
                  <span
                    className="text-[13px] text-slate-600 leading-relaxed"
                    onClick={() => {
                      if (!consent) setTncOpen(true)
                      else setConsent(false)
                    }}
                  >
                    I agree to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTncOpen(true)
                      }}
                      className="text-primary-700 underline underline-offset-2 hover:text-primary-900 font-semibold"
                    >
                      Terms & Conditions
                    </button>{' '}
                    and{' '}
                    <a
                      href="/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-700 underline underline-offset-2 hover:text-primary-900 font-semibold"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Privacy Policy
                    </a>
                  </span>
                </label>

                <Button
                  onClick={handleSendOtp}
                  disabled={mobile.length !== 10 || !consent}
                  loading={loading}
                  size="lg"
                  className="w-full h-[52px] text-base"
                  rightIcon={!loading ? <ArrowRight className="h-5 w-5" /> : undefined}
                >
                  Get OTP
                </Button>

                {/* Mobile-only footer */}
                <div className="lg:hidden flex items-center justify-center gap-5 mt-6">
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <Lock className="h-3 w-3 text-emerald-500" />
                    IRDAI Reg. No. 142
                  </div>
                  <button
                    onClick={() => setHelpOpen(true)}
                    className="flex items-center gap-1 text-[11px] text-primary-700 hover:text-primary-900 font-medium"
                  >
                    <HelpCircle className="h-3 w-3" />
                    Need help?
                  </button>
                </div>
              </motion.div>
            )}

            {phase === 'verified' && (
              <motion.div
                key="verified"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center text-center"
              >
                <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-1">Mobile verified!</h2>
                <p className="text-sm text-muted-foreground">Loading your details…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}

      <TnCModal
        open={tncOpen}
        onClose={() => setTncOpen(false)}
        onAgree={() => setConsent(true)}
      />

      <NeedHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* OTP modal */}
      <Modal
        open={otpOpen}
        onClose={otpSuccess ? undefined : () => setOtpOpen(false)}
        closable={!otpSuccess}
        title={otpSuccess ? undefined : 'Enter OTP'}
        description={otpSuccess ? undefined : `Sent to ${formattedMobile}`}
        maxWidth="sm"
      >
        <AnimatePresence mode="wait">
          {otpSuccess ? (
            <motion.div
              key="otp-success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center py-4 text-center"
            >
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mb-3">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <p className="text-base font-bold text-foreground">Mobile verified!</p>
              <p className="text-sm text-muted-foreground mt-1">Redirecting…</p>
            </motion.div>
          ) : (
            <motion.div key="otp-form" initial={{ opacity: 1 }} className="space-y-5">
              <div>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 6)
                    setOtp(v)
                    setOtpError('')
                  }}
                  maxLength={6}
                  disabled={otpLoading}
                  autoFocus
                  className={`w-full h-[52px] text-center text-2xl font-bold tracking-[0.4em] rounded-xl border-2 bg-white transition-all duration-150 focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    otpError
                      ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                      : 'border-slate-200 focus:border-primary-800 focus:ring-primary-800/20'
                  }`}
                />
                {otpError && (
                  <p className="mt-1.5 text-xs font-medium text-destructive text-center">{otpError}</p>
                )}
              </div>

              <Button
                onClick={() => handleVerifyOtp(otp)}
                disabled={otp.length < 4 || otpLoading}
                loading={otpLoading}
                size="lg"
                className="w-full"
                rightIcon={!otpLoading ? <ArrowRight className="h-4 w-4" /> : undefined}
              >
                Verify & Continue
              </Button>

              <div className="text-center">
                {resendCooldown > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Resend in{' '}
                    <span className="font-semibold text-foreground">{resendCooldown}s</span>
                  </p>
                ) : (
                  <button
                    onClick={handleResend}
                    disabled={otpLoading}
                    className="flex items-center gap-1.5 mx-auto text-xs font-medium text-primary-700 hover:text-primary-800 disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Resend OTP
                  </button>
                )}
              </div>

              {debugOtp && (
                <p className="text-center text-xs text-muted-foreground">
                  Dev mode: OTP is always{' '}
                  <span className="font-mono font-bold text-foreground">{debugOtp}</span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </>
  )
}

'use client'

import Link from 'next/link'
import { ArrowRight, CheckCircle2, Clock, Shield, Star, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'

const STATS = [
  { value: '₹5 Lakh', label: 'Starting cover' },
  { value: '15 min', label: 'To get insured' },
  { value: '60%+', label: 'Instant approval' },
  { value: '18,500+', label: 'Network hospitals' },
]

const QUICK_BENEFITS = [
  'No paperwork or branch visits',
  'IRDAI approved, fully compliant',
  'Instant policy PDF on payment',
]

export function LandingHero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700 pt-12 pb-20 sm:pt-20 sm:pb-32">
      {/* Background texture */}
      <div className="absolute inset-0 bg-hero-pattern opacity-100" />

      {/* Decorative blobs */}
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary-600/30 blur-3xl" />
      <div className="absolute -left-16 bottom-0 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" />
      <div className="absolute right-1/4 bottom-8 h-48 w-48 rounded-full bg-primary-500/20 blur-2xl" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">

          {/* Left: Headlines */}
          <div className="text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="neutral" className="mb-5 bg-white/15 text-white border-0 backdrop-blur-sm text-xs font-medium px-3 py-1">
                <Zap className="h-3 w-3 fill-accent-400 text-accent-400" />
                Powered by AI underwriting
              </Badge>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight">
                Health insurance{' '}
                <span className="relative">
                  <span className="relative z-10 text-accent-400">in 15 minutes</span>
                  <svg className="absolute -bottom-1 left-0 w-full" viewBox="0 0 300 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 8C50 4 100 2 150 2C200 2 250 5 298 8" stroke="#F4845F" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                </span>
                <br />
                <span className="text-white/90">Zero paperwork.</span>
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-white/75 max-w-lg lg:max-w-none leading-relaxed">
                Enter your PAN. We do the rest — automatic profiling, instant underwriting,
                and same-day policy issuance. 100% digital.
              </p>

              {/* Quick benefits */}
              <ul className="mt-6 flex flex-col items-center lg:items-start gap-2">
                {QUICK_BENEFITS.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-sm text-white/80">
                    <CheckCircle2 className="h-4 w-4 text-accent-400 flex-shrink-0" />
                    {b}
                  </li>
                ))}
              </ul>

              {/* CTAs */}
              <div className="mt-9 flex flex-col sm:flex-row items-center lg:items-start gap-3">
                <Link href="/apply/1">
                  <Button
                    variant="accent"
                    size="xl"
                    rightIcon={<ArrowRight className="h-5 w-5" />}
                    className="w-full sm:w-auto font-bold shadow-xl shadow-accent-500/30 hover:shadow-accent-500/40"
                  >
                    Get My Free Quote
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button
                    variant="ghost"
                    size="xl"
                    className="w-full sm:w-auto text-white/90 hover:text-white hover:bg-white/10"
                  >
                    See how it works
                  </Button>
                </Link>
              </div>

              {/* Trust micro-copy */}
              <p className="mt-4 text-xs text-white/50 flex items-center justify-center lg:justify-start gap-1.5">
                <Shield className="h-3.5 w-3.5" />
                IRDAI Approved · No spam · Your data is secure
              </p>
            </motion.div>
          </div>

          {/* Right: Stats card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="w-full max-w-sm bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 shadow-2xl">
              {/* Card header */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20">
                  <Shield className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">CareShield Health</p>
                  <p className="text-white/60 text-xs">Individual & Family Cover</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
                  <span className="text-white/80 text-xs font-medium">4.8</span>
                </div>
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                {STATS.map((stat) => (
                  <div
                    key={stat.label}
                    className="bg-white/10 rounded-xl p-3.5 text-center hover:bg-white/15 transition-colors"
                  >
                    <p className="text-xl font-bold text-white">{stat.value}</p>
                    <p className="text-xs text-white/60 mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Journey steps preview */}
              <div className="space-y-2 mb-5">
                {[
                  { icon: '📱', text: 'Verify mobile (OTP)', done: true },
                  { icon: '📋', text: 'Auto-fill from PAN', done: true },
                  { icon: '📊', text: 'Get instant quotes', active: true },
                  { icon: '✅', text: 'Pay & get policy', pending: true },
                ].map((step) => (
                  <div
                    key={step.text}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors ${
                      step.active ? 'bg-accent-500/20 border border-accent-400/30' : 'bg-white/5'
                    }`}
                  >
                    <span className="text-base">{step.icon}</span>
                    <span className={`text-xs font-medium ${step.active ? 'text-accent-300' : step.done ? 'text-white/90' : 'text-white/50'}`}>
                      {step.text}
                    </span>
                    {step.active && (
                      <span className="ml-auto text-[10px] font-semibold text-accent-400 bg-accent-500/20 px-2 py-0.5 rounded-full">
                        You are here
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 text-center justify-center">
                <Clock className="h-3.5 w-3.5 text-white/40" />
                <p className="text-[11px] text-white/40">Average journey: 12 minutes</p>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  )
}

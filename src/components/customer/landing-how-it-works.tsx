'use client'

import { motion } from 'framer-motion'
import { Smartphone, FileSearch, ClipboardCheck, BadgeCheck } from 'lucide-react'

const STEPS = [
  {
    number: '01',
    icon: Smartphone,
    title: 'Verify in seconds',
    desc: 'Enter your mobile number. Get an OTP. That\'s your first and only identity check at entry.',
    color: 'bg-primary-50 text-primary-800',
    highlight: 'Just your mobile number',
  },
  {
    number: '02',
    icon: FileSearch,
    title: 'We auto-fill everything',
    desc: 'Enter your PAN. Our AI fetches your demographics, income, and risk profile automatically — 80% of the form is filled for you.',
    color: 'bg-accent-50 text-accent-600',
    highlight: 'PAN is all we need',
  },
  {
    number: '03',
    icon: ClipboardCheck,
    title: 'Pick your plan',
    desc: 'Choose from 3 tailored plans. Complete a quick health questionnaire. Upload documents in minutes.',
    color: 'bg-emerald-50 text-emerald-700',
    highlight: 'Smart recommendations',
  },
  {
    number: '04',
    icon: BadgeCheck,
    title: 'Pay & get covered',
    desc: 'Our engine evaluates your application instantly. Pay securely via Razorpay. Your policy PDF lands in your inbox.',
    color: 'bg-blue-50 text-blue-700',
    highlight: 'Policy in < 15 minutes',
  },
]

export function LandingHowItWorks() {
  return (
    <section id="how-it-works" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-800 mb-3">
            How it works
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            From zero to policy in 4 simple steps
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            We've eliminated every unnecessary step. No branch visits, no agents, no callbacks.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connector line (desktop) */}
          <div className="hidden lg:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-primary-100 via-border to-primary-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
            {STEPS.map((step, idx) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="relative flex flex-col items-center text-center group"
              >
                {/* Step number bubble */}
                <div className="relative mb-5 z-10">
                  <div className={`flex h-20 w-20 items-center justify-center rounded-2xl shadow-card group-hover:shadow-card-hover transition-shadow ${step.color}`}>
                    <step.icon className="h-8 w-8" strokeWidth={1.5} />
                  </div>
                  <div className="absolute -top-2 -right-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-white text-[10px] font-bold">
                    {step.number}
                  </div>
                </div>

                {/* Content */}
                <h3 className="text-base font-bold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{step.desc}</p>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-800 bg-primary-50 px-2.5 py-1 rounded-full">
                  ✦ {step.highlight}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

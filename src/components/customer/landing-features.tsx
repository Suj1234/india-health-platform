'use client'

import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import {
  Brain,
  ScanFace,
  Fingerprint,
  FileCheck2,
  ShieldCheck,
  Zap,
  Clock4,
} from 'lucide-react'

const PRIMARY_FEATURES = [
  {
    icon: Brain,
    title: 'AI-Powered Underwriting',
    desc: 'Our proprietary STP engine scores your risk profile in real-time — factoring income, lifestyle, medical history, and 40+ data signals. No human delay.',
    tag: 'Core Engine',
    tagColor: 'bg-primary-50 text-primary-800',
    gradient: 'from-primary-500/10 to-primary-600/5',
    iconBg: 'bg-primary-100 text-primary-700',
  },
  {
    icon: ScanFace,
    title: 'Biometric ID Verification',
    desc: 'Face liveness check + document OCR via NuralX. Aadhaar details extracted and matched automatically. No branch visit, no agent, no courier.',
    tag: 'Zero Friction',
    tagColor: 'bg-accent-50 text-accent-700',
    gradient: 'from-accent-500/10 to-accent-600/5',
    iconBg: 'bg-accent-100 text-accent-700',
  },
  {
    icon: Zap,
    title: 'Straight-Through Processing',
    desc: '60%+ of applications get instant policy issuance — no underwriter touch. For referred cases, a dedicated reviewer responds within 4 business hours.',
    tag: '60%+ STP rate',
    tagColor: 'bg-emerald-50 text-emerald-700',
    gradient: 'from-emerald-500/10 to-emerald-600/5',
    iconBg: 'bg-emerald-100 text-emerald-700',
  },
]

const SECONDARY_FEATURES = [
  {
    icon: FileCheck2,
    title: 'Smart Document OCR',
    desc: 'Upload Aadhaar, PAN, bank statement, or ITR — our OCR extracts all data, pre-fills the proposal, and cross-validates against PAN records.',
  },
  {
    icon: Fingerprint,
    title: 'Zero Password Needed',
    desc: 'Customers authenticate with a single OTP on their mobile. No account creation, no forgotten passwords, no friction.',
  },
  {
    icon: ShieldCheck,
    title: 'End-to-End Encrypted',
    desc: '256-bit TLS in transit, AES-256 at rest. PAN and Aadhaar masked in all logs. CERT-In compliant data residency.',
  },
  {
    icon: Clock4,
    title: 'Resume Anytime',
    desc: 'Session saved at every step. Close the browser, come back later — pick up exactly where you left off. No data lost.',
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export function LandingFeatures() {
  const { slug } = useParams<{ slug: string }>()
  return (
    <section id="features" className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-800 mb-3">
            Why CareShield
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            Built different. By design.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Legacy insurers still ask for 12 documents and a 3-week wait.
            We built a platform where the hard parts are invisible to you.
          </p>
        </div>

        {/* Primary features — large cards */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8"
        >
          {PRIMARY_FEATURES.map((feat) => (
            <motion.div
              key={feat.title}
              variants={item}
              className={`relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br ${feat.gradient} p-6 group hover:shadow-card-hover transition-shadow`}
            >
              <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${feat.iconBg} mb-4`}>
                <feat.icon className="h-6 w-6" strokeWidth={1.5} />
              </div>
              <span className={`inline-block text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-3 ${feat.tagColor}`}>
                {feat.tag}
              </span>
              <h3 className="text-lg font-bold text-foreground mb-2">{feat.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feat.desc}</p>

              {/* Decorative corner */}
              <div className="absolute -bottom-6 -right-6 h-24 w-24 rounded-full bg-white/40 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
        </motion.div>

        {/* Secondary features — compact list */}
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {SECONDARY_FEATURES.map((feat) => (
            <motion.div
              key={feat.title}
              variants={item}
              className="flex flex-col gap-3 rounded-xl border border-border bg-white p-5 hover:shadow-card transition-shadow group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary group-hover:bg-primary-50 transition-colors">
                <feat.icon className="h-4.5 w-4.5 text-muted-foreground group-hover:text-primary-700 transition-colors" strokeWidth={2} />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground mb-1">{feat.title}</p>
                <p className="text-xs text-muted-foreground leading-relaxed">{feat.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA strip */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-12 rounded-2xl bg-primary-900 px-6 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row items-center justify-between gap-6"
        >
          <div className="text-center sm:text-left">
            <p className="text-white font-bold text-lg sm:text-xl">
              Ready to experience insurance the right way?
            </p>
            <p className="text-white/60 text-sm mt-1">
              No commitment. No credit card required at this stage.
            </p>
          </div>
          <a
            href={`/i/${slug}/apply/1`}
            className="flex-shrink-0 inline-flex items-center gap-2 bg-accent-500 hover:bg-accent-600 text-white font-semibold px-7 py-3 rounded-xl transition-colors shadow-lg shadow-accent-500/30 text-sm"
          >
            Start My Application
            <span className="text-accent-200 text-xs font-normal">— takes 15 min</span>
          </a>
        </motion.div>
      </div>
    </section>
  )
}

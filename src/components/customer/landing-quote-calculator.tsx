'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calculator, Users, UserCheck, Heart, ChevronRight, Loader2, ShieldCheck, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type CoverType = 'individual' | 'family_floater' | 'parents'
type AgeRange = '18-30' | '31-40' | '41-50' | '51-60'
type SumInsured = 5 | 10 | 15 | 25

interface QuoteResult {
  annual: number
  monthly: number
  cover: string
  highlights: string[]
}

const COVER_OPTIONS: { id: CoverType; label: string; sublabel: string; icon: typeof Users }[] = [
  { id: 'individual', label: 'Just Me', sublabel: 'Individual cover', icon: UserCheck },
  { id: 'family_floater', label: 'Family', sublabel: '2 adults + kids', icon: Users },
  { id: 'parents', label: 'Parents', sublabel: 'For your parents', icon: Heart },
]

const AGE_OPTIONS: { id: AgeRange; label: string }[] = [
  { id: '18-30', label: '18 – 30 yrs' },
  { id: '31-40', label: '31 – 40 yrs' },
  { id: '41-50', label: '41 – 50 yrs' },
  { id: '51-60', label: '51 – 60 yrs' },
]

const SUM_OPTIONS: { value: SumInsured; label: string }[] = [
  { value: 5, label: '₹5 Lakh' },
  { value: 10, label: '₹10 Lakh' },
  { value: 15, label: '₹15 Lakh' },
  { value: 25, label: '₹25 Lakh' },
]

function calcPremium(cover: CoverType, age: AgeRange, sum: SumInsured) {
  const base: Record<SumInsured, number> = { 5: 5800, 10: 9200, 15: 13500, 25: 20000 }
  const ageMult: Record<AgeRange, number> = { '18-30': 1.0, '31-40': 1.3, '41-50': 1.75, '51-60': 2.4 }
  const coverMult: Record<CoverType, number> = { individual: 1.0, family_floater: 2.1, parents: 2.8 }
  const annual = Math.round((base[sum] * ageMult[age] * coverMult[cover]) / 100) * 100
  return { annual, monthly: Math.round(annual / 12 / 10) * 10 }
}

export function LandingQuoteCalculator() {
  const [cover, setCover] = useState<CoverType>('individual')
  const [age, setAge] = useState<AgeRange>('18-30')
  const [sum, setSum] = useState<SumInsured>(10)
  const [loading, setLoading] = useState(false)
  const [quotes, setQuotes] = useState<QuoteResult[] | null>(null)

  function handleCalculate() {
    setLoading(true)
    setQuotes(null)

    setTimeout(() => {
      const { annual, monthly } = calcPremium(cover, age, sum)
      setQuotes([{
        annual,
        monthly,
        cover: `₹${sum} Lakh`,
        highlights: [
          'In-patient hospitalisation',
          'Day care procedures (540+)',
          'OPD cover · Maternity benefit',
          'Annual health check-up',
          'AYUSH treatment',
        ],
      }])
      setLoading(false)
    }, 1200)
  }

  return (
    <section className="bg-secondary/50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary-800 mb-3">
            Quick Estimate
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground">
            How much will it cost?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-xl mx-auto">
            Get a ballpark premium in seconds. No PAN needed yet — just basic details.
          </p>
        </div>

        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-border bg-white shadow-card overflow-hidden">
            {/* Calculator form */}
            <div className="p-6 sm:p-8 border-b border-border">
              <div className="flex items-center gap-2 mb-6">
                <Calculator className="h-5 w-5 text-primary-700" />
                <span className="text-sm font-semibold text-foreground">Premium Calculator</span>
              </div>

              {/* Cover Type */}
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Who needs cover?
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {COVER_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setCover(opt.id); setQuotes(null) }}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all text-center',
                        cover === opt.id
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-border bg-white hover:border-primary-200 hover:bg-primary-50/50'
                      )}
                    >
                      <opt.icon className={cn('h-5 w-5', cover === opt.id ? 'text-primary-700' : 'text-muted-foreground')} strokeWidth={1.5} />
                      <span className={cn('text-xs font-semibold', cover === opt.id ? 'text-primary-800' : 'text-foreground')}>
                        {opt.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{opt.sublabel}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Range */}
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Age of oldest member
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {AGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => { setAge(opt.id); setQuotes(null) }}
                      className={cn(
                        'rounded-lg border-2 py-2 px-1 text-xs font-medium transition-all text-center',
                        age === opt.id
                          ? 'border-primary-600 bg-primary-50 text-primary-800'
                          : 'border-border bg-white text-muted-foreground hover:border-primary-200'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sum Insured */}
              <div className="mb-7">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Coverage amount
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {SUM_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSum(opt.value); setQuotes(null) }}
                      className={cn(
                        'rounded-lg border-2 py-2.5 text-sm font-semibold transition-all text-center',
                        sum === opt.value
                          ? 'border-accent-500 bg-accent-50 text-accent-700'
                          : 'border-border bg-white text-muted-foreground hover:border-accent-300'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCalculate}
                className="w-full"
                size="lg"
                loading={loading}
                leftIcon={!loading ? <Calculator className="h-4 w-4" /> : undefined}
              >
                {loading ? 'Calculating...' : 'Get My Estimate'}
              </Button>
            </div>

            {/* Quote results */}
            <AnimatePresence>
              {(loading || quotes) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  {loading ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-12">
                      <Loader2 className="h-8 w-8 text-primary-600 animate-spin" />
                      <p className="text-sm text-muted-foreground">Fetching best rates for you…</p>
                    </div>
                  ) : quotes ? (
                    <div className="p-6 sm:p-8">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                        Indicative annual premium
                      </p>
                      {quotes.map((q, i) => (
                        <div key={i} className="rounded-xl border-2 border-primary-600 bg-primary-50/40 p-5 mb-5">
                          <div className="flex items-end justify-between gap-4 mb-4">
                            <div>
                              <p className="text-3xl font-bold text-primary-800">
                                ₹{q.annual.toLocaleString('en-IN')}
                                <span className="text-base font-normal text-muted-foreground">/yr</span>
                              </p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                ≈ ₹{q.monthly.toLocaleString('en-IN')}/mo · {q.cover} cover
                              </p>
                            </div>
                            <span className="inline-flex items-center gap-1 bg-primary-800 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0">
                              <Star className="h-2.5 w-2.5 fill-white" />
                              Standard Care Plan
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5">
                            {q.highlights.map((h) => (
                              <div key={h} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                <ShieldCheck className="h-3 w-3 text-primary-600 shrink-0" />
                                {h}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}

                      <div className="flex flex-col sm:flex-row items-center gap-3">
                        <a href="/apply/1" className="w-full sm:w-auto">
                          <Button variant="accent" size="md" className="w-full" rightIcon={<ChevronRight className="h-4 w-4" />}>
                            Apply Now — Get Exact Quote
                          </Button>
                        </a>
                        <p className="text-xs text-muted-foreground text-center">
                          Exact premium finalised after health assessment. No commitment yet.
                        </p>
                      </div>
                    </div>
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            * Indicative estimates only. Actual premium depends on medical history and IRDAI-approved rating factors.
            All premiums include GST.
          </p>
        </div>
      </div>
    </section>
  )
}

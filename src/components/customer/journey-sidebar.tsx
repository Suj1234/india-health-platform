'use client'

import { usePathname } from 'next/navigation'
import { Check, Lock, Shield, BadgeCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

const PHASES = [
  {
    number: 1,
    label: 'Verify',
    steps: [1, 2],
    why: 'Your mobile & PAN verify your identity. IRDAI mandates KYC for all health policies.',
  },
  {
    number: 2,
    label: 'Income',
    steps: [4],
    why: 'Your income helps us recommend the right sum insured for your family and lifestyle.',
  },
  {
    number: 3,
    label: 'Coverage',
    steps: [5, 6],
    why: 'Choose from plans designed for Indian families — with floater and individual options.',
  },
  {
    number: 4,
    label: 'Health',
    steps: [7],
    why: 'Your health declaration ensures accurate underwriting. All data is confidential.',
  },
  {
    number: 5,
    label: 'Review',
    steps: [8, 9],
    why: 'Review your proposal and complete identity verification before submission.',
  },
  {
    number: 6,
    label: 'Documents',
    steps: [10, 11],
    why: 'Upload KYC documents and complete biometrics to activate your policy.',
  },
  {
    number: 7,
    label: 'Done',
    steps: [12],
    why: 'Your policy is issued instantly after payment confirmation.',
  },
]

function getPhaseFromStep(step: number): number {
  for (const phase of PHASES) {
    if (phase.steps.includes(step)) return phase.number
    // Step 3 redirects to 4, so treat it as phase 2
    if (step === 3) return 2
  }
  return 1
}

export function JourneySidebar({ currentStep }: { currentStep: number }) {
  const currentPhase = getPhaseFromStep(currentStep)
  const activePhase = PHASES.find((p) => p.number === currentPhase)

  return (
    <div className="flex flex-col gap-6 h-full">
      {/* Phase progress */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Your Progress
        </p>
        <div className="space-y-1">
          {PHASES.map((phase) => {
            const isDone = phase.number < currentPhase
            const isActive = phase.number === currentPhase
            return (
              <div
                key={phase.number}
                className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors',
                  isActive && 'bg-primary-800/10',
                  !isActive && !isDone && 'opacity-50'
                )}
              >
                <div
                  className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-all',
                    isDone && 'bg-emerald-500 text-white',
                    isActive && 'bg-primary-800 text-white ring-4 ring-primary-800/20',
                    !isDone && !isActive && 'bg-slate-200 text-slate-400'
                  )}
                >
                  {isDone ? <Check className="h-3.5 w-3.5" /> : phase.number}
                </div>
                <span
                  className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-primary-900' : isDone ? 'text-emerald-700' : 'text-slate-400'
                  )}
                >
                  {phase.label}
                </span>
                {isActive && (
                  <span className="ml-auto text-[10px] font-semibold text-primary-700 bg-primary-100 px-1.5 py-0.5 rounded-full">
                    Now
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Why this step */}
      {activePhase && (
        <div className="rounded-xl border border-primary-100 bg-primary-50 p-4">
          <p className="text-xs font-semibold text-primary-700 mb-1">Why this step?</p>
          <p className="text-xs text-primary-800 leading-relaxed">{activePhase.why}</p>
        </div>
      )}

      {/* Trust badges */}
      <div className="mt-auto space-y-2.5 pt-2">
        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100">
            <Lock className="h-3 w-3 text-emerald-600" />
          </div>
          256-bit SSL encryption
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100">
            <BadgeCheck className="h-3 w-3 text-blue-600" />
          </div>
          IRDAI Reg. No. 142
        </div>
        <div className="flex items-center gap-2.5 text-xs text-slate-500">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100">
            <Shield className="h-3 w-3 text-primary-700" />
          </div>
          Data never sold or shared
        </div>
      </div>
    </div>
  )
}

// Compact mobile progress bar — used at top on mobile/tablet
export function JourneyMobileBar({ currentStep }: { currentStep: number }) {
  const currentPhase = getPhaseFromStep(currentStep)
  const phase = PHASES.find((p) => p.number === currentPhase)
  const progress = ((currentPhase - 1) / (PHASES.length - 1)) * 100

  return (
    <div className="px-4 py-3 bg-white border-b border-border">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground font-medium">
          Phase {currentPhase} of {PHASES.length}
        </span>
        <span className="text-xs font-semibold text-primary-800">{phase?.label}</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary-800 to-primary-600 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

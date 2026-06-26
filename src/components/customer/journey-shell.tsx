'use client'

import { useState } from 'react'
import { Check, Lock, BadgeCheck, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NeedHelpModal } from '@/components/ui/need-help-modal'

const PHASES = [
  {
    number: 1,
    label: 'Identity',
    description: 'Verify & add members',
    steps: [2],
    why: 'Your mobile & PAN verify your identity. IRDAI mandates KYC for all health policies.',
  },
  {
    number: 2,
    label: 'Health',
    description: 'Medical declaration',
    steps: [3],
    why: 'Your health declaration is used to calculate your final premium accurately — no surprise changes later.',
  },
  {
    number: 3,
    label: 'Plan',
    description: 'Confirm your plan',
    steps: [4],
    why: 'Your premium is finalised based on your health data. Review and add optional riders.',
  },
  {
    number: 4,
    label: 'Proposal',
    description: 'Proposal & nominee',
    steps: [5],
    why: 'Review your proposal details and add a nominee for the policy.',
  },
  {
    number: 5,
    label: 'Documents',
    description: 'Aadhaar verification',
    steps: [6],
    why: 'Aadhaar verification is required for KYC as per IRDAI regulations.',
  },
  {
    number: 6,
    label: 'Policy',
    description: 'Policy issuance',
    steps: [7],
    why: 'Your policy is issued instantly after payment confirmation.',
  },
]

function getPhaseNumber(step: number, phases: typeof PHASES): number {
  for (const p of phases) {
    if (p.steps.includes(step)) return p.number
  }
  return phases.length + 1
}

export function JourneyShell({
  currentStep,
  children,
  subBar,
}: {
  currentStep: number
  children: React.ReactNode
  subBar?: React.ReactNode
}) {
  const [helpOpen, setHelpOpen] = useState(false)

  const activePhases = PHASES
  const currentPhase = getPhaseNumber(currentStep, activePhases)
  const activePhase = activePhases.find((p) => p.number === currentPhase)
  const progress = Math.round((currentPhase / activePhases.length) * 100)

  return (
    <>
      {/* ── Mobile / tablet phase bar ─────────────────────────────────────── */}
      <div className="lg:hidden sticky top-14 z-30 bg-white border-b border-border px-4 py-2.5 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">
            Step {currentPhase} of {activePhases.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-primary-800">
              {activePhase?.label}
            </span>
            <button
              onClick={() => setHelpOpen(true)}
              className="text-muted-foreground hover:text-primary-700"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-800 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Body: sidebar + content ───────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar — desktop only */}
        <aside className="hidden lg:flex flex-col w-[264px] xl:w-[292px] shrink-0 border-r border-border bg-white sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">

          {/* Sidebar header */}
          <div className="px-5 pt-6 pb-4 border-b border-slate-100">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
              Your Steps
            </p>
          </div>

          {/* Phase list */}
          <ol className="flex-1 px-3 pt-3 pb-2">
            {activePhases.map((phase, i) => {
              const isDone = phase.number < currentPhase
              const isActive = phase.number === currentPhase
              const isUpcoming = phase.number > currentPhase
              const isLast = i === activePhases.length - 1

              return (
                <li key={phase.number} className="flex items-stretch">

                  {/* Left column: circle + connector line */}
                  <div className="flex flex-col items-center w-9 shrink-0">
                    <div className="pt-3 shrink-0">
                      <div
                        className={cn(
                          'flex h-[26px] w-[26px] items-center justify-center rounded-full text-[11px] font-bold',
                          isDone && 'bg-emerald-500 text-white',
                          isActive && 'bg-primary-800 text-white shadow-md shadow-primary-800/30',
                          isUpcoming && 'bg-white text-slate-400 border-2 border-slate-200'
                        )}
                      >
                        {isDone ? <Check className="h-3 w-3" /> : phase.number}
                      </div>
                    </div>
                    {!isLast && (
                      <div
                        className={cn(
                          'w-0.5 flex-1 min-h-[10px] my-1.5',
                          isDone ? 'bg-emerald-200' : 'bg-slate-100'
                        )}
                      />
                    )}
                  </div>

                  {/* Right: text content */}
                  <div
                    className={cn(
                      'flex-1 min-w-0 ml-1 px-3 pt-3 pb-2.5 mb-1.5 rounded-xl transition-colors',
                      isActive && 'bg-primary-50 border border-primary-100'
                    )}
                  >
                    <p
                      className={cn(
                        'text-[13px] leading-tight',
                        isActive && 'text-primary-900 font-semibold',
                        isDone && 'text-emerald-700 font-medium',
                        isUpcoming && 'text-slate-400 font-medium'
                      )}
                    >
                      {phase.label}
                    </p>
                    <p
                      className={cn(
                        'text-[11px] mt-0.5 leading-snug',
                        isActive && 'text-primary-600',
                        isDone && 'text-emerald-500',
                        isUpcoming && 'text-slate-300'
                      )}
                    >
                      {phase.description}
                    </p>
                    {isActive && (
                      <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-semibold text-primary-700 bg-white border border-primary-200 px-2 py-0.5 rounded-full">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-500 animate-pulse" />
                        In progress
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ol>

          {/* Trust section */}
          <div className="mx-3 mb-5">
            <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3.5 space-y-2.5">
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <Lock className="h-3 w-3 shrink-0 text-emerald-600" />
                256-bit SSL encryption
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <BadgeCheck className="h-3 w-3 shrink-0 text-blue-500" />
                IRDAI Reg. No. 142
              </div>
              <button
                onClick={() => setHelpOpen(true)}
                className="flex items-center gap-2 text-[11px] text-primary-700 hover:text-primary-900 font-medium transition-colors"
              >
                <HelpCircle className="h-3 w-3 shrink-0" />
                Need help?
              </button>
            </div>
          </div>
        </aside>

        {/* Right content area */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {subBar && (
            <div className="sticky top-0 z-20 bg-white border-b border-border">
              {subBar}
            </div>
          )}
          <div className="px-6 lg:px-8 xl:px-10 py-8 sm:py-10">
            {children}
          </div>
        </main>
      </div>

      <NeedHelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />
    </>
  )
}

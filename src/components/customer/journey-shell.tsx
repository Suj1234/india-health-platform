'use client'

import { useState } from 'react'
import { Check, Lock, BadgeCheck, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NeedHelpModal } from '@/components/ui/need-help-modal'

// Step numbers refer to URL steps (/apply/N).
// Step 5 = Documents (ApplyStep6 component), Step 6 = Proposal (ApplyStep5 component).
const ALL_PHASES = [
  {
    key: 'identity',
    label: 'Identity',
    description: 'Verify & add members',
    steps: [2],
    why: 'Your mobile & PAN verify your identity. IRDAI mandates KYC for all health policies.',
    hideForIndividual: false,
  },
  {
    key: 'health',
    label: 'Health',
    description: 'Medical declaration',
    steps: [3],
    why: 'Your health declaration is used to calculate your final premium accurately - no surprise changes later.',
    hideForIndividual: false,
  },
  {
    key: 'plan',
    label: 'Plan',
    description: 'Confirm your plan',
    steps: [4],
    why: 'Your premium is finalised based on your health data. Review and add optional riders.',
    hideForIndividual: false,
  },
  {
    key: 'documents',
    label: 'Documents',
    description: 'KYC document upload',
    steps: [5],
    why: 'Aadhaar verification is required for KYC as per IRDAI regulations.',
    hideForIndividual: true,
  },
  {
    key: 'proposal',
    label: 'Proposal',
    description: 'Nominee & declaration',
    steps: [6],
    why: 'Review your full proposal, add a nominee, and sign the declaration before payment.',
    hideForIndividual: false,
  },
  {
    key: 'policy',
    label: 'Policy',
    description: 'Policy issuance',
    steps: [7],
    why: 'Your policy is issued instantly after payment confirmation.',
    hideForIndividual: false,
  },
]

export function JourneyShell({
  currentStep,
  coverType,
  children,
  subBar,
}: {
  currentStep: number
  coverType?: string
  children: React.ReactNode
  subBar?: React.ReactNode
}) {
  const [helpOpen, setHelpOpen] = useState(false)

  const isIndividual = coverType === 'individual'

  // Filter Documents phase for individual plans, then renumber sequentially
  const activePhases = ALL_PHASES
    .filter((p) => !(isIndividual && p.hideForIndividual))
    .map((p, i) => ({ ...p, number: i + 1 }))

  const currentPhaseEntry = activePhases.find((p) => p.steps.includes(currentStep))
  const currentPhaseNumber = currentPhaseEntry?.number ?? activePhases.length + 1
  const progress = Math.round((currentPhaseNumber / activePhases.length) * 100)

  return (
    <>
      {/* Mobile / tablet phase bar */}
      <div className="lg:hidden sticky top-14 z-30 bg-white border-b border-border px-4 py-2.5 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-muted-foreground font-medium">
            Step {currentPhaseNumber} of {activePhases.length}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-primary-800">
              {currentPhaseEntry?.label}
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

      {/* Body: sidebar + content */}
      <div className="flex flex-1 min-h-0">

        {/* Left sidebar - desktop only */}
        <aside className="hidden lg:flex flex-col w-[264px] xl:w-[292px] shrink-0 border-r border-border bg-white sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto">

          <div className="px-5 pt-6 pb-4 border-b border-slate-100">
            <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
              Your Steps
            </p>
          </div>

          <ol className="flex-1 px-3 pt-3 pb-2">
            {activePhases.map((phase, i) => {
              const isDone = phase.number < currentPhaseNumber
              const isActive = phase.number === currentPhaseNumber
              const isUpcoming = phase.number > currentPhaseNumber
              const isLast = i === activePhases.length - 1

              return (
                <li key={phase.key} className="flex items-stretch">
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

'use client'

import { cn } from '@/lib/utils'
import { Check, Lock } from 'lucide-react'

interface Step {
  number: number
  label: string
  shortLabel?: string
}

interface ProgressStepsProps {
  steps: Step[]
  currentStep: number
  /** Steps at this number and above show as locked (non-STP under-review state) */
  lockedFrom?: number
  className?: string
}

export function ProgressSteps({ steps, currentStep, lockedFrom, className }: ProgressStepsProps) {
  return (
    <div className={cn('w-full', className)}>
      {/* Mobile: progress bar + label */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-medium">
            Step {currentStep} of {steps.length}
          </span>
          <span className="text-xs text-primary-800 font-semibold">
            {steps[currentStep - 1]?.label ?? ''}
          </span>
        </div>
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-800 to-primary-600 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </div>

      {/* Desktop: step indicators */}
      <div className="hidden sm:flex items-center">
        {steps.map((step, idx) => {
          const isLocked = lockedFrom != null && step.number >= lockedFrom
          const isDone = step.number < currentStep && !isLocked
          const isActive = step.number === currentStep && !isLocked
          const isLast = idx === steps.length - 1

          return (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300',
                    isDone && 'bg-primary-800 text-white',
                    isActive && 'bg-white border-2 border-primary-800 text-primary-800 scale-110',
                    isLocked && 'bg-amber-100 text-amber-500 border border-amber-300',
                    !isDone && !isActive && !isLocked && 'bg-border text-muted-foreground'
                  )}
                >
                  {isDone ? <Check className="h-4 w-4" /> : isLocked ? <Lock className="h-3.5 w-3.5" /> : step.number}
                </div>
                <span
                  className={cn(
                    'mt-1.5 text-[10px] font-medium whitespace-nowrap',
                    isActive ? 'text-primary-800' : isDone ? 'text-primary-700' : isLocked ? 'text-amber-500' : 'text-muted-foreground'
                  )}
                >
                  {step.shortLabel ?? step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'h-0.5 flex-1 mx-1 transition-all duration-500',
                    isDone ? 'bg-primary-800' : isLocked ? 'bg-amber-200' : 'bg-border'
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

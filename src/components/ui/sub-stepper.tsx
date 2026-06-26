'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SubStep {
  key: string
  label: string
}

interface SubStepperProps {
  steps: SubStep[]
  current: string
  completed: string[]
  onBack?: (key: string) => void
  className?: string
}

export function SubStepper({ steps, current, completed, onBack, className }: SubStepperProps) {
  return (
    <div className={cn('flex overflow-x-auto scrollbar-none', className)}>
      {steps.map((step) => {
        const isDone = completed.includes(step.key)
        const isActive = step.key === current

        return (
          <button
            key={step.key}
            type="button"
            disabled={!isDone || isActive}
            onClick={() => isDone && !isActive && onBack?.(step.key)}
            className={cn(
              'flex-1 min-w-0 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold border-b-2 transition-all duration-200 whitespace-nowrap select-none',
              isActive && 'border-primary-800 text-primary-800 bg-primary-50/40',
              isDone && !isActive && 'border-emerald-500 text-emerald-700 cursor-pointer hover:bg-emerald-50/50',
              !isDone && !isActive && 'border-transparent text-muted-foreground cursor-default'
            )}
          >
            {isDone && !isActive ? (
              <span className="h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
                <Check className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
              </span>
            ) : isActive ? (
              <span className="h-2 w-2 rounded-full bg-primary-800 shrink-0" />
            ) : (
              <span className="h-2 w-2 rounded-full bg-border shrink-0" />
            )}
            <span className="truncate">{step.label}</span>
          </button>
        )
      })}
    </div>
  )
}

'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
  leftElement?: React.ReactNode
  rightElement?: React.ReactNode
  wrapperClassName?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, leftElement, rightElement, wrapperClassName, ...props }, ref) => {
    const id = props.id ?? props.name

    return (
      <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
        {label && (
          <label htmlFor={id} className="text-sm font-medium text-foreground">
            {label}
            {props.required && <span className="text-destructive ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {leftElement && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground">
              {leftElement}
            </div>
          )}
          <input
            id={id}
            ref={ref}
            className={cn(
              'w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60',
              'focus:outline-none focus:border-primary-800 focus:ring-2 focus:ring-primary-800/15',
              'disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground',
              'transition-all duration-150',
              error
                ? 'border-destructive focus:border-destructive focus:ring-destructive/15'
                : 'border-border',
              leftElement && 'pl-10',
              rightElement && 'pr-10',
              className
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground">
              {rightElement}
            </div>
          )}
        </div>
        {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
        {error && <p className="text-xs font-medium text-destructive">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

export { Input }

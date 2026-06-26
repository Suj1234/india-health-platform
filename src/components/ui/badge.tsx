import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
  {
    variants: {
      variant: {
        success: 'bg-success-50 text-success',
        warning: 'bg-warning-50 text-warning',
        error: 'bg-destructive/10 text-destructive',
        info: 'bg-primary-50 text-primary-800',
        neutral: 'bg-secondary text-muted-foreground',
        pending: 'bg-amber-50 text-amber-700',
        teal: 'bg-primary-50 text-primary-800',
        orange: 'bg-accent-50 text-accent-600',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn('h-1.5 w-1.5 rounded-full', {
            'bg-success': variant === 'success',
            'bg-warning': variant === 'warning',
            'bg-destructive': variant === 'error',
            'bg-primary-800': variant === 'info' || variant === 'teal',
            'bg-muted-foreground': variant === 'neutral',
            'bg-amber-500': variant === 'pending',
            'bg-accent-500': variant === 'orange',
          })}
        />
      )}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }

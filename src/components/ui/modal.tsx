'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose?: () => void
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
  closable?: boolean
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
  closable = true,
  maxWidth = 'md',
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  const maxWidthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  }[maxWidth]

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={closable ? onClose : undefined}
          />

          {/* Card */}
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              'relative w-full bg-white rounded-2xl shadow-2xl overflow-hidden',
              maxWidthClass,
              className
            )}
          >
            {/* Header */}
            {(title || (closable && onClose)) && (
              <div className="flex items-start justify-between px-6 pt-5 pb-0">
                <div>
                  {title && (
                    <h2 className="text-base font-bold text-foreground leading-tight">{title}</h2>
                  )}
                  {description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                  )}
                </div>
                {closable && onClose && (
                  <button
                    onClick={onClose}
                    className="ml-4 shrink-0 flex items-center justify-center h-7 w-7 rounded-full hover:bg-secondary transition-colors -mt-0.5"
                  >
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}

            {/* Body */}
            <div className={cn('px-6 pb-6', title || (closable && onClose) ? 'pt-4' : 'pt-6')}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

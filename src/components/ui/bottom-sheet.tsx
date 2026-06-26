'use client'

import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onClose?: () => void
  title?: string
  description?: string
  children: React.ReactNode
  closable?: boolean
  className?: string
}

export function BottomSheet({
  open,
  onClose,
  title,
  description,
  children,
  closable = true,
  className,
}: BottomSheetProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={closable ? onClose : undefined}
          />

          {/* Sheet — full-width on mobile, centered card on sm+ */}
          <motion.div
            key="sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 380, mass: 0.8 }}
            className={cn(
              'fixed z-50 bg-white shadow-2xl',
              // Mobile: anchored to bottom, full width, rounded top
              'bottom-0 left-0 right-0 rounded-t-2xl',
              // sm+: centered card with space from bottom, rounded all sides
              'sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md sm:rounded-2xl sm:right-auto',
              className
            )}
          >
            {/* Drag handle (mobile only) */}
            <div className="sm:hidden flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-gray-200" />
            </div>

            {/* Header */}
            {(title || closable) && (
              <div className="flex items-start justify-between px-5 pt-4 pb-0">
                <div>
                  {title && (
                    <h2 className="text-base font-bold text-foreground">{title}</h2>
                  )}
                  {description && (
                    <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                  )}
                </div>
                {closable && onClose && (
                  <button
                    onClick={onClose}
                    className="ml-4 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            )}

            {/* Content */}
            <div className="px-5 pt-4 pb-6 sm:pb-5">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

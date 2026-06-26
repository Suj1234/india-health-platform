'use client'

import React, { useRef, useState, KeyboardEvent, ClipboardEvent } from 'react'
import { cn } from '@/lib/utils'

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  error?: boolean
  className?: string
}

export function OtpInput({ length = 6, value, onChange, onComplete, disabled, error, className }: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const digits = value.split('')

  function focusAt(idx: number) {
    inputRefs.current[idx]?.focus()
  }

  function handleChange(idx: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const newDigits = [...digits]
    newDigits[idx] = digit
    const newValue = newDigits.join('').slice(0, length)
    onChange(newValue)
    if (digit && idx < length - 1) focusAt(idx + 1)
    if (newValue.length === length) onComplete?.(newValue)
  }

  function handleKeyDown(idx: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace') {
      if (!digits[idx] && idx > 0) {
        const newDigits = [...digits]
        newDigits[idx - 1] = ''
        onChange(newDigits.join(''))
        focusAt(idx - 1)
      } else {
        const newDigits = [...digits]
        newDigits[idx] = ''
        onChange(newDigits.join(''))
      }
    } else if (e.key === 'ArrowLeft' && idx > 0) {
      focusAt(idx - 1)
    } else if (e.key === 'ArrowRight' && idx < length - 1) {
      focusAt(idx + 1)
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault()
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length)
    onChange(text)
    const nextIdx = Math.min(text.length, length - 1)
    focusAt(nextIdx)
  }

  return (
    <div className={cn('flex gap-2 justify-center', className)}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => { inputRefs.current[idx] = el }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digits[idx] ?? ''}
          onChange={(e) => handleChange(idx, e.target.value)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className={cn(
            'w-10 h-12 text-center text-xl font-bold rounded-xl border-2 transition-all duration-150',
            'focus:outline-none focus:border-primary-800 focus:ring-2 focus:ring-primary-800/20',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-destructive bg-destructive/5 focus:border-destructive focus:ring-destructive/20'
              : digits[idx]
              ? 'border-primary-800 bg-primary-50 text-primary-800'
              : 'border-border bg-white text-foreground'
          )}
        />
      ))}
    </div>
  )
}

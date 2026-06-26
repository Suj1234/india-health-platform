import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatLakhs(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)} L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`
  return `₹${amount}`
}

export function maskMobile(mobile: string): string {
  return mobile.slice(0, 2) + '****' + mobile.slice(-4)
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@')
  if (!local || !domain) return email
  return local.slice(0, 2) + '***@' + domain
}

export function maskPan(pan: string): string {
  return pan.slice(0, 5) + 'XXXXX'
}

export function calculateAge(dob: string): number {
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

export function calculateBmi(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100
  return parseFloat((weightKg / (heightM * heightM)).toFixed(2))
}

export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

export function generateApplicationNumber(year?: number, seq?: number): string {
  if (year !== undefined && seq !== undefined) {
    return `IH-${year}-${seq.toString().padStart(6, '0')}`
  }
  const y = new Date().getFullYear()
  const rand = Math.floor(Math.random() * 900000) + 100000
  return `IH-${y}-${rand}`
}

export function generatePolicyNumber(prefix?: string, year?: number, seq?: number): string {
  if (prefix !== undefined && year !== undefined && seq !== undefined) {
    return `${prefix}-${year}-${seq.toString().padStart(8, '0')}`
  }
  const now = new Date()
  const y = now.getFullYear()
  const rand = Math.floor(Math.random() * 90000000) + 10000000
  return `CS-${y}-${rand}`
}

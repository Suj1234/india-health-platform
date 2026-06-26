import { createHash, randomInt } from 'crypto'
import { db } from './db'
import { otpLogs } from './db/schema'
import { eq, and, gt, desc, count } from 'drizzle-orm'

export function generateOtp(): string {
  if (process.env.NODE_ENV !== 'production') return '123456'
  return randomInt(100000, 999999).toString()
}

export function hashOtp(otp: string, salt: string): string {
  return createHash('sha256').update(otp + salt).digest('hex')
}

export function makeOtpSalt(identifier: string): string {
  const minute = Math.floor(Date.now() / 60000)
  return identifier + minute
}

export async function checkRateLimit(mobile: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const result = await db
    .select({ total: count() })
    .from(otpLogs)
    .where(and(eq(otpLogs.mobile, mobile), gt(otpLogs.createdAt, oneHourAgo)))
  return (result[0]?.total ?? 0) < 50
}

export async function checkEmailRateLimit(email: string): Promise<boolean> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
  const result = await db
    .select({ total: count() })
    .from(otpLogs)
    .where(and(eq(otpLogs.email, email), gt(otpLogs.createdAt, oneHourAgo)))
  return (result[0]?.total ?? 0) < 50
}

export async function storeOtp({
  mobile,
  email,
  otp,
  purpose,
  applicationId,
}: {
  mobile?: string
  email?: string
  otp: string
  purpose: string
  applicationId?: string
}): Promise<string> {
  const identifier = email ?? mobile ?? 'unknown'
  const salt = makeOtpSalt(identifier)
  const otpHash = hashOtp(otp, salt)
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

  const [log] = await db
    .insert(otpLogs)
    .values({
      mobile: mobile ?? null,
      email: email ?? null,
      otpHash,
      purpose,
      applicationId: applicationId ?? null,
      expiresAt,
    })
    .returning()

  return log!.id
}

export async function verifyOtp({
  otpRefId,
  otp,
  mobile,
  email,
}: {
  otpRefId: string
  otp: string
  mobile?: string
  email?: string
}): Promise<{ valid: boolean; reason?: string }> {
  const [log] = await db.select().from(otpLogs).where(eq(otpLogs.id, otpRefId)).limit(1)

  if (!log) return { valid: false, reason: 'OTP not found' }
  if (!log.isValid) return { valid: false, reason: 'OTP is no longer valid' }
  if (log.usedAt) return { valid: false, reason: 'OTP already used' }
  if (new Date() > log.expiresAt) {
    await db.update(otpLogs).set({ isValid: false }).where(eq(otpLogs.id, otpRefId))
    return { valid: false, reason: 'OTP expired' }
  }

  const identifier = email ?? mobile ?? 'unknown'
  const newAttempts = log.attempts + 1
  const salt = makeOtpSalt(identifier)
  const submittedHash = hashOtp(otp, salt)

  if (submittedHash !== log.otpHash) {
    const invalid = newAttempts >= log.maxAttempts
    await db
      .update(otpLogs)
      .set({ attempts: newAttempts, isValid: !invalid })
      .where(eq(otpLogs.id, otpRefId))
    return {
      valid: false,
      reason: invalid ? 'Too many attempts. Please request a new OTP.' : 'Invalid OTP',
    }
  }

  await db
    .update(otpLogs)
    .set({ usedAt: new Date(), isValid: false, attempts: newAttempts })
    .where(eq(otpLogs.id, otpRefId))

  return { valid: true }
}

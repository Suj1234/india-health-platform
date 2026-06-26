import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import type { CustomerSession, StaffSession } from '@/types/application'

const CUSTOMER_SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? 'dev-jwt-secret-change-in-production')
const STAFF_SECRET = new TextEncoder().encode(process.env.NEXTAUTH_SECRET ?? 'dev-nextauth-secret-change-in-production')

const CUSTOMER_COOKIE = 'auth_token'
const STAFF_COOKIE = 'next-auth.session-token'

// ── Customer Auth ─────────────────────────────────────────────────────────────

export async function createCustomerToken(payload: Omit<CustomerSession, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(CUSTOMER_SECRET)
}

export async function verifyCustomerToken(tokenOrRequest: string | NextRequest): Promise<CustomerSession | null> {
  try {
    let token: string

    if (typeof tokenOrRequest === 'string') {
      token = tokenOrRequest
    } else {
      const cookie = tokenOrRequest.cookies.get(CUSTOMER_COOKIE)
      if (!cookie) return null
      token = cookie.value
    }

    const { payload } = await jwtVerify(token, CUSTOMER_SECRET)
    return payload as unknown as CustomerSession
  } catch {
    return null
  }
}

export async function getCustomerSession(): Promise<CustomerSession | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(CUSTOMER_COOKIE)?.value
    if (!token) return null
    return verifyCustomerToken(token)
  } catch {
    return null
  }
}

export function setCustomerCookie(token: string): { name: string; value: string; options: object } {
  return {
    name: CUSTOMER_COOKIE,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24, // 24 hours
      path: '/',
    },
  }
}

// ── Payment Link Token ────────────────────────────────────────────────────────

export async function createPaymentLinkToken({
  applicationId,
  uwDecision,
}: {
  applicationId: string
  uwDecision: string
}): Promise<string> {
  return new SignJWT({ application_id: applicationId, action: 'uw_resume', uw_decision: uwDecision })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(CUSTOMER_SECRET)
}

export async function verifyPaymentLinkToken(
  token: string
): Promise<{ application_id: string; uw_decision: string } | null> {
  try {
    const { payload } = await jwtVerify(token, CUSTOMER_SECRET)
    return {
      application_id: payload['application_id'] as string,
      uw_decision: payload['uw_decision'] as string,
    }
  } catch {
    return null
  }
}

// ── Staff Auth helpers (used by API route protection) ─────────────────────────

export async function createStaffToken(payload: Omit<StaffSession, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(STAFF_SECRET)
}

export async function getStaffSession(): Promise<StaffSession | null> {
  try {
    const cookieStore = await cookies()
    const token =
      cookieStore.get('next-auth.session-token')?.value ??
      cookieStore.get('__Secure-next-auth.session-token')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, STAFF_SECRET)
    return payload as unknown as StaffSession
  } catch {
    return null
  }
}

export async function getStaffSessionFromRequest(req: NextRequest): Promise<StaffSession | null> {
  try {
    const token = req.cookies.get(STAFF_COOKIE)?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, STAFF_SECRET)
    return payload as unknown as StaffSession
  } catch {
    return null
  }
}

// ── Response helpers ──────────────────────────────────────────────────────────

export function unauthorizedResponse() {
  return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 })
}

export function forbiddenResponse() {
  return Response.json({ success: false, error: 'Forbidden' }, { status: 403 })
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { createStaffToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const STAFF_COOKIE = 'next-auth.session-token'
const STAFF_ROLES = ['underwriter', 'insurer_admin', 'super_admin'] as const

function isStaffRole(role: string): role is (typeof STAFF_ROLES)[number] {
  return STAFF_ROLES.includes(role as (typeof STAFF_ROLES)[number])
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 400 })
    }

    const { email, password } = parsed.data

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (!user || !user.isActive || !user.passwordHash) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    if (!isStaffRole(user.role)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    const token = await createStaffToken({
      sub: user.id,
      email: user.email ?? email,
      name: user.name ?? '',
      role: user.role,
      insurer_id: user.insurerId ?? '',
    })

    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, user.id))

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        insurer_id: user.insurerId,
      },
    })

    response.cookies.set(STAFF_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8, // 8 hours
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[auth/staff/login] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

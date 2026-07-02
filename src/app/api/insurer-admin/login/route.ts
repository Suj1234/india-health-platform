import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, insurers } from '@/lib/db/schema'
import { createStaffToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  slug: z.string().min(1),
})

const STAFF_COOKIE = 'next-auth.session-token'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as unknown
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 400 })
    }

    const { email, password, slug } = parsed.data

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1)

    if (!user || !user.isActive || !user.passwordHash) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    if (!['insurer_admin', 'superadmin'].includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Invalid email or password' }, { status: 401 })
    }

    // Cross-tenant check: insurer_admin must belong to this slug's insurer
    const [insurer] = await db
      .select({ id: insurers.id, name: insurers.name, slug: insurers.slug, mode: insurers.mode })
      .from(insurers)
      .where(eq(insurers.slug, slug))
      .limit(1)

    if (!insurer) {
      return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })
    }

    if (user.role === 'insurer_admin' && user.insurerId !== insurer.id) {
      return NextResponse.json({ success: false, error: 'Access denied for this insurer' }, { status: 403 })
    }

    const token = await createStaffToken({
      sub: user.id,
      email: user.email ?? email,
      name: user.name ?? '',
      role: user.role as 'insurer_admin' | 'superadmin',
      insurer_id: user.role === 'superadmin' ? insurer.id : (user.insurerId ?? ''),
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
        insurer_id: user.role === 'superadmin' ? insurer.id : user.insurerId,
        mustChangePassword: user.mustChangePassword,
      },
    })

    response.cookies.set(STAFF_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 8,
      path: '/',
    })

    return response
  } catch (err) {
    console.error('[insurer-admin/login] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

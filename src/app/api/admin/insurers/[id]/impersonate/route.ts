import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users, insurers, impersonationSessions } from '@/lib/db/schema'
import { getStaffSessionFromRequest, createStaffToken } from '@/lib/auth'

const STAFF_COOKIE = 'next-auth.session-token'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id: insurerId } = await params

  const [insurer] = await db
    .select({ id: insurers.id, slug: insurers.slug, name: insurers.name })
    .from(insurers)
    .where(eq(insurers.id, insurerId))
    .limit(1)
  if (!insurer) return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })

  // Find first active insurer_admin for this insurer
  const [targetUser] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(and(eq(users.insurerId, insurerId), eq(users.role, 'insurer_admin'), eq(users.isActive, true)))
    .limit(1)

  if (!targetUser) {
    return NextResponse.json({ success: false, error: 'No active insurer_admin found for this insurer' }, { status: 404 })
  }

  const ipAddress = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? null

  const [impSession] = await db
    .insert(impersonationSessions)
    .values({
      superadminUserId: session.sub,
      targetUserId: targetUser.id,
      insurerId,
      ipAddress,
    })
    .returning()

  const token = await createStaffToken({
    sub: session.sub, // superadmin's real identity for audit
    email: targetUser.email ?? '',
    name: targetUser.name ?? '',
    role: 'insurer_admin',
    insurer_id: insurerId,
    impersonated_by: session.sub,
    impersonation_session_id: impSession!.id,
  })

  const response = NextResponse.json({
    success: true,
    redirectTo: `/i/${insurer.slug}/admin`,
    insurerName: insurer.name,
  })

  response.cookies.set(STAFF_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 2, // 2h impersonation session
    path: '/',
  })

  return response
}

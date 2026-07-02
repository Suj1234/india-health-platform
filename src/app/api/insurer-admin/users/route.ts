import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(200),
  role: z.enum(['insurer_admin', 'underwriter']),
  password: z.string().min(8),
  mustChangePassword: z.boolean().default(true),
})

export async function GET(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || !['insurer_admin', 'superadmin'].includes(session.role) || !session.insurer_id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      mustChangePassword: users.mustChangePassword,
      lastLoginAt: users.lastLoginAt,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(
      and(
        eq(users.insurerId, session.insurer_id),
        // insurer_admin can see both admins and underwriters
      )
    )
    .orderBy(users.createdAt)

  return NextResponse.json({ success: true, data: rows })
}

export async function POST(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  // insurer_admin can create users for their own insurer
  if (!session || !['insurer_admin', 'superadmin'].includes(session.role) || !session.insurer_id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as unknown
  const parsed = createUserSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { email, name, role, password, mustChangePassword } = parsed.data

  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email.toLowerCase()))
    .limit(1)
  if (existing) {
    return NextResponse.json({ success: false, error: 'Email already registered' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const [created] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      name,
      role,
      insurerId: session.insurer_id,
      passwordHash,
      mustChangePassword,
      isActive: true,
    })
    .returning()

  if (!created) return NextResponse.json({ success: false, error: 'Failed to create user' }, { status: 500 })
  return NextResponse.json({
    success: true,
    data: {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      isActive: created.isActive,
      mustChangePassword: created.mustChangePassword,
      lastLoginAt: created.lastLoginAt,
      createdAt: created.createdAt,
    },
  }, { status: 201 })
}

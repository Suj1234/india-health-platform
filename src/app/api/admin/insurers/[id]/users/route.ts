import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { insurers, users } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2).max(200),
  role: z.enum(['insurer_admin', 'underwriter']),
  password: z.string().min(8),
  mustChangePassword: z.boolean().default(true),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const [insurer] = await db.select({ id: insurers.id }).from(insurers).where(eq(insurers.id, id)).limit(1)
  if (!insurer) {
    return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })
  }

  const cols = {
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    isActive: users.isActive,
    mustChangePassword: users.mustChangePassword,
    lastLoginAt: users.lastLoginAt,
    createdAt: users.createdAt,
  }

  const [admins, underwriters] = await Promise.all([
    db.select(cols).from(users).where(and(eq(users.insurerId, id), eq(users.role, 'insurer_admin'))).orderBy(users.createdAt),
    db.select(cols).from(users).where(and(eq(users.insurerId, id), eq(users.role, 'underwriter'))).orderBy(users.createdAt),
  ])
  const rows = [...admins, ...underwriters]

  return NextResponse.json({ success: true, data: rows })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const [insurer] = await db.select({ id: insurers.id }).from(insurers).where(eq(insurers.id, id)).limit(1)
  if (!insurer) {
    return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })
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
    return NextResponse.json({ success: false, error: 'Email is already registered' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const rows = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      name,
      role,
      insurerId: id,
      passwordHash,
      mustChangePassword,
      isActive: true,
    })
    .returning()

  const created = rows[0]
  return NextResponse.json({
    success: true,
    data: created ? {
      id: created.id,
      email: created.email,
      name: created.name,
      role: created.role,
      isActive: created.isActive,
      mustChangePassword: created.mustChangePassword,
      lastLoginAt: created.lastLoginAt,
      createdAt: created.createdAt,
    } : null,
  }, { status: 201 })
}

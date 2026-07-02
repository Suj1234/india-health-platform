import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  email: z.string().email().optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['insurer_admin', 'underwriter']).optional(),
})

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
  mustChangePassword: z.boolean().default(true),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1)
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  if (user.role === 'superadmin') {
    return NextResponse.json({ success: false, error: 'Cannot modify superadmin via this endpoint' }, { status: 403 })
  }

  const body = await req.json() as unknown
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const setData = {
    updatedAt: new Date(),
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : undefined),
    ...(parsed.data.email !== undefined ? { email: parsed.data.email.toLowerCase() } : undefined),
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : undefined),
    ...(parsed.data.role !== undefined ? { role: parsed.data.role } : undefined),
  }

  const [updated] = await db
    .update(users)
    .set(setData)
    .where(eq(users.id, id))
    .returning()

  return NextResponse.json({ success: true, data: updated ? {
    id: updated.id,
    email: updated.email,
    name: updated.name,
    role: updated.role,
    isActive: updated.isActive,
    mustChangePassword: updated.mustChangePassword,
  } : null })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, id)).limit(1)
  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 })
  }

  if (user.role === 'superadmin') {
    return NextResponse.json({ success: false, error: 'Cannot reset superadmin password via this endpoint' }, { status: 403 })
  }

  const body = await req.json() as unknown
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword: parsed.data.mustChangePassword,
      updatedAt: new Date(),
    })
    .where(eq(users.id, id))

  return NextResponse.json({ success: true })
}

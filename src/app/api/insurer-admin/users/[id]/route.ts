import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  isActive: z.boolean().optional(),
  role: z.enum(['insurer_admin', 'underwriter']).optional(),
})

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
  mustChangePassword: z.boolean().default(true),
})

async function getAuthorizedUser(req: NextRequest, targetId: string) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || !['insurer_admin', 'superadmin'].includes(session.role) || !session.insurer_id) return null

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, targetId), eq(users.insurerId, session.insurer_id)))
    .limit(1)
  return user ?? null
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthorizedUser(req, id)
  if (!user) return NextResponse.json({ success: false, error: 'Forbidden or not found' }, { status: 403 })

  const body = await req.json() as unknown
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const setData = {
    updatedAt: new Date(),
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : undefined),
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : undefined),
    ...(parsed.data.role !== undefined ? { role: parsed.data.role } : undefined),
  }

  const [updated] = await db.update(users).set(setData).where(eq(users.id, id)).returning()
  return NextResponse.json({ success: true, data: updated ? { id: updated.id, isActive: updated.isActive, name: updated.name, role: updated.role } : null })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await getAuthorizedUser(req, id)
  if (!user) return NextResponse.json({ success: false, error: 'Forbidden or not found' }, { status: 403 })

  const body = await req.json() as unknown
  const parsed = resetPasswordSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
  await db.update(users).set({ passwordHash, mustChangePassword: parsed.data.mustChangePassword, updatedAt: new Date() }).where(eq(users.id, id))
  return NextResponse.json({ success: true })
}

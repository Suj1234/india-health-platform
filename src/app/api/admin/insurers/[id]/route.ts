import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { insurers } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'

const updateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  mode: z.enum(['test', 'live']).optional(),
  isActive: z.boolean().optional(),
  logoUrl: z.string().url().nullable().optional(),
  config: z.record(z.unknown()).optional(),
})

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const [insurer] = await db.select().from(insurers).where(eq(insurers.id, id)).limit(1)
  if (!insurer) {
    return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: insurer })
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const [existing] = await db.select().from(insurers).where(eq(insurers.id, id)).limit(1)
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })
  }

  const body = await req.json() as unknown
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const setData = {
    updatedAt: new Date(),
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : undefined),
    ...(parsed.data.mode !== undefined ? { mode: parsed.data.mode } : undefined),
    ...(parsed.data.isActive !== undefined ? { isActive: parsed.data.isActive } : undefined),
    ...(parsed.data.logoUrl !== undefined ? { logoUrl: parsed.data.logoUrl } : undefined),
    ...(parsed.data.config !== undefined
      ? { config: { ...(existing.config as Record<string, unknown>), ...parsed.data.config } }
      : undefined),
  }

  const [updated] = await db
    .update(insurers)
    .set(setData)
    .where(eq(insurers.id, id))
    .returning()

  return NextResponse.json({ success: true, data: updated })
}

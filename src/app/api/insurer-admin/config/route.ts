import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { insurers } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'

function getInsurerIdFromSession(session: Awaited<ReturnType<typeof getStaffSessionFromRequest>>) {
  if (!session) return null
  if (!['insurer_admin', 'superadmin'].includes(session.role)) return null
  return session.insurer_id
}

const configUpdateSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  config: z.record(z.unknown()).optional(),
  logoUrl: z.string().url().nullable().optional(),
})

export async function GET(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  const insurerId = getInsurerIdFromSession(session)
  if (!insurerId) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const [insurer] = await db.select().from(insurers).where(eq(insurers.id, insurerId)).limit(1)
  if (!insurer) return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })

  return NextResponse.json({ success: true, data: insurer })
}

export async function PUT(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  const insurerId = getInsurerIdFromSession(session)
  if (!insurerId) return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })

  const [existing] = await db.select().from(insurers).where(eq(insurers.id, insurerId)).limit(1)
  if (!existing) return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })

  const body = await req.json() as unknown
  const parsed = configUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const setData = {
    updatedAt: new Date(),
    ...(parsed.data.name !== undefined ? { name: parsed.data.name } : undefined),
    ...(parsed.data.logoUrl !== undefined ? { logoUrl: parsed.data.logoUrl } : undefined),
    ...(parsed.data.config !== undefined
      ? { config: { ...(existing.config as Record<string, unknown>), ...parsed.data.config } }
      : undefined),
  }

  const [updated] = await db
    .update(insurers)
    .set(setData)
    .where(eq(insurers.id, insurerId))
    .returning()

  return NextResponse.json({ success: true, data: updated })
}

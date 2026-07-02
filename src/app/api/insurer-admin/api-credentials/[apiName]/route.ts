import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { insurerApiCredentials } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'

const schema = z.object({
  credentials: z.record(z.string()),
  isActive: z.boolean().default(true),
})

export async function PUT(req: NextRequest, { params }: { params: Promise<{ apiName: string }> }) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || !['insurer_admin', 'superadmin'].includes(session.role) || !session.insurer_id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { apiName } = await params
  const body = await req.json() as unknown
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const [existing] = await db
    .select({ id: insurerApiCredentials.id })
    .from(insurerApiCredentials)
    .where(and(eq(insurerApiCredentials.insurerId, session.insurer_id), eq(insurerApiCredentials.apiName, apiName)))
    .limit(1)

  if (existing) {
    await db
      .update(insurerApiCredentials)
      .set({ credentials: parsed.data.credentials, isActive: parsed.data.isActive, updatedAt: new Date() })
      .where(eq(insurerApiCredentials.id, existing.id))
  } else {
    await db
      .insert(insurerApiCredentials)
      .values({
        insurerId: session.insurer_id,
        apiName,
        credentials: parsed.data.credentials,
        isActive: parsed.data.isActive,
      })
  }

  return NextResponse.json({ success: true })
}

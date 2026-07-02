import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'
import bcrypt from 'bcryptjs'

const schema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(req: NextRequest) {
  try {
    const session = await getStaffSessionFromRequest(req)
    if (!session || !['insurer_admin', 'superadmin'].includes(session.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json() as unknown
    const parsed = schema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12)
    await db
      .update(users)
      .set({ passwordHash, mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, session.sub))

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[insurer-admin/change-password] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

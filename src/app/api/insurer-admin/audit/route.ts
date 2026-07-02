import { NextRequest, NextResponse } from 'next/server'
import { desc, eq, and, gte, lte } from 'drizzle-orm'
import { db } from '@/lib/db'
import { auditLogs, users } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || !['insurer_admin', 'superadmin'].includes(session.role) || !session.insurer_id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const action = searchParams.get('action')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const perPage = 50

  const conditions = [eq(auditLogs.insurerId, session.insurer_id)]
  if (action) conditions.push(eq(auditLogs.action, action))
  if (from) conditions.push(gte(auditLogs.createdAt, new Date(from)))
  if (to) conditions.push(lte(auditLogs.createdAt, new Date(to)))

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      fieldChanged: auditLogs.fieldChanged,
      oldValue: auditLogs.oldValue,
      newValue: auditLogs.newValue,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
      actorName: users.name,
      actorEmail: users.email,
      actorRole: auditLogs.actorRole,
    })
    .from(auditLogs)
    .leftJoin(users, eq(users.id, auditLogs.actorUserId))
    .where(and(...conditions))
    .orderBy(desc(auditLogs.createdAt))
    .limit(perPage)
    .offset((page - 1) * perPage)

  return NextResponse.json({ success: true, data: rows, page, perPage })
}

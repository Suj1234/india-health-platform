import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { impersonationSessions } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  if (!session?.impersonation_session_id) {
    return NextResponse.json({ success: false, error: 'Not in impersonation session' }, { status: 400 })
  }

  await db
    .update(impersonationSessions)
    .set({ endedAt: new Date(), endReason: 'user_exit' })
    .where(eq(impersonationSessions.id, session.impersonation_session_id))

  const response = NextResponse.json({ success: true, redirectTo: '/superadmin' })
  response.cookies.delete('next-auth.session-token')
  response.cookies.delete('__Secure-next-auth.session-token')
  return response
}

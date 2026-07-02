import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { insurerApiCredentials } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'

function maskValue(val: unknown): unknown {
  if (typeof val === 'string' && val.length > 4) {
    return val.slice(0, 4) + '••••••••'
  }
  return val
}

function maskCredentials(creds: Record<string, unknown>): Record<string, unknown> {
  const masked: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(creds)) {
    if (typeof v === 'string') {
      masked[k] = maskValue(v)
    } else {
      masked[k] = v
    }
  }
  return masked
}

const API_NAMES = ['iadore', 'iadore_consolidated', 'karza_tkyc', 'karza_ocr', 'karza_mobile_otp', 'pmw', 'quotes', 'nuralx', 'pivc', 'stp'] as const

export async function GET(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || !['insurer_admin', 'superadmin'].includes(session.role) || !session.insurer_id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({
      id: insurerApiCredentials.id,
      apiName: insurerApiCredentials.apiName,
      credentials: insurerApiCredentials.credentials,
      isActive: insurerApiCredentials.isActive,
      updatedAt: insurerApiCredentials.updatedAt,
    })
    .from(insurerApiCredentials)
    .where(eq(insurerApiCredentials.insurerId, session.insurer_id))

  // Build a full list showing all APIs, marking which are configured
  const configured = new Map(rows.map((r) => [r.apiName, r]))

  const result = API_NAMES.map((apiName) => {
    const row = configured.get(apiName)
    return {
      apiName,
      configured: !!row?.isActive,
      credentials: row ? maskCredentials(row.credentials as Record<string, unknown>) : null,
      updatedAt: row?.updatedAt ?? null,
    }
  })

  return NextResponse.json({ success: true, data: result })
}

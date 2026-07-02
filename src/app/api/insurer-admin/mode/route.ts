import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { insurers } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'
import type { InsurerConfig } from '@/types/insurer'

const schema = z.object({
  mode: z.enum(['test', 'live']),
})

interface PreflightResult {
  canSwitch: boolean
  blockers: string[]
  warnings: string[]
}

function runPreflight(insurer: typeof insurers.$inferSelect, targetMode: 'test' | 'live'): PreflightResult {
  if (targetMode === 'test') {
    return { canSwitch: true, blockers: [], warnings: [] }
  }

  const config = (insurer.config ?? {}) as Partial<InsurerConfig>
  const blockers: string[] = []
  const warnings: string[] = []

  if (!config.irdai_registration) blockers.push('IRDAI Registration number is required for live mode')
  if (!config.gstin) blockers.push('GSTIN is required for live mode')
  if (!config.registered_office_address) blockers.push('Registered office address is required for live mode')
  if (!config.contact_email) blockers.push('Contact email is required for live mode')
  if (!config.contact_phone) blockers.push('Contact phone is required for live mode')
  if (!config.grievance_email) blockers.push('Grievance email is required for live mode')
  if (!config.sum_insured_options?.length) blockers.push('At least one sum insured option must be configured')
  if (!config.policy_number_prefix) blockers.push('Policy number prefix is required for live mode')

  if (!config.logo_url) warnings.push('No logo uploaded — customer portal will show a placeholder')

  return {
    canSwitch: blockers.length === 0,
    blockers,
    warnings,
  }
}

export async function PUT(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || !['insurer_admin', 'superadmin'].includes(session.role) || !session.insurer_id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as unknown
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Invalid mode value' }, { status: 400 })
  }

  const [insurer] = await db.select().from(insurers).where(eq(insurers.id, session.insurer_id)).limit(1)
  if (!insurer) return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })

  if (insurer.mode === parsed.data.mode) {
    return NextResponse.json({ success: true, data: { mode: insurer.mode }, message: 'Already in this mode' })
  }

  const preflight = runPreflight(insurer, parsed.data.mode)
  if (!preflight.canSwitch) {
    return NextResponse.json({ success: false, error: 'Pre-flight check failed', blockers: preflight.blockers }, { status: 422 })
  }

  const [updated] = await db
    .update(insurers)
    .set({ mode: parsed.data.mode, updatedAt: new Date() })
    .where(eq(insurers.id, session.insurer_id))
    .returning()

  return NextResponse.json({ success: true, data: { mode: updated?.mode }, warnings: preflight.warnings })
}

// GET endpoint for pre-flight check without actually switching
export async function GET(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || !['insurer_admin', 'superadmin'].includes(session.role) || !session.insurer_id) {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const targetMode = searchParams.get('target') as 'test' | 'live' | null

  const [insurer] = await db.select().from(insurers).where(eq(insurers.id, session.insurer_id)).limit(1)
  if (!insurer) return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })

  const preflight = runPreflight(insurer, targetMode ?? 'live')
  return NextResponse.json({ success: true, currentMode: insurer.mode, preflight })
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { count, eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { insurers, users } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'
import type { InsurerConfig } from '@/types/insurer'

const RESERVED_SLUGS = new Set(['admin', 'api', 'www', 'superadmin', 'i', 'underwriter', 'policy', 'payment', 'apply'])

const createSchema = z.object({
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  name: z.string().min(2).max(200),
  mode: z.enum(['test', 'live']).default('test'),
})

function defaultConfig(name: string): InsurerConfig {
  return {
    primary_color: '#0d9488',
    secondary_color: '#134e4a',
    contact_email: '',
    contact_phone: '',
    website: '',
    grievance_email: '',
    grievance_phone: '',
    irdai_registration: '',
    cin: '',
    gstin: '',
    registered_office_address: '',
    financial_docs_threshold_sum_insured: 500000,
    biometric_threshold_sum_insured: 1000000,
    stp_auto_biometric_age: 55,
    payment_expiry_hours_stp: 24,
    payment_expiry_days_uw: 7,
    skip_needs_analysis: true,
    skip_pivc: true,
    skip_nuralx: false,
    require_voter_or_passport: false,
    policy_number_prefix: 'POL',
    policy_duration_months: 12,
    free_look_days: 15,
    sum_insured_options: [300000, 500000, 750000, 1000000],
    standard_exclusions: [],
    email_sender_name: name,
    email_reply_to: '',
    available_riders: [],
    font_family: 'Inter',
  }
}

export async function GET(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const rows = await db
    .select({
      id: insurers.id,
      slug: insurers.slug,
      name: insurers.name,
      mode: insurers.mode,
      isActive: insurers.isActive,
      logoUrl: insurers.logoUrl,
      createdAt: insurers.createdAt,
      updatedAt: insurers.updatedAt,
      userCount: count(users.id),
    })
    .from(insurers)
    .leftJoin(users, eq(users.insurerId, insurers.id))
    .groupBy(
      insurers.id,
      insurers.slug,
      insurers.name,
      insurers.mode,
      insurers.isActive,
      insurers.logoUrl,
      insurers.createdAt,
      insurers.updatedAt,
    )
    .orderBy(insurers.createdAt)

  return NextResponse.json({ success: true, data: rows })
}

export async function POST(req: NextRequest) {
  const session = await getStaffSessionFromRequest(req)
  if (!session || session.role !== 'superadmin') {
    return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json() as unknown
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message ?? 'Invalid input' }, { status: 400 })
  }

  const { slug, name, mode } = parsed.data

  if (RESERVED_SLUGS.has(slug)) {
    return NextResponse.json({ success: false, error: `"${slug}" is a reserved slug` }, { status: 400 })
  }

  const [existing] = await db.select({ id: insurers.id }).from(insurers).where(eq(insurers.slug, slug)).limit(1)
  if (existing) {
    return NextResponse.json({ success: false, error: 'Slug is already taken' }, { status: 409 })
  }

  const [created] = await db
    .insert(insurers)
    .values({ slug, name, mode, config: defaultConfig(name) })
    .returning()

  return NextResponse.json({ success: true, data: created }, { status: 201 })
}

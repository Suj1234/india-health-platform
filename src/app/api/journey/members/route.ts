import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import type { InsuredMember } from '@/types/application'

interface MemberContext {
  member_id: string
  name: string
  relation: string
  gender?: 'male' | 'female' | 'other'
  dob?: string
  is_proposer: boolean
  needs_scan: boolean
}

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db
      .select({
        name: applications.name,
        dob: applications.dob,
        gender: applications.gender,
        coverType: applications.coverType,
        proposerIsInsured: applications.proposerIsInsured,
        membersData: applications.membersData,
      })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    const coverType = app.coverType ?? 'individual'
    const storedMembers = (app.membersData as InsuredMember[] | null) ?? []
    const members: MemberContext[] = []

    // Add proposer only if they are an insured member (individual / family floater)
    if (app.proposerIsInsured !== false) {
      members.push({
        member_id: 'proposer',
        name: app.name ?? 'You',
        relation: 'self',
        gender: (app.gender as MemberContext['gender']) ?? undefined,
        dob: app.dob ?? undefined,
        is_proposer: true,
        needs_scan: true,  // NuralX scan only for proposer when proposer_is_insured
      })
    }

    // Add insured members (family: spouse + children; parents: father + mother)
    for (const m of storedMembers) {
      members.push({
        member_id: m.member_id,
        name: m.name,
        relation: m.relation,
        gender: m.gender,
        dob: m.dob,
        is_proposer: false,
        needs_scan: false,
      })
    }

    return NextResponse.json({ success: true, members, cover_type: coverType })
  } catch (err) {
    console.error('[journey/members] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

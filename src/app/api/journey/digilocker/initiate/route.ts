import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, digilockerSessions } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI, getInsurerBySlug } from '@/lib/api-router'
import { generateDigilockerLink } from '@/lib/external/perfios-digilocker'
import { mockPerfiosDigilockerLink } from '@/lib/mock/perfios-digilocker.mock'
import type { InsuredMember } from '@/types/application'
import type { PerfiosCredentials } from '@/types/insurer'

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { member_id?: string; doc_type?: string; slug?: string }
    const { member_id, doc_type, slug } = body

    if (!member_id) return NextResponse.json({ success: false, error: 'member_id required' }, { status: 400 })
    if (!doc_type || !['ADHAR', 'PANCR'].includes(doc_type))
      return NextResponse.json({ success: false, error: 'doc_type must be ADHAR or PANCR' }, { status: 400 })
    if (!slug) return NextResponse.json({ success: false, error: 'slug required' }, { status: 400 })

    const [app] = await db
      .select({
        id: applications.id,
        insurerId: applications.insurerId,
        coverType: applications.coverType,
        membersData: applications.membersData,
      })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    // Validate member belongs to this application
    const storedMembers = (app.membersData as InsuredMember[] | null) ?? []
    const member = storedMembers.find((m) => m.member_id === member_id)
    if (!member) return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 })

    // DigiLocker not allowed for parents plan members (UIDAI compliance)
    if (app.coverType === 'parents' && ['father', 'mother'].includes(member.relation)) {
      return NextResponse.json(
        { success: false, error: 'DigiLocker is not available for parents plan members' },
        { status: 400 }
      )
    }

    // Build redirect URL — back to same step with query params
    const host = req.headers.get('host') ?? 'localhost:3000'
    const proto = process.env.NODE_ENV === 'production' ? 'https' : 'http'
    const redirectUrl = `${proto}://${host}/i/${slug}/apply/6?dl_member=${member_id}&dl_doc=${doc_type}`

    // Call Perfios DigiLocker link API
    const perfiosCreds: PerfiosCredentials = {
      base_url: process.env.PERFIOS_BASE_URL ?? 'https://api-in-uat.perfios.com',
      api_key:  process.env.PERFIOS_API_KEY  ?? '',
    }

    const { link, requestId } = await callExternalAPI({
      insurerId: app.insurerId,
      apiName: 'perfios_digilocker',
      applicationId: session.application_id,
      realFn: () => generateDigilockerLink(perfiosCreds, {
        redirectUrl,
        docType: doc_type as 'ADHAR' | 'PANCR',
        caseId: session.application_id,
      }),
      mockFn: () => mockPerfiosDigilockerLink({
        docType: doc_type as 'ADHAR' | 'PANCR',
        caseId: session.application_id,
      }),
    })

    // Delete any existing pending session for same member + docType
    await db
      .delete(digilockerSessions)
      .where(
        and(
          eq(digilockerSessions.applicationId, session.application_id),
          eq(digilockerSessions.memberId, member_id),
          eq(digilockerSessions.docType, doc_type),
        )
      )

    // Save new session (15-minute expiry)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    await db.insert(digilockerSessions).values({
      applicationId: session.application_id,
      memberId: member_id,
      requestId,
      docType: doc_type,
      expiresAt,
    })

    return NextResponse.json({ success: true, data: { link } })
  } catch (err) {
    console.error('[digilocker/initiate] Error:', err)
    return NextResponse.json({ success: false, error: 'Failed to generate DigiLocker link' }, { status: 500 })
  }
}

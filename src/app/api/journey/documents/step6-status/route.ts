import { NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, memberDocuments } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import type { InsuredMember } from '@/types/application'

export async function GET() {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db
      .select({
        coverType: applications.coverType,
        proposerIsInsured: applications.proposerIsInsured,
        membersData: applications.membersData,
      })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    const storedMembers = (app.membersData as InsuredMember[] | null) ?? []

    const savedDocs = await db
      .select()
      .from(memberDocuments)
      .where(eq(memberDocuments.applicationId, session.application_id))

    // Build a map: memberId → { docType, uploads: { front?, back?, single? } }
    type DocEntry = {
      doc_type: string
      upload_method: string
      side: string
      cloudinary_url: string | null
      ocr_name: string | null
      ocr_dob: string | null
      ocr_doc_number: string | null
      ocr_address: unknown
      validation_status: string
      quality_flags: string[] | null
    }
    const byMember: Record<string, DocEntry[]> = {}
    for (const doc of savedDocs) {
      if (!byMember[doc.memberId]) byMember[doc.memberId] = []
      byMember[doc.memberId]!.push({
        doc_type: doc.docType,
        upload_method: doc.uploadMethod,
        side: doc.side,
        cloudinary_url: doc.cloudinaryUrl,
        ocr_name: doc.ocrName ?? null,
        ocr_dob: doc.ocrDob ?? null,
        ocr_doc_number: doc.ocrDocNumber ?? null,
        ocr_address: doc.ocrAddress,
        validation_status: doc.validationStatus,
        quality_flags: doc.qualityFlags ?? null,
      })
    }

    const members = storedMembers.map((m) => ({
      member_id: m.member_id,
      name: m.name,
      relation: m.relation,
      gender: m.gender,
      dob: m.dob,
      is_proposer: false,
      docs: byMember[m.member_id] ?? [],
    }))

    return NextResponse.json({
      success: true,
      cover_type: app.coverType,
      members,
    })
  } catch (err) {
    console.error('[documents/step6-status] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

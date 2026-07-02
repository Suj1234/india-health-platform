import { NextRequest, NextResponse } from 'next/server'
import { eq, and, gt } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, digilockerSessions, memberDocuments } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI } from '@/lib/api-router'
import {
  listDigilockerDocuments,
  downloadDigilockerDocument,
} from '@/lib/external/perfios-digilocker'
import {
  mockPerfiosDigilockerDocuments,
  mockPerfiosDigilockerDownloadAadhaar,
  mockPerfiosDigilockerDownloadPan,
} from '@/lib/mock/perfios-digilocker.mock'
import type { InsuredMember } from '@/types/application'
import type { PerfiosCredentials } from '@/types/insurer'

function namesMatch(storedName: string, ocrName: string): boolean {
  const norm = (s: string) => s.toUpperCase().trim().split(/\s+/).filter(Boolean)
  const stored = norm(storedName)
  const ocr    = norm(ocrName)
  return stored.filter((w) => ocr.includes(w)).length >= Math.ceil(stored.length / 2)
}

function dobsMatch(storedDob: string, parsedDob: string): boolean {
  // Perfios returns YYYY-MM-DD, stored is YYYY-MM-DD
  return storedDob === parsedDob
}

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { member_id?: string; doc_type?: string }
    const { member_id, doc_type } = body

    if (!member_id) return NextResponse.json({ success: false, error: 'member_id required' }, { status: 400 })
    if (!doc_type || !['ADHAR', 'PANCR'].includes(doc_type))
      return NextResponse.json({ success: false, error: 'doc_type must be ADHAR or PANCR' }, { status: 400 })

    const [app] = await db
      .select({
        id: applications.id,
        insurerId: applications.insurerId,
        membersData: applications.membersData,
      })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    // Look up pending DigiLocker session (not expired)
    const now = new Date()
    const [dlSession] = await db
      .select()
      .from(digilockerSessions)
      .where(
        and(
          eq(digilockerSessions.applicationId, session.application_id),
          eq(digilockerSessions.memberId, member_id),
          eq(digilockerSessions.docType, doc_type),
          gt(digilockerSessions.expiresAt, now),
        )
      )
      .limit(1)

    if (!dlSession) {
      return NextResponse.json(
        { success: false, error: 'DigiLocker session expired or not found. Please try again.' },
        { status: 400 }
      )
    }

    // Resolve stored member for validation
    const storedMembers = (app.membersData as InsuredMember[] | null) ?? []
    const member = storedMembers.find((m) => m.member_id === member_id)

    const perfiosCreds: PerfiosCredentials = {
      base_url: process.env.PERFIOS_BASE_URL ?? 'https://api-in-uat.perfios.com',
      api_key:  process.env.PERFIOS_API_KEY  ?? '',
    }

    // Step 1: List available documents in user's DigiLocker
    const docs = await callExternalAPI({
      insurerId: app.insurerId,
      apiName: 'perfios_digilocker',
      applicationId: session.application_id,
      realFn: () => listDigilockerDocuments(perfiosCreds, {
        requestId: dlSession.requestId,
        caseId: session.application_id,
      }),
      mockFn: () => Promise.resolve(mockPerfiosDigilockerDocuments()),
    })

    // Find the requested document type
    const targetDoc = docs.find((d) => d.doctype === doc_type)
    if (!targetDoc) {
      return NextResponse.json(
        { success: false, error: `${doc_type === 'ADHAR' ? 'Aadhaar' : 'PAN'} not found in DigiLocker` },
        { status: 422 }
      )
    }

    // Step 2: Download + parse the document
    const downloadResult = await callExternalAPI({
      insurerId: app.insurerId,
      apiName: 'perfios_digilocker',
      applicationId: session.application_id,
      realFn: () => downloadDigilockerDocument(perfiosCreds, {
        requestId: dlSession.requestId,
        uri: targetDoc.uri,
        caseId: session.application_id,
      }),
      mockFn: () => Promise.resolve(
        doc_type === 'PANCR'
          ? mockPerfiosDigilockerDownloadPan({ memberName: member?.name, memberDob: member?.dob })
          : mockPerfiosDigilockerDownloadAadhaar({ memberName: member?.name, memberDob: member?.dob })
      ),
    })

    const parsedData = downloadResult.parsedFile.data
    const issuedTo   = parsedData.issuedTo

    const ocrName      = issuedTo.name      ?? null
    const ocrDob       = issuedTo.dob       ?? null
    const ocrDocNumber = parsedData.number  ?? issuedTo.uid ?? null
    const ocrAddress   = issuedTo.address   ?? null
    const docTypeLower = doc_type === 'ADHAR' ? 'aadhaar' : 'pan'

    // Validate
    let validationStatus = 'pending'
    if (ocrName && ocrDob && member?.name && member?.dob) {
      const nameOk = namesMatch(member.name, ocrName)
      const dobOk  = dobsMatch(member.dob, ocrDob)
      validationStatus = (nameOk && dobOk) ? 'match' : 'mismatch'
    }

    // Delete any existing DigiLocker record for same member + docType
    await db
      .delete(memberDocuments)
      .where(
        and(
          eq(memberDocuments.applicationId, session.application_id),
          eq(memberDocuments.memberId, member_id),
          eq(memberDocuments.docType, docTypeLower),
          eq(memberDocuments.uploadMethod, 'digilocker'),
        )
      )

    // Save to member_documents
    const [saved] = await db
      .insert(memberDocuments)
      .values({
        applicationId: session.application_id,
        memberId: member_id,
        memberRole: member?.relation ?? null,
        docType: docTypeLower,
        uploadMethod: 'digilocker',
        side: 'single',
        ocrRaw: downloadResult as unknown as Record<string, unknown>,
        ocrName,
        ocrDob,
        ocrDocNumber,
        ocrAddress: ocrAddress as Record<string, unknown> ?? undefined,
        validationStatus,
      })
      .returning()

    // Clean up session
    await db
      .delete(digilockerSessions)
      .where(eq(digilockerSessions.id, dlSession.id))

    return NextResponse.json({
      success: true,
      data: {
        document_id: saved!.id,
        ocr_name: ocrName,
        ocr_dob: ocrDob,
        ocr_doc_number: ocrDocNumber,
        ocr_address: ocrAddress,
        validation_status: validationStatus,
      },
    })
  } catch (err) {
    console.error('[digilocker/complete] Error:', err)
    return NextResponse.json({ success: false, error: 'Failed to retrieve DigiLocker document' }, { status: 500 })
  }
}

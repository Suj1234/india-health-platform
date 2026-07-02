import { NextRequest, NextResponse } from 'next/server'
import { eq, and } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, memberDocuments } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { uploadDocument } from '@/lib/cloudinary'
import { callExternalAPI, getInsurerById } from '@/lib/api-router'
import { ocrPlusKyc } from '@/lib/external/karza'
import { mockKarzaOcrPlusPan, mockKarzaOcrPlusAadhaarFront, mockKarzaOcrPlusAadhaarBack } from '@/lib/mock/karza.mock'
import type { InsuredMember } from '@/types/application'
import type { KarzaCredentials } from '@/types/insurer'
import type { KarzaOcrPlusDocument } from '@/lib/external/karza'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

// ── Name fuzzy match ──────────────────────────────────────────────────────────

function normaliseWords(name: string): string[] {
  return name.toUpperCase().trim().split(/\s+/).filter(Boolean)
}

function namesMatch(storedName: string, ocrName: string): boolean {
  const stored = normaliseWords(storedName)
  const ocr    = normaliseWords(ocrName)
  const overlap = stored.filter((w) => ocr.includes(w))
  // At least half the stored name words must appear in the OCR name
  return overlap.length >= Math.ceil(stored.length / 2)
}

function dobsMatch(storedDob: string, ocrDob: string): boolean {
  // Stored: YYYY-MM-DD, OCR: DD/MM/YYYY or YYYY-MM-DD
  const normalise = (d: string) => {
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(d)) {
      const [dd, mm, yyyy] = d.split('/')
      return `${yyyy}-${mm}-${dd}`
    }
    return d
  }
  return normalise(storedDob) === normalise(ocrDob)
}

// ── Extract structured fields from Karza OCR document ────────────────────────

function extractFromOcrDoc(doc: KarzaOcrPlusDocument): {
  name: string | null
  dob:  string | null
  docNumber: string | null
  address: Record<string, string> | null
} {
  const { ocrData, documentType } = doc
  const isAadhaarBack = documentType === 'AADHAAR_BACK'

  if (isAadhaarBack) {
    return {
      name: null,
      dob: null,
      docNumber: null,
      address: {
        full: ocrData.address?.value ?? '',
        pincode: ocrData.pincode?.value ?? '',
        state: ocrData.state?.value ?? '',
        district: ocrData.district?.value ?? '',
      },
    }
  }

  return {
    name:      ocrData.name?.value ?? null,
    dob:       ocrData.dob?.value  ?? null,
    docNumber: ocrData.pan?.value  ?? ocrData.uid?.value ?? null,
    address:   null,
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file      = formData.get('file')      as File | null
    const memberId  = formData.get('member_id') as string | null
    const docType   = formData.get('doc_type')  as string | null  // 'aadhaar' | 'pan'
    const side      = formData.get('side')      as string | null  // 'front' | 'back' | 'single'

    if (!file)      return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    if (!memberId)  return NextResponse.json({ success: false, error: 'member_id required' }, { status: 400 })
    if (!docType || !['aadhaar', 'pan'].includes(docType))
      return NextResponse.json({ success: false, error: 'doc_type must be aadhaar or pan' }, { status: 400 })
    if (!side || !['front', 'back', 'single'].includes(side))
      return NextResponse.json({ success: false, error: 'side must be front, back, or single' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type))
      return NextResponse.json({ success: false, error: 'Invalid file type. Allowed: PDF, JPG, PNG' }, { status: 400 })
    if (file.size > MAX_SIZE)
      return NextResponse.json({ success: false, error: 'File too large. Maximum 10MB' }, { status: 400 })

    // Load application + insurer
    const [app] = await db
      .select({
        id: applications.id,
        insurerId: applications.insurerId,
        membersData: applications.membersData,
        coverType: applications.coverType,
        name: applications.name,
        dob: applications.dob,
      })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    // Resolve stored member name + dob for validation
    const storedMembers = (app.membersData as InsuredMember[] | null) ?? []
    let storedName: string | null = null
    let storedDob:  string | null = null
    let memberRole: string | null = null

    const matchedMember = storedMembers.find((m) => m.member_id === memberId)
    if (matchedMember) {
      storedName = matchedMember.name
      storedDob  = matchedMember.dob
      memberRole = matchedMember.relation
    }

    // Upload to Cloudinary
    const insurer = await getInsurerById(app.insurerId)
    const insurerSlug = insurer?.slug ?? 'default'
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadResult = await uploadDocument({
      fileBuffer: buffer,
      insurerSlug,
      applicationId: session.application_id,
      documentType: `member_${docType}_${side}`,
      mimeType: file.type,
    })

    // Call Karza OCR Plus via api-router
    const karzaCreds: KarzaCredentials = {
      base_url: process.env.KARZA_BASE_URL ?? 'https://testapi.karza.in',
      api_key:  process.env.KARZA_API_KEY  ?? '',
    }

    const ocrResponse = await callExternalAPI({
      insurerId: app.insurerId,
      apiName: 'karza_ocr_plus',
      applicationId: session.application_id,
      realFn: () => ocrPlusKyc(karzaCreds, {
        fileBuffer: buffer,
        mimeType: file.type,
        applicationId: session.application_id,
      }),
      mockFn: () => {
        if (docType === 'pan') return mockKarzaOcrPlusPan({ memberName: storedName ?? undefined, memberDob: storedDob ?? undefined })
        if (side === 'back')  return mockKarzaOcrPlusAadhaarBack()
        return mockKarzaOcrPlusAadhaarFront({ memberName: storedName ?? undefined, memberDob: storedDob ?? undefined })
      },
    })

    const ocrDoc = ocrResponse.result.documents[0]
    if (!ocrDoc) {
      return NextResponse.json({ success: false, error: 'OCR returned no document' }, { status: 422 })
    }

    const extracted = extractFromOcrDoc(ocrDoc)

    // Quality flags
    const qualityFlags = (ocrDoc.qualityChecks ?? [])
      .filter((q) => q.flag)
      .map((q) => q.type)

    // Validate name + dob (skip for back side — has no name/dob)
    let validationStatus = 'pending'
    if (extracted.name && extracted.dob && storedName && storedDob) {
      const nameOk = namesMatch(storedName, extracted.name)
      const dobOk  = dobsMatch(storedDob, extracted.dob)
      validationStatus = (nameOk && dobOk) ? 'match' : 'mismatch'
    } else if (side === 'back') {
      validationStatus = 'match' // back side has no identity fields to validate
    }

    // Delete any existing record for same member + docType + side (re-upload)
    await db
      .delete(memberDocuments)
      .where(
        and(
          eq(memberDocuments.applicationId, session.application_id),
          eq(memberDocuments.memberId, memberId),
          eq(memberDocuments.docType, docType),
          eq(memberDocuments.side, side),
        )
      )

    // Save to member_documents
    const [saved] = await db
      .insert(memberDocuments)
      .values({
        applicationId: session.application_id,
        memberId,
        memberRole,
        docType,
        uploadMethod: 'manual',
        side,
        cloudinaryPublicId: uploadResult.public_id,
        cloudinaryUrl: uploadResult.secure_url,
        fileName: file.name,
        fileSizeBytes: file.size,
        mimeType: file.type,
        ocrRaw: ocrResponse as unknown as Record<string, unknown>,
        ocrName: extracted.name ?? undefined,
        ocrDob:  extracted.dob  ?? undefined,
        ocrDocNumber: extracted.docNumber ?? undefined,
        ocrAddress: extracted.address as Record<string, unknown> ?? undefined,
        validationStatus,
        qualityFlags: qualityFlags.length > 0 ? qualityFlags : null,
      })
      .returning()

    return NextResponse.json({
      success: true,
      data: {
        document_id: saved!.id,
        cloudinary_url: uploadResult.secure_url,
        ocr_name: extracted.name,
        ocr_dob:  extracted.dob,
        ocr_doc_number: extracted.docNumber,
        ocr_address: extracted.address,
        validation_status: validationStatus,
        quality_flags: qualityFlags,
        detected_doc_type: ocrDoc.documentType,
      },
    })
  } catch (err) {
    console.error('[documents/ocr] Error:', err)
    return NextResponse.json({ success: false, error: 'OCR processing failed' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, documents } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { uploadDocument } from '@/lib/cloudinary'
import { getInsurerBySlug } from '@/lib/api-router'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const document_type = formData.get('document_type') as string
    const category = (formData.get('category') as string) ?? 'kyc'
    const member_role = (formData.get('member_role') as string | null) ?? null   // e.g. 'spouse', 'father'
    const member_id   = (formData.get('member_id')   as string | null) ?? null   // member's unique ID

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    if (!document_type) return NextResponse.json({ success: false, error: 'document_type required' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Allowed: PDF, JPG, PNG' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum 10MB' }, { status: 400 })
    }

    const [app] = await db
      .select({ id: applications.id, insurerId: applications.insurerId })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app) return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const insurerSlug = 'careshield-india' // fallback
    const uploadResult = await uploadDocument({
      fileBuffer: buffer,
      insurerSlug,
      applicationId: session.application_id,
      documentType: document_type,
      mimeType: file.type,
    })

    const [doc] = await db
      .insert(documents)
      .values({
        applicationId: session.application_id,
        documentType: document_type,
        category,
        fileName: file.name,
        cloudinaryPublicId: uploadResult.public_id,
        cloudinaryUrl: uploadResult.secure_url,
        fileSizeBytes: file.size,
        mimeType: file.type,
        ocrStatus: 'pending',
        belongsToRole: member_role ?? (member_id ? member_id.slice(0, 30) : null),
      })
      .returning()

    return NextResponse.json({
      success: true,
      document_id: doc!.id,
      url: uploadResult.secure_url,
      ocr_status: 'queued',
    })
  } catch (err) {
    console.error('[documents/upload] Error:', err)
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
  }
}

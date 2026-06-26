import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, documents } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'

export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    // Verify at least one aadhaar_front and one aadhaar_back exist for insured members
    const uploadedDocs = await db
      .select({ documentType: documents.documentType, belongsToRole: documents.belongsToRole })
      .from(documents)
      .where(eq(documents.applicationId, session.application_id))

    const hasFront = uploadedDocs.some((d) => d.documentType === 'aadhaar_front')
    const hasBack  = uploadedDocs.some((d) => d.documentType === 'aadhaar_back')

    if (!hasFront || !hasBack) {
      return NextResponse.json({
        success: false,
        error: 'Aadhaar front and back are required for all insured members',
      }, { status: 400 })
    }

    await db
      .update(applications)
      .set({ status: 'docs_uploaded', currentStep: 7, updatedAt: new Date() })
      .where(eq(applications.id, session.application_id))

    return NextResponse.json({ success: true, docs_complete: true, next_step: 11 })
  } catch (err) {
    console.error('[documents/finalize] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

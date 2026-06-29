import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, policies } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return new NextResponse('Unauthorized', { status: 401 })

    const [app] = await db
      .select()
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!app || app.status !== 'policy_issued' || !app.policyId) {
      return new NextResponse('Policy not found', { status: 404 })
    }

    const [policy] = await db
      .select()
      .from(policies)
      .where(eq(policies.id, app.policyId))
      .limit(1)

    if (!policy) return new NextResponse('Policy not found', { status: 404 })

    const cloudinaryUrl = policy.policyDocumentUrl
    if (!cloudinaryUrl || cloudinaryUrl.includes('mock-cloudinary.local')) {
      console.warn('[policy/download] No real PDF URL for policy:', policy.policyNumber)
      return new NextResponse('PDF not available', { status: 404 })
    }

    // Fetch PDF server-side from Cloudinary — avoids all CORS / cross-origin download issues
    const upstream = await fetch(cloudinaryUrl)
    if (!upstream.ok) {
      console.error('[policy/download] Cloudinary fetch failed:', upstream.status, cloudinaryUrl)
      return new NextResponse('Failed to fetch PDF', { status: 502 })
    }

    const pdfBuffer = await upstream.arrayBuffer()
    const filename = `${policy.policyNumber}.pdf`

    console.log('[policy/download] Serving PDF:', filename, `(${pdfBuffer.byteLength} bytes)`)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.byteLength.toString(),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (err) {
    console.error('[policy/download] Error:', err)
    return new NextResponse('Internal server error', { status: 500 })
  }
}

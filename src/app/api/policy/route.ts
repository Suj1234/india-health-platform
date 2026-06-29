export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, policies } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { getSignedUrl } from '@/lib/cloudinary'

// Extract Cloudinary public_id from a full secure URL
// e.g. https://res.cloudinary.com/{cloud}/raw/upload/v123/{public_id} → {public_id}
function extractCloudinaryPublicId(url: string): string | null {
  const match = url.match(/\/raw\/upload\/(?:v\d+\/)?(.+)$/)
  return match?.[1] ?? null
}

export async function GET(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })

    const [app] = await db.select().from(applications).where(eq(applications.id, session.application_id)).limit(1)
    if (!app || app.status !== 'policy_issued') {
      return NextResponse.json({ success: false, error: 'Policy not yet issued' }, { status: 404 })
    }

    if (!app.policyId) return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })

    const [policy] = await db.select().from(policies).where(eq(policies.id, app.policyId)).limit(1)
    if (!policy) return NextResponse.json({ success: false, error: 'Policy not found' }, { status: 404 })

    // Build a signed download URL from the stored Cloudinary URL
    let policyDocumentUrl = policy.policyDocumentUrl ?? ''
    if (policyDocumentUrl && policyDocumentUrl.includes('res.cloudinary.com')) {
      try {
        const publicId = extractCloudinaryPublicId(policyDocumentUrl)
        if (publicId) {
          policyDocumentUrl = getSignedUrl(publicId)
          console.log('[api/policy] Signed URL generated — public_id:', publicId)
        } else {
          console.warn('[api/policy] Could not extract public_id from URL:', policyDocumentUrl)
        }
      } catch (err) {
        console.error('[api/policy] getSignedUrl failed — falling back to stored URL:', err)
      }
    } else if (policyDocumentUrl.includes('mock-cloudinary.local')) {
      console.warn('[api/policy] Policy document URL is a mock — Cloudinary was not configured when this policy was issued. Re-run the journey to generate a real PDF.')
    } else if (!policyDocumentUrl) {
      console.warn('[api/policy] No policy document URL stored for policy:', policy.policyNumber)
    }

    return NextResponse.json({
      success: true,
      policy: {
        policy_number: policy.policyNumber,
        plan_name: policy.planName,
        sum_insured: Number(policy.sumInsured),
        total_premium_paid: Number(policy.totalPremiumPaid),
        policy_start_date: new Date(policy.policyStartDate!).toLocaleDateString('en-IN'),
        policy_end_date: new Date(policy.policyEndDate!).toLocaleDateString('en-IN'),
        insured_name: policy.insuredName ?? app.name ?? '',
        nominee_name: policy.nomineeName ?? '',
        policy_document_url: policyDocumentUrl,
        free_look_period_expires: policy.freeLookExpiresAt
          ? new Date(policy.freeLookExpiresAt).toLocaleDateString('en-IN')
          : '—',
      },
    })
  } catch (err) {
    console.error('[api/policy] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

export const maxDuration = 30

import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications, policies } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'

// Add fl_attachment so the browser downloads the file instead of opening inline
// (avoids "Failed to load PDF document" in Chrome's built-in viewer)
function toDownloadUrl(url: string): string {
  return url.replace('/raw/upload/', '/raw/upload/fl_attachment/')
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

    let policyDocumentUrl = policy.policyDocumentUrl ?? ''
    if (policyDocumentUrl.includes('res.cloudinary.com')) {
      policyDocumentUrl = toDownloadUrl(policyDocumentUrl)
      console.log('[api/policy] Download URL:', policyDocumentUrl)
    } else if (policyDocumentUrl.includes('mock-cloudinary.local')) {
      console.warn('[api/policy] Mock URL — Cloudinary was not configured when this policy was issued. Re-run journey.')
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
        email: app.email ?? '',
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

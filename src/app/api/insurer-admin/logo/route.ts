import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { insurers } from '@/lib/db/schema'
import { getStaffSessionFromRequest } from '@/lib/auth'
import { uploadInsurerLogo } from '@/lib/cloudinary'

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024 // 2MB

export async function POST(req: NextRequest) {
  try {
    const session = await getStaffSessionFromRequest(req)
    if (!session || !['insurer_admin', 'superadmin'].includes(session.role) || !session.insurer_id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 })
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ success: false, error: 'Invalid file type. Allowed: JPG, PNG, WebP' }, { status: 400 })
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ success: false, error: 'File too large. Maximum 2MB' }, { status: 400 })
    }

    const [insurer] = await db
      .select({ id: insurers.id, slug: insurers.slug })
      .from(insurers)
      .where(eq(insurers.id, session.insurer_id))
      .limit(1)
    if (!insurer) return NextResponse.json({ success: false, error: 'Insurer not found' }, { status: 404 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const uploadResult = await uploadInsurerLogo({ fileBuffer: buffer, insurerSlug: insurer.slug })

    await db
      .update(insurers)
      .set({ logoUrl: uploadResult.secure_url, updatedAt: new Date() })
      .where(eq(insurers.id, session.insurer_id))

    return NextResponse.json({ success: true, url: uploadResult.secure_url })
  } catch (err) {
    console.error('[insurer-admin/logo] Error:', err)
    return NextResponse.json({ success: false, error: 'Upload failed' }, { status: 500 })
  }
}

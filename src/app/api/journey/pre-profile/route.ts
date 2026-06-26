import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'

interface MockProfile {
  name: string
  pan: string
  dob: string
  gender: 'male' | 'female'
  address_line: string
  city: string
  state: string
  pincode: string
  occupation_type: 'salaried' | 'self_employed'
  employer_name: string | null
  hazardous_occupation: string | null
  father_name: string | null
}

const MOCK_PROFILES: MockProfile[] = [
  {
    name: 'Rahul Sharma', pan: 'ABCRS1234H', dob: '1990-05-15', gender: 'male',
    address_line: '12, MG Road, Koramangala', city: 'Mumbai', state: 'Maharashtra', pincode: '400050',
    occupation_type: 'salaried', employer_name: 'Tech Corp Pvt Ltd', hazardous_occupation: null, father_name: 'Suresh Sharma',
  },
  {
    name: 'Priya Patel', pan: 'FGHPP5678P', dob: '1988-09-22', gender: 'female',
    address_line: 'B-204, Shapath Hexa', city: 'Ahmedabad', state: 'Gujarat', pincode: '380015',
    occupation_type: 'salaried', employer_name: 'National Bank Ltd', hazardous_occupation: 'Chemical Plant Operations', father_name: 'Mahesh Patel',
  },
  {
    name: 'Arjun Nair', pan: 'KLMAN9012N', dob: '1985-12-03', gender: 'male',
    address_line: '14, Model Town, Sector 5', city: 'Bengaluru', state: 'Karnataka', pincode: '560001',
    occupation_type: 'salaried', employer_name: 'Global Consultants LLP', hazardous_occupation: null, father_name: 'Rajan Nair',
  },
  {
    name: 'Sneha Kulkarni', pan: 'PQRSK3456K', dob: '1992-07-18', gender: 'female',
    address_line: '5, Shivaji Nagar', city: 'Pune', state: 'Maharashtra', pincode: '411005',
    occupation_type: 'self_employed', employer_name: null, hazardous_occupation: 'Mining & Excavation', father_name: 'Prakash Kulkarni',
  },
  {
    name: 'Vikram Singh', pan: 'UVWVS7890S', dob: '1983-03-30', gender: 'male',
    address_line: 'H-37, Greater Kailash', city: 'New Delhi', state: 'Delhi', pincode: '110048',
    occupation_type: 'self_employed', employer_name: 'Singh Enterprises', hazardous_occupation: null, father_name: 'Balveer Singh',
  },
]

function mockProfileForPan(pan: string): MockProfile {
  const match = MOCK_PROFILES.find((p) => p.pan === pan)
  if (match) return match
  const idx = parseInt(pan.charAt(8) ?? '0', 10) % MOCK_PROFILES.length
  return { ...MOCK_PROFILES[idx]!, pan }
}

const panSchema = z.object({ pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format') })

// GET — auto-lookup by mobile (called on step 2 mount, no PAN input needed)
export async function GET(_req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [application] = await db
      .select({ id: applications.id, mobile: applications.mobile, status: applications.status })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    if (!['otp_verified', 'profiling_done'].includes(application.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid application state', code: 'INVALID_STATUS' },
        { status: 409 }
      )
    }

    const lastDigit = parseInt(application.mobile.slice(-1) ?? '0', 10) % MOCK_PROFILES.length
    const profile = MOCK_PROFILES[lastDigit]!

    await db
      .update(applications)
      .set({ pan: profile.pan, updatedAt: new Date() })
      .where(eq(applications.id, application.id))

    return NextResponse.json({ success: true, can_prefill: true, profile })
  } catch (err) {
    console.error('[pre-profile GET] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// POST — manual PAN lookup (fallback when auto-prefill unavailable)
export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = panSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.errors[0]?.message }, { status: 400 })
    }

    const [application] = await db
      .select({ id: applications.id, status: applications.status })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    const profile = mockProfileForPan(parsed.data.pan)

    await db
      .update(applications)
      .set({ pan: profile.pan, updatedAt: new Date() })
      .where(eq(applications.id, application.id))

    return NextResponse.json({ success: true, profile })
  } catch (err) {
    console.error('[pre-profile POST] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { applications } from '@/lib/db/schema'
import { getCustomerSession } from '@/lib/auth'
import { callExternalAPI, getInsurerCredentials } from '@/lib/api-router'
import {
  mobilePrefill,
  panProfile,
  employmentVerification,
  type KarzaMobilePrefillResponse,
  type KarzaPanProfileResponse,
  type KarzaEmploymentResponse,
} from '@/lib/external/karza'
import {
  mockKarzaMobilePrefill,
  mockKarzaPanProfile,
  mockKarzaEmploymentVerification,
} from '@/lib/mock/karza.mock'
import type { IAdorePrefillData } from '@/lib/external/iadore'
import type { KarzaCredentials } from '@/types/insurer'

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveKarzaCreds(dbCreds: Record<string, unknown> | null): KarzaCredentials {
  if (dbCreds) return dbCreds as unknown as KarzaCredentials
  return {
    base_url: process.env.KARZA_BASE_URL ?? 'https://testapi.karza.in',
    api_key: process.env.KARZA_API_KEY ?? '',
  }
}

function mapGender(raw: string): 'male' | 'female' | 'other' {
  const v = raw.toLowerCase()
  if (v === 'm' || v === 'male') return 'male'
  if (v === 'f' || v === 'female') return 'female'
  return 'other'
}

function resolveFatherName(
  personalInfo: import('@/lib/external/karza').KarzaEmploymentPersonalInfo | undefined,
): string | null {
  if (!personalInfo?.fatherHusbandName) return null
  const relation = (personalInfo.relation ?? '').toUpperCase().trim()
  // Only use the name when it is explicitly the father's, not the husband's
  return relation === 'FATHER' || relation === '' ? personalInfo.fatherHusbandName : null
}

function buildProfile(
  prefill: KarzaMobilePrefillResponse,
  panData: KarzaPanProfileResponse | null,
  employment: KarzaEmploymentResponse | null,
  overridePan?: string,
): IAdorePrefillData {
  const pr = prefill.result
  const pa = panData?.result

  // Address: pan-profile has structured fields, prefer over prefill's often-empty address
  const prefillAddr = pr.panDetails.address
  const addressLine =
    [pa?.address.buildingName, pa?.address.streetName].filter(Boolean).join(', ') ||
    [prefillAddr.line_1, prefillAddr.line_2].filter(Boolean).join(', ')

  const city = pa?.address.city || prefillAddr.city || ''
  const state = pa?.address.state || prefillAddr.state || ''
  const pincode = pa?.address.pinCode || prefillAddr.zip || ''

  const isSalaried = pa?.isSalaried ?? null
  const occupationType: 'salaried' | 'self_employed' =
    isSalaried === true ? 'salaried' : 'self_employed'

  const genderRaw = pa?.gender || pr.panDetails.gender || ''

  return {
    pan: overridePan ?? pr.pan,
    name: pa?.name || pr.panDetails.fullName || '',
    dob: pa?.dob || pr.panDetails.dob || '',
    gender: mapGender(genderRaw),
    address_line: addressLine,
    city,
    state,
    pincode,
    occupation_type: occupationType,
    employer_name: employment?.result.nameLookup?.organizationName ?? null,
    hazardous_occupation: null,
    father_name: resolveFatherName(employment?.result.personalInfo),
  }
}

// ── GET — Step 2 mount: prefill from mobile via Karza ────────────────────────
// Always returns { status: 'done', profile } synchronously — no polling needed.

type PreProfileResponse =
  | { success: true; status: 'done'; profile: IAdorePrefillData }
  | { success: false; error: string; code?: string }

export async function GET(_req: NextRequest): Promise<NextResponse<PreProfileResponse>> {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const [application] = await db
      .select({ id: applications.id, mobile: applications.mobile, status: applications.status, insurerId: applications.insurerId })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    if (!['otp_verified', 'profiling_done', 'profiling_started'].includes(application.status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid application state', code: 'INVALID_STATUS' },
        { status: 409 }
      )
    }

    const { mobile, insurerId } = application
    const caseId = session.application_id.slice(0, 8)

    // Step 1: mobile → PAN + basic details
    const prefillResponse = await callExternalAPI<KarzaMobilePrefillResponse>({
      insurerId,
      apiName: 'karza_mobile_prefill',
      realFn: async () => {
        const creds = resolveKarzaCreds(await getInsurerCredentials(insurerId, 'karza_mobile_prefill'))
        return mobilePrefill(creds, { mobile, caseId })
      },
      mockFn: () => mockKarzaMobilePrefill({ mobile }),
    })

    if (prefillResponse.statusCode !== 101 || !prefillResponse.result?.pan) {
      return NextResponse.json({ success: false, error: 'Could not prefill from mobile' })
    }

    const { pan } = prefillResponse.result
    const name = prefillResponse.result.panDetails.fullName
    const dob = prefillResponse.result.panDetails.dob

    // Step 2: enrich with pan-profile + employment in parallel
    const [panResult, employmentResult] = await Promise.allSettled([
      callExternalAPI<KarzaPanProfileResponse>({
        insurerId,
        apiName: 'karza_pan_profile',
        realFn: async () => {
          const creds = resolveKarzaCreds(await getInsurerCredentials(insurerId, 'karza_pan_profile'))
          return panProfile(creds, { pan, name, dob, caseId })
        },
        mockFn: () => mockKarzaPanProfile({ pan, name, dob }),
      }),
      callExternalAPI<KarzaEmploymentResponse>({
        insurerId,
        apiName: 'karza_employment',
        realFn: async () => {
          const creds = resolveKarzaCreds(await getInsurerCredentials(insurerId, 'karza_employment'))
          return employmentVerification(creds, { pan, employeeName: name, mobile, caseId })
        },
        mockFn: () => mockKarzaEmploymentVerification({ pan, employeeName: name, mobile }),
      }),
    ])

    const panData = panResult.status === 'fulfilled' ? panResult.value : null
    const employmentData = employmentResult.status === 'fulfilled' ? employmentResult.value : null

    const profile = buildProfile(prefillResponse, panData, employmentData)

    return NextResponse.json({ success: true, status: 'done', profile })
  } catch (err) {
    console.error('[pre-profile GET] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

// ── POST — manual PAN fallback: user supplies PAN, enrich via Karza ──────────

const panSchema = z.object({
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, 'Invalid PAN format'),
})

export async function POST(req: NextRequest): Promise<NextResponse<PreProfileResponse>> {
  try {
    const session = await getCustomerSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = panSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message ?? 'Invalid PAN' },
        { status: 400 }
      )
    }
    const { pan } = parsed.data

    const [application] = await db
      .select({ id: applications.id, mobile: applications.mobile, status: applications.status, insurerId: applications.insurerId })
      .from(applications)
      .where(eq(applications.id, session.application_id))
      .limit(1)

    if (!application) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 })
    }

    const { mobile, insurerId } = application
    const caseId = session.application_id.slice(0, 8)

    // Enrich the manually-entered PAN via pan-profile + employment in parallel
    const [panResult, employmentResult] = await Promise.allSettled([
      callExternalAPI<KarzaPanProfileResponse>({
        insurerId,
        apiName: 'karza_pan_profile',
        realFn: async () => {
          const creds = resolveKarzaCreds(await getInsurerCredentials(insurerId, 'karza_pan_profile'))
          return panProfile(creds, { pan, caseId })
        },
        mockFn: () => mockKarzaPanProfile({ pan }),
      }),
      callExternalAPI<KarzaEmploymentResponse>({
        insurerId,
        apiName: 'karza_employment',
        realFn: async () => {
          const creds = resolveKarzaCreds(await getInsurerCredentials(insurerId, 'karza_employment'))
          return employmentVerification(creds, { pan, mobile, caseId })
        },
        mockFn: () => mockKarzaEmploymentVerification({ pan, mobile }),
      }),
    ])

    const panData = panResult.status === 'fulfilled' ? panResult.value : null
    const employmentData = employmentResult.status === 'fulfilled' ? employmentResult.value : null

    // Build a minimal prefill shell with the manually supplied PAN
    const syntheticPrefill: KarzaMobilePrefillResponse = {
      requestId: 'manual',
      statusCode: 101,
      result: {
        mobileNumber: mobile,
        pan,
        panDetails: {
          fullName: panData?.result.name ?? '',
          splitName: [],
          gender: panData?.result.gender ?? '',
          dob: panData?.result.dob ?? '',
          aadhaarLink: panData?.result.aadhaarLinked ?? false,
          address: { line_1: '', line_2: '', street_name: '', zip: '', city: '', state: '', country: '', full: '' },
        },
      },
    }

    const profile = buildProfile(syntheticPrefill, panData, employmentData, pan)

    return NextResponse.json({ success: true, status: 'done', profile })
  } catch (err) {
    console.error('[pre-profile POST] Error:', err)
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}

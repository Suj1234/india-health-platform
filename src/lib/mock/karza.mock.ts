export interface KarzaTkycPanResponse {
  statusCode: number
  result: {
    name: string
    status: 'VALID' | 'INVALID' | 'NOT_FOUND'
    nameMatchScore: number
    dobMatch: boolean
    panStatus: string
  }
}

export interface KarzaOcrResult {
  documentType: string
  confidence: number
  data: Record<string, string>
}

export function mockKarzaPanVerification({
  pan,
  name,
  dob,
}: {
  pan: string
  name: string
  dob: string
}): KarzaTkycPanResponse {
  return {
    statusCode: 101,
    result: {
      name: name.toUpperCase(),
      status: 'VALID',
      nameMatchScore: 95.5,
      dobMatch: true,
      panStatus: 'E',  // E = Existing
    },
  }
}

export function mockKarzaVoterVerification({
  voterId,
  name,
}: {
  voterId: string
  name: string
}): { statusCode: number; result: { name: string; status: string; nameMatchScore: number } } {
  return {
    statusCode: 101,
    result: {
      name: name.toUpperCase(),
      status: 'VALID',
      nameMatchScore: 88.0,
    },
  }
}

export function mockKarzaPassportVerification({
  passportNumber,
  name,
  dob,
}: {
  passportNumber: string
  name: string
  dob: string
}): { statusCode: number; result: { name: string; status: string; nameMatchScore: number; dobMatch: boolean } } {
  return {
    statusCode: 101,
    result: {
      name: name.toUpperCase(),
      status: 'VALID',
      nameMatchScore: 92.0,
      dobMatch: true,
    },
  }
}

export function mockKarzaOcrAadhaar(): KarzaOcrResult {
  return {
    documentType: 'aadhaar',
    confidence: 96.4,
    data: {
      name: 'RAHUL SHARMA',
      dob: '15/05/1990',
      gender: 'MALE',
      address: '14 Model Town Sector 5 Mumbai Maharashtra 400050',
      pincode: '400050',
      uid_last4: '1234',
    },
  }
}

export function mockKarzaOcrPan(): KarzaOcrResult {
  return {
    documentType: 'pan',
    confidence: 98.1,
    data: {
      name: 'RAHUL SHARMA',
      dob: '15/05/1990',
      pan_number: 'ABCDE1234F',
      father_name: 'RAJESH SHARMA',
    },
  }
}

export function mockKarzaOcrBankStatement(): KarzaOcrResult {
  return {
    documentType: 'bank_statement',
    confidence: 91.0,
    data: {
      account_number: 'XXXX XXXX 5678',
      bank_name: 'HDFC Bank',
      avg_monthly_credit: '45000',
      average_monthly_credit: '45000',
      period: 'Dec 2025 - May 2026',
    },
  }
}

export function mockKarzaMobileOtpSend(params: { mobile: string }): {
  'status-code': string
  request_id: string
  result: object
  message: string
} {
  return {
    'status-code': '101',
    request_id: `mock-karza-${params.mobile}-${Date.now()}`,
    result: {},
    message: 'OTP sent successfully',
  }
}

export function mockKarzaMobileOtpStatus(params: { request_id: string; otp: string }): {
  'status-code': string
  request_id: string
  result: object
  sim_details: { otp_validated: boolean; provider: string }
} {
  void params
  return {
    'status-code': '101',
    request_id: params.request_id,
    result: {},
    sim_details: { otp_validated: true, provider: 'mock-telecom' },
  }
}

export function mockKarzaMobileDetails(params: { request_id: string }): {
  'status-code': string
  request_id: string
  result: {
    contact: { address: null; alt_contact: null; email_id: null; work_email: null }
    device: { '3g_support': string; device_activation_date: null; imei: null; model: string }
    history: Array<{ amount: string; payment_date: string; payment_type: string }>
    identity: { date_of_birth: null; gender: null; name: string }
    profile: Record<string, null>
    sim_details: { activation_date: null; last_activity_date: null; otp_validated: boolean; provider: string; type: string }
  }
} {
  return {
    'status-code': '101',
    request_id: params.request_id,
    result: {
      contact: { address: null, alt_contact: null, email_id: null, work_email: null },
      device: { '3g_support': 'Yes', device_activation_date: null, imei: null, model: 'Mock Device' },
      history: [],
      identity: { date_of_birth: null, gender: null, name: 'Mock Customer' },
      profile: { education: null, language: null, marital_status: null, occupation: null, relationships: null, workplace: null },
      sim_details: { activation_date: null, last_activity_date: null, otp_validated: true, provider: 'mock-telecom', type: 'postpaid' },
    },
  }
}

export function mockKarzaOcrItr(): KarzaOcrResult {
  return {
    documentType: 'itr',
    confidence: 88.5,
    data: {
      pan: 'ABCDE1234F',
      assessment_year: '2024-25',
      total_income: '580000',
      tax_paid: '42500',
    },
  }
}

// ── OCR Plus KYC mocks ────────────────────────────────────────────────────────

import type { KarzaOcrPlusResponse } from '@/lib/external/karza'

export function mockKarzaOcrPlusPan(params: { memberName?: string; memberDob?: string }): KarzaOcrPlusResponse {
  const name = (params.memberName ?? 'RAMESH KUMAR').toUpperCase()
  const dob  = params.memberDob ? formatDobForOcr(params.memberDob) : '15/01/1962'
  return {
    requestId: `mock-ocr-plus-pan-${Date.now()}`,
    statusCode: 101,
    result: {
      documents: [{
        documentType: 'PAN',
        subType: '',
        pageNo: 1,
        ocrData: {
          name:   { value: name, confidence: 0.97 },
          dob:    { value: dob, confidence: 0.98 },
          pan:    { value: 'ABCDE1234F', confidence: 0.99 },
          father: { value: 'SURESH KUMAR', confidence: 0.85 },
        },
        qualityChecks: [
          { score: 0.8, flag: false, type: 'BRIGHTNESS' },
          { score: 0,   flag: false, type: 'BLACK_AND_WHITE' },
          { score: 0,   flag: false, type: 'BLUR' },
          { score: 0,   flag: false, type: 'CUT_CARD' },
        ],
        tamperCheck: { score: 0.1, tamperRisk: 'LOW', status: 'SUCCESS' },
      }],
    },
  }
}

export function mockKarzaOcrPlusAadhaarFront(params: { memberName?: string; memberDob?: string }): KarzaOcrPlusResponse {
  const name = (params.memberName ?? 'RAMESH KUMAR').toUpperCase()
  const dob  = params.memberDob ? formatDobForOcr(params.memberDob) : '15/01/1962'
  return {
    requestId: `mock-ocr-plus-aadhaar-front-${Date.now()}`,
    statusCode: 101,
    result: {
      documents: [{
        documentType: 'AADHAAR_FRONT',
        subType: '',
        pageNo: 1,
        ocrData: {
          name:   { value: name, confidence: 0.96 },
          dob:    { value: dob, confidence: 0.97 },
          gender: { value: 'MALE', confidence: 0.99 },
          uid:    { value: 'XXXX XXXX 5678', confidence: 0.99 },
        },
        qualityChecks: [
          { score: 0.75, flag: false, type: 'BRIGHTNESS' },
          { score: 0,    flag: false, type: 'BLACK_AND_WHITE' },
          { score: 0,    flag: false, type: 'BLUR' },
          { score: 0,    flag: false, type: 'CUT_CARD' },
        ],
        tamperCheck: { score: 0.05, tamperRisk: 'LOW', status: 'SUCCESS' },
      }],
    },
  }
}

export function mockKarzaOcrPlusAadhaarBack(): KarzaOcrPlusResponse {
  return {
    requestId: `mock-ocr-plus-aadhaar-back-${Date.now()}`,
    statusCode: 101,
    result: {
      documents: [{
        documentType: 'AADHAAR_BACK',
        subType: '',
        pageNo: 1,
        ocrData: {
          address: { value: 'H No 14, Model Town, Sector 5, Mumbai, Maharashtra', confidence: 0.91 },
          pincode: { value: '400050', confidence: 0.98 },
          state:   { value: 'Maharashtra', confidence: 0.99 },
          district: { value: 'Mumbai', confidence: 0.97 },
        },
        qualityChecks: [
          { score: 0.72, flag: false, type: 'BRIGHTNESS' },
          { score: 0,    flag: false, type: 'BLACK_AND_WHITE' },
          { score: 0,    flag: false, type: 'BLUR' },
          { score: 0,    flag: false, type: 'CUT_CARD' },
        ],
        tamperCheck: { score: 0.05, tamperRisk: 'LOW', status: 'SUCCESS' },
      }],
    },
  }
}

function formatDobForOcr(isoDate: string): string {
  // Convert YYYY-MM-DD to DD/MM/YYYY for OCR format
  const parts = isoDate.split('-')
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`
  return isoDate
}

// ── Mock profiles used across demographic mock functions ──────────────────────

const DEMOGRAPHIC_PROFILES = [
  {
    pan: 'ABCRS1234H',
    fullName: 'RAHUL SHARMA',
    firstName: 'RAHUL',
    lastName: 'SHARMA',
    dob: '1990-05-15',
    gender: 'M',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    employer: 'Tech Corp Pvt Ltd',
    fatherName: 'RAJESH SHARMA',
    isSalaried: true,
  },
  {
    pan: 'FGHPP5678P',
    fullName: 'PRIYA PATEL',
    firstName: 'PRIYA',
    lastName: 'PATEL',
    dob: '1988-09-22',
    gender: 'F',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380015',
    employer: 'National Bank Ltd',
    fatherName: 'VINOD PATEL',
    isSalaried: true,
  },
  {
    pan: 'KLMAN9012N',
    fullName: 'ARJUN NAIR',
    firstName: 'ARJUN',
    lastName: 'NAIR',
    dob: '1985-12-03',
    gender: 'M',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    employer: 'Global Consultants LLP',
    fatherName: 'KRISHNA NAIR',
    isSalaried: false,
  },
]

function pickDemographicProfile(key: string) {
  const idx = parseInt(key.slice(-1) ?? '0', 10) % DEMOGRAPHIC_PROFILES.length
  return DEMOGRAPHIC_PROFILES[idx]!
}

// ── Mobile Form Prefill mock ──────────────────────────────────────────────────

import type { KarzaMobilePrefillResponse } from '@/lib/external/karza'

export function mockKarzaMobilePrefill(params: { mobile: string }): KarzaMobilePrefillResponse {
  const p = pickDemographicProfile(params.mobile)
  return {
    requestId: `mock-prefill-${Date.now()}`,
    statusCode: 101,
    result: {
      mobileNumber: params.mobile,
      pan: p.pan,
      panDetails: {
        fullName: p.fullName,
        splitName: p.fullName.split(' '),
        gender: p.gender,
        dob: p.dob,
        aadhaarLink: true,
        address: {
          line_1: '14, Model Town, Sector 5',
          line_2: '',
          street_name: '',
          zip: p.pincode,
          city: p.city,
          state: p.state,
          country: 'India',
          full: `14, Model Town, Sector 5, ${p.city}, ${p.state} - ${p.pincode}`,
        },
      },
    },
  }
}

// ── PAN Profile mock ──────────────────────────────────────────────────────────

import type { KarzaPanProfileResponse } from '@/lib/external/karza'

export function mockKarzaPanProfile(params: { pan: string; name?: string; dob?: string }): KarzaPanProfileResponse {
  const p = pickDemographicProfile(params.pan)
  return {
    requestId: `mock-pan-profile-${Date.now()}`,
    statusCode: 101,
    result: {
      pan: params.pan,
      name: p.fullName,
      firstName: p.firstName,
      middleName: '',
      lastName: p.lastName,
      gender: p.gender === 'M' ? 'male' : 'female',
      aadhaarLinked: true,
      aadhaarMatch: true,
      dob: p.dob,
      address: {
        buildingName: '14, Model Town',
        locality: 'Sector 5',
        streetName: 'Main Road',
        pinCode: p.pincode,
        city: p.city,
        state: p.state,
        country: 'India',
      },
      mobileNo: null,
      emailId: null,
      status: 'Active',
      issueDate: '2015-06-15',
      isSalaried: p.isSalaried,
      isDirector: false,
      isSoleProp: false,
    },
  }
}

// ── Employment Verification mock ──────────────────────────────────────────────

import type { KarzaEmploymentResponse } from '@/lib/external/karza'

export function mockKarzaEmploymentVerification(params: { pan: string; employeeName?: string; mobile?: string }): KarzaEmploymentResponse {
  const p = pickDemographicProfile(params.pan)
  return {
    request_id: `mock-employment-${Date.now()}`,
    'status-code': '101',
    result: {
      nameLookup: {
        organizationName: p.employer,
        isNameExact: true,
        isEmployed: p.isSalaried,
        isRecent: p.isSalaried,
        employeeName: p.fullName,
      },
      personalInfo: {
        name: p.fullName,
        dateOfBirth: p.dob,
        gender: p.gender,
        fatherHusbandName: p.fatherName,
        relation: 'FATHER',
        mobileNumber: params.mobile ?? '',
        pan: params.pan,
      },
      summary: {
        nameLookup: { matchName: p.fullName, isUnique: true, isLatest: p.isSalaried, result: p.isSalaried },
        waiveFi: true,
      },
      failures: [],
    },
  }
}

// ── Email Verification mock ───────────────────────────────────────────────────

import type { KarzaEmailVerificationResponse } from '@/lib/external/karza'

export function mockKarzaEmailVerification(params: { email: string; individualName?: string }): KarzaEmailVerificationResponse {
  void params
  return {
    request_id: `mock-email-verify-${Date.now()}`,
    'status-code': '101',
    result: {
      data: {
        disposable: false,
        webmail: false,
        result: 'valid',
        accept_all: false,
        smtp_check: true,
        regexp: true,
        mx_records: true,
        email: params.email,
      },
      result_summary: {
        email_valid: true,
        org_domain_match: false,
        indv_flag: false,
        overall_result: 'valid',
      },
    },
  }
}

// ── Email Fraud Check mock ────────────────────────────────────────────────────

import type { KarzaEmailFraudResponse } from '@/lib/external/karza'

export function mockKarzaEmailFraud(params: { email: string; firstName?: string; lastName?: string }): KarzaEmailFraudResponse {
  void params
  return {
    requestId: `mock-email-fraud-${Date.now()}`,
    statusCode: 101,
    result: [
      {
        emailAndDomainValidationDetails: {
          statusId: '2',
          status: 'Verified',
          domainExists: 'Yes',
          emailExists: 'Yes',
        },
        emailAndDomainRiskDetails: {
          score: '80',
          fraudRisk: '080 Very Low',
          adviceId: '3',
          advice: 'Lower Fraud Risk',
          riskBandId: '1',
          riskBand: 'Fraud Score 1 to 100',
          domainRiskLevelId: '4',
          domainRiskLevel: 'Low',
        },
      },
    ],
  }
}

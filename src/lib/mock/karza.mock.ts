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

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

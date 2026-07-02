import type {
  PerfiosDigilockerDocument,
  PerfiosDigilockerDownloadResult,
} from '@/lib/external/perfios-digilocker'

export function mockPerfiosDigilockerLink(params: { docType: 'ADHAR' | 'PANCR'; caseId: string }): {
  link: string
  requestId: string
} {
  return {
    requestId: `mock-perfios-${params.caseId}-${Date.now()}`,
    link: `https://mock-digilocker.local/auth?docType=${params.docType}&caseId=${params.caseId}`,
  }
}

export function mockPerfiosDigilockerDocuments(): PerfiosDigilockerDocument[] {
  return [
    {
      name: 'Aadhaar Card',
      date: '2023-01-15',
      uri: 'in.gov.uidai-ADHAR-mock12345678900000000000000',
      doctype: 'ADHAR',
      description: 'Aadhaar Card',
      issuerId: 'in.gov.uidai',
      issuer: 'Aadhaar, Unique Identification Authority of India',
      mimes: ['application/pdf', 'application/xml'],
      isParseable: true,
    },
    {
      name: 'PAN Verification Record',
      date: '2023-01-15',
      uri: 'in.gov.pan-PANCR-ABCDE1234F',
      doctype: 'PANCR',
      description: 'PAN Verification Record',
      issuerId: 'in.gov.pan',
      issuer: 'Income Tax Department',
      mimes: ['application/json', 'application/xml', 'application/pdf'],
      isParseable: true,
    },
  ]
}

export function mockPerfiosDigilockerDownloadAadhaar(params: {
  memberName?: string
  memberDob?: string
}): PerfiosDigilockerDownloadResult {
  const name = (params.memberName ?? 'RAMESH KUMAR').toUpperCase()
  const dob  = params.memberDob ?? '1962-01-15'
  return {
    documentUri: 'in.gov.uidai-ADHAR-mock12345678900000000000000',
    parsedFile: {
      status: 'SUCCESS',
      xmlSignatureVerified: true,
      data: {
        type: 'ADHAR',
        issuedTo: {
          uid: 'XXXX XXXX 5678',
          name,
          dob,
          gender: 'MALE',
          address: {
            co: 'S/O: Suresh Kumar',
            house: 'H No 14',
            locality: 'Model Town',
            vtc: 'Sector 5',
            district: 'Mumbai',
            state: 'Maharashtra',
            pin: '400050',
            country: 'India',
          },
        },
      },
    },
  }
}

export function mockPerfiosDigilockerDownloadPan(params: {
  memberName?: string
  memberDob?: string
}): PerfiosDigilockerDownloadResult {
  const name = (params.memberName ?? 'RAMESH KUMAR').toUpperCase()
  const dob  = params.memberDob ?? '1962-01-15'
  return {
    documentUri: 'in.gov.pan-PANCR-ABCDE1234F',
    parsedFile: {
      status: 'SUCCESS',
      xmlSignatureVerified: true,
      data: {
        type: 'PANCR',
        number: 'ABCDE1234F',
        status: 'A',
        issuedTo: {
          name,
          dob,
          gender: 'MALE',
        },
      },
    },
  }
}

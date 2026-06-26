import type { IAdoreSummary } from '@/types/application'

export type CheckResult = 'pass' | 'warn' | 'fail'
export type RiskLevel = 'Low' | 'Medium' | 'High' | 'Very High'

export interface IAdoreReport {
  safetyScore: number
  safetyLevel: RiskLevel
  reportDate: string

  identityChecks: {
    panVerification: CheckResult
    nameMatch: CheckResult
    dobMatch: CheckResult
    aadhaarSeeding: CheckResult
    mobileAuth: CheckResult
    emailAuth: CheckResult
  }

  financialEvaluation: {
    riskLevel: RiskLevel
    creditScore: number
    creditScoreLabel: string
    annualIncomeFromBSA: number | null
    avgMonthlyInflow: number | null
    imputedIncome: number
    incomeDeclared: number | null
    incomeInconsistency: 'none' | 'mild' | 'significant'
    bankName: string | null
  }

  lifestyleAnalysis: {
    riskLevel: RiskLevel
    tobaccoSpending: boolean
    alcoholSpending: boolean
    gamblingTransactions: boolean
    flagDetails: string[]
  }

  medicalEvaluation: {
    bmi: number | null
    bmiCategory: string | null
    bloodPressureSystolic: number | null
    bloodPressureDiastolic: number | null
    bpStatus: 'normal' | 'elevated' | 'high' | null
    pulseRate: number | null
    faceBiometricsPass: boolean | null
    labResults: Array<{
      test: string
      value: string
      unit: string
      referenceRange: string
      status: 'normal' | 'low' | 'high' | 'critical'
    }>
    radiologyResults: Array<{
      test: string
      finding: string
      status: 'normal' | 'abnormal'
    }>
  }

  consistencyCheck: {
    faceMatchScore: number | null
    livenessScore: number | null
    documentConsistency: CheckResult
    addressConsistency: CheckResult
  }

  litigationCheck: {
    totalCases: number
    civilCases: number
    criminalCases: number
    cases: Array<{
      caseId: string
      type: 'civil' | 'criminal'
      status: string
      court: string
      severity: 'low' | 'medium' | 'high'
      year: number
      description: string
    }>
  }

  fraudCheck: {
    ipConsistency: CheckResult
    deviceFingerprint: CheckResult
    panDatabaseCrosscheck: CheckResult
    behavioralAnomaly: boolean
    flags: string[]
  }

  insurancePortfolio: {
    existingPolicies: Array<{
      type: string
      insurer: string
      sumInsured: number
      status: 'active' | 'lapsed' | 'expired'
    }>
    priorHealthClaims: number
    hasLapsedPolicy: boolean
  }

  uwRecommendation: {
    decision: 'accept' | 'load' | 'decline'
    loadingPercent: number | null
    loadingRange: string | null
    keyTriggers: string[]
    notes: string
  }
}

export interface IAdoreFullResponse {
  status: 'COMPLETED'
  report: {
    demographicDetails: {
      name: string
      dob: string
      gender: string
      address: { addressLine1: string; city: string; state: string; pincode: string }
    }
    panDetails: {
      panNumber: string
      panName: string
      panCategory: string
      panStatus: string
    }
    employmentDetails: {
      employerName: string
      designation: string
      employmentType: string
    }
    companyDetails: {
      gstRegistered: boolean
      gstStatus: string
      isHazardous: boolean
      industryType: string
    }
    litigationDetails: {
      pendingCasesCount: number
      cases: unknown[]
    }
    creditBureauData: {
      bureauScore: number
      imputedIncome: number
    }
    bankStatementData: {
      avgMonthlyCredit: number
      bankName: string
    } | null
    vahanData: {
      vehicleClass: string
      fuelType: string
      insuranceExpiry: string
    } | null
  }
}

const MOCK_PROFILES = [
  {
    name: 'RAHUL SHARMA',
    dob: '15/05/1990',
    employer: 'Tech Corp Pvt Ltd',
    designation: 'Software Engineer',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    bureauScore: 750,
    income: 480000,
    bankIncome: 45000 * 12,
  },
  {
    name: 'PRIYA PATEL',
    dob: '22/09/1988',
    employer: 'National Bank Ltd',
    designation: 'Branch Manager',
    city: 'Ahmedabad',
    state: 'Gujarat',
    pincode: '380015',
    bureauScore: 780,
    income: 720000,
    bankIncome: 62000 * 12,
  },
  {
    name: 'ARJUN NAIR',
    dob: '03/12/1985',
    employer: 'Global Consultants LLP',
    designation: 'Senior Consultant',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    bureauScore: 720,
    income: 900000,
    bankIncome: 75000 * 12,
  },
]

export function mockIAdoreResponse({ pan, mobile }: { pan: string; mobile: string }): IAdoreFullResponse {
  // Use last digit of pan to pick a profile
  const idx = parseInt(pan.charAt(8) ?? '0') % MOCK_PROFILES.length
  const profile = MOCK_PROFILES[idx]!

  return {
    status: 'COMPLETED',
    report: {
      demographicDetails: {
        name: profile.name,
        dob: profile.dob,
        gender: 'M',
        address: {
          addressLine1: '14, Model Town, Sector 5',
          city: profile.city,
          state: profile.state,
          pincode: profile.pincode,
        },
      },
      panDetails: {
        panNumber: pan,
        panName: profile.name,
        panCategory: 'P',
        panStatus: 'VALID',
      },
      employmentDetails: {
        employerName: profile.employer,
        designation: profile.designation,
        employmentType: 'SALARIED',
      },
      companyDetails: {
        gstRegistered: true,
        gstStatus: 'ACTIVE',
        isHazardous: false,
        industryType: 'SERVICES',
      },
      litigationDetails: {
        pendingCasesCount: 0,
        cases: [],
      },
      creditBureauData: {
        bureauScore: profile.bureauScore,
        imputedIncome: profile.income,
      },
      bankStatementData: {
        avgMonthlyCredit: profile.bankIncome / 12,
        bankName: 'HDFC Bank',
      },
      vahanData: null,
    },
  }
}

export function parseIAdoreResponse(raw: IAdoreFullResponse, mobile: string): IAdoreSummary {
  const r = raw.report
  return {
    name: r.demographicDetails.name,
    dob: r.demographicDetails.dob,
    gender: r.demographicDetails.gender === 'M' ? 'male' : 'female',
    address: {
      line1: r.demographicDetails.address.addressLine1,
      city: r.demographicDetails.address.city,
      state: r.demographicDetails.address.state,
      pincode: r.demographicDetails.address.pincode,
    },
    employer_name: r.employmentDetails.employerName,
    occupation_type: r.employmentDetails.employmentType === 'SALARIED' ? 'salaried' : 'business',
    pan_category: r.panDetails.panCategory,
    company_is_hazardous: r.companyDetails.isHazardous,
    gst_registered: r.companyDetails.gstRegistered,
    litigation_count: r.litigationDetails.pendingCasesCount,
    bureau_score: r.creditBureauData.bureauScore,
    income_from_bureau: r.creditBureauData.imputedIncome,
    income_from_bank_statement: r.bankStatementData ? r.bankStatementData.avgMonthlyCredit * 12 : null,
    surrogate_income: null,
  }
}

# External API Integration Details

All external APIs are called exclusively server-side via `src/lib/api-router.ts`.
Every call is mode-checked (test/live) before execution and logged to `api_call_logs`.

---

## 1. iAdore (Perfios) — Demographic Profiling

**Purpose**: Consolidated demographic data enrichment from PAN + mobile.  
**Used in**: Step 3 (iAdore Profiling)  
**API Name key**: `iadore`  
**Async**: Yes — job-based, poll for completion

### Credentials (per insurer)
```json
{
  "base_url": "https://api.iadore.perfios.com",
  "org_key": "your_org_key",
  "hmac_key": "your_hmac_secret",
  "income_api_url": "https://api.iadore.perfios.com/income/vehicle"
}
```

### Authentication
HMAC-SHA256 signed requests. Each request must include:
```
Headers:
  X-Perfios-Org-Key: {org_key}
  X-Perfios-Timestamp: {unix_timestamp_ms}
  X-Perfios-Signature: HMAC-SHA256(org_key + timestamp + body_string, hmac_key)
  Content-Type: multipart/form-data
```

### Start Job (POST)
```
POST {base_url}/v2/consolidated-demographic

Form fields:
  pan: string           // 10-char PAN
  mobile: string        // 10-digit mobile
  email: string
  name?: string
  txn_id: string        // our UUID (for tracking)

Response (202 Accepted):
  {
    "txnId": "our-uuid",
    "jobId": "perfios-internal-job-id",
    "status": "INITIATED"
  }
```

### Poll Status (GET)
```
GET {base_url}/v2/consolidated-demographic/status/{txnId}

Response when running:
  { "status": "RUNNING", "progress": 40 }

Response when done:
  {
    "status": "COMPLETED",
    "report": {
      "demographicDetails": {
        "name": "RAHUL SHARMA",
        "dob": "15/05/1990",
        "gender": "M",
        "address": {
          "addressLine1": "...",
          "city": "Mumbai",
          "state": "Maharashtra",
          "pincode": "400050"
        }
      },
      "panDetails": {
        "panNumber": "ABCDE1234F",
        "panName": "RAHUL SHARMA",
        "panCategory": "P",
        "panStatus": "VALID"
      },
      "employmentDetails": {
        "employerName": "Tech Corp Pvt Ltd",
        "designation": "Software Engineer",
        "employmentType": "SALARIED"
      },
      "companyDetails": {
        "gstRegistered": true,
        "gstStatus": "ACTIVE",
        "isHazardous": false,
        "industryType": "IT_SERVICES"
      },
      "litigationDetails": {
        "pendingCasesCount": 0,
        "cases": []
      },
      "creditBureauData": {
        "bureauScore": 750,
        "imputedIncome": 480000
      },
      "bankStatementData": {
        "avgMonthlyCredit": 41667,
        "annualizedIncome": 500000
      },
      "vehicleDetails": {
        "registrationNumber": "MH01AB1234",
        "vehicleType": "CAR",
        "surrogateIncome": 200000
      }
    }
  }
```

### Vehicle Imputation (Separate call if vehicle_reg provided)
```
POST {income_api_url}/vehicle-surrogate

Body: { "registration_number": "MH01AB1234" }

Response:
  {
    "registration_number": "MH01AB1234",
    "vehicle_type": "CAR",
    "make": "Maruti Suzuki",
    "model": "Swift",
    "year": 2020,
    "surrogate_income": 200000
  }
```

### Mock Response
```typescript
// src/lib/mock/iadore.mock.ts
export function mockIAdoreResponse(params: { pan: string, mobile: string }) {
  return {
    status: 'COMPLETED',
    report: {
      demographicDetails: {
        name: 'RAHUL SHARMA',
        dob: '15/05/1990',
        gender: 'M',
        address: { addressLine1: '123 MG Road', city: 'Mumbai', state: 'Maharashtra', pincode: '400050' }
      },
      panDetails: { panNumber: params.pan, panName: 'RAHUL SHARMA', panCategory: 'P', panStatus: 'VALID' },
      employmentDetails: { employerName: 'Tech Corp Pvt Ltd', employmentType: 'SALARIED' },
      companyDetails: { gstRegistered: true, isHazardous: false },
      litigationDetails: { pendingCasesCount: 0, cases: [] },
      creditBureauData: { bureauScore: 740, imputedIncome: 480000 },
      bankStatementData: { avgMonthlyCredit: 45000, annualizedIncome: 540000 }
    }
  }
}
```

---

## 2. ProtectMeWell (PMW) — Needs Analysis

**Purpose**: Insurance needs recommendation based on customer profile.  
**Used in**: Step 5 (Needs Analysis)  
**API Name key**: `pmw`  
**Async**: No — synchronous response

### Credentials (per insurer)
```json
{
  "base_url": "https://api.protectmewell.com",
  "api_key": "your_pmw_api_key"
}
```

### Request
```
POST {base_url}/v1/needs-analysis

Headers:
  Authorization: Bearer {api_key}
  Content-Type: application/json

Body:
  {
    "age": 36,
    "gender": "male",
    "annual_income": 600000,
    "occupation_type": "salaried",
    "marital_status": "married",
    "dependents": 1,
    "city_tier": 1,
    "existing_health_cover": 0,
    "existing_life_cover": 0
  }
```

### Response
```json
{
  "health_insurance": {
    "recommended_cover": 500000,
    "premium_estimate": 12000,
    "tiers": [
      { "cover": 300000, "premium": 8500, "label": "Basic" },
      { "cover": 500000, "premium": 12000, "label": "Recommended" },
      { "cover": 1000000, "premium": 22000, "label": "Comprehensive" }
    ]
  },
  "term_cover": { "cover": 10000000, "years": 30, "premium": 12000 },
  "critical_illness": { "cover": 2000000, "years": 20, "premium": 8000 },
  "disability_income": { "monthly_benefit": 50000, "years": 30, "premium": 5000 },
  "retirement": { "corpus_target": 20000000, "monthly_sip": 15000 }
}
```

---

## 3. Quote Generation API

**Purpose**: Generate 3 health insurance quote options.  
**Used in**: Step 6 (Quote Selection)  
**API Name key**: `quotes`  
**Async**: No — synchronous

### Credentials (per insurer)
```json
{
  "base_url": "https://quotes.insurer-api.com",
  "api_key": "your_quote_api_key"
}
```

### Request
```
POST {base_url}/v1/health/quotes

Headers:
  X-API-Key: {api_key}
  Content-Type: application/json

Body:
  {
    "applicant": {
      "age": 36,
      "gender": "male",
      "dob": "1990-05-15",
      "occupation_type": "salaried",
      "city_tier": 1,
      "is_smoker": false
    },
    "plan": {
      "type": "individual",
      "sum_insured_options": [300000, 500000, 1000000]
    },
    "members": []
  }
```

### Response
```json
{
  "quotes": [
    {
      "plan_type": "basic",
      "plan_code": "SH-INDV-BASIC-001",
      "plan_name": "Star Health Individual Basic",
      "sum_insured": 300000,
      "annual_premium": 8500,
      "gst": 1530,
      "total": 10030,
      "benefits": [...],
      "exclusions": [...],
      "waiting_periods": [...],
      "riders": [...],
      "network_hospitals": 9800
    },
    { "plan_type": "standard", "..." },
    { "plan_type": "premium", "..." }
  ]
}
```

---

## 4. Karza TKYC — ID Verification

**Purpose**: Verify PAN, Voter ID, Passport via government databases.  
**Used in**: Step 9 (ID Verification)  
**API Name key**: `karza_tkyc`  
**Async**: No — synchronous

### Credentials (per insurer)
```json
{
  "base_url": "https://testapi.karza.in",
  "api_key": "your_karza_api_key"
}
```

### PAN Verification
```
POST {base_url}/v3/pan-comprehensive

Headers:
  x-karza-key: {api_key}
  Content-Type: application/json

Body:
  {
    "pan": "ABCDE1234F",
    "name": "RAHUL SHARMA",
    "dob": "15/05/1990",
    "consent": "Y",
    "reason": "Insurance KYC verification"
  }

Response:
  {
    "statusCode": 101,
    "requestId": "xxx",
    "result": {
      "pan": "ABCDE1234F",
      "panHolderName": "RAHUL SHARMA",
      "panStatus": "VALID",
      "matchPercentage": 95,
      "dob": "15/05/1990",
      "gender": "M",
      "panType": "Individual",
      "aadhaarSeeded": true
    }
  }
```

### Voter ID Verification
```
POST {base_url}/v2/voter-id-advance

Body:
  {
    "voterId": "ABC1234567",
    "name": "RAHUL SHARMA",
    "consent": "Y"
  }

Response:
  {
    "result": {
      "name": "RAHUL SHARMA",
      "nameMismatch": false,
      "dob": "1990",
      "state": "MAHARASHTRA",
      "district": "MUMBAI",
      "matchScore": 88
    }
  }
```

### Passport Verification
```
POST {base_url}/v2/passport

Body:
  {
    "passportNumber": "A1234567",
    "dob": "15/05/1990",
    "name": "RAHUL SHARMA",
    "consent": "Y"
  }

Response:
  {
    "result": {
      "name": "RAHUL SHARMA",
      "passportNumber": "A1234567",
      "status": "VALID",
      "matchScore": 92
    }
  }
```

---

## 5. Karza OCR Plus — Document Digitization

**Purpose**: Extract data from uploaded KYC/financial documents.  
**Used in**: Step 10 (Document Upload) — triggered per uploaded document  
**API Name key**: `karza_ocr`  
**Async**: Yes — polling-based

### Request
```
POST {base_url}/v3/ocr/plus

Headers:
  x-karza-key: {api_key}
  Content-Type: multipart/form-data

Form fields:
  document_type: "aadhaar" | "pan" | "voter_id" | "passport" | "bank_statement" | "itr"
  document_side: "front" | "back" | "single"
  file: (binary file)
  consent: "Y"

Response (async — returns job_id):
  { "jobId": "karza-job-xxx", "status": "QUEUED" }
```

### Poll Status
```
GET {base_url}/v3/ocr/plus/status/{jobId}

Response when done (Aadhaar front):
  {
    "status": "COMPLETED",
    "confidence": 96.2,
    "result": {
      "name": "RAHUL SHARMA",
      "dob": "15/05/1990",
      "gender": "M",
      "address": "123 MG Road, Bandra West, Mumbai 400050",
      "aadhaarUid": "xxxx xxxx 1234",
      "pincode": "400050"
    }
  }

Response when done (PAN card):
  {
    "status": "COMPLETED",
    "confidence": 98.1,
    "result": {
      "panNumber": "ABCDE1234F",
      "name": "RAHUL SHARMA",
      "fatherName": "SURESH SHARMA",
      "dob": "15/05/1990"
    }
  }

Response when done (Bank statement):
  {
    "status": "COMPLETED",
    "result": {
      "accountNumber": "xxxxx1234",
      "bankName": "HDFC Bank",
      "accountHolderName": "RAHUL SHARMA",
      "statementPeriod": { "from": "2025-12-01", "to": "2026-05-31" },
      "averageMonthlyBalance": 45000,
      "averageMonthlyCredit": 55000,
      "totalCredits": 330000
    }
  }
```

---

## 6. NuralX (Beaive) — Face Biometric Vitals

**Purpose**: Non-contact face scan to measure health vitals.  
**Used in**: Step 11b (Biometrics)  
**API Name key**: `nuralx`  
**Async**: Yes — webhook-based

### Credentials (per insurer)
```json
{
  "base_url": "https://api.beaive.nuralx.com",
  "client_id": "your_client_id",
  "client_secret": "your_client_secret",
  "callback_url": "https://your-platform.vercel.app/api/webhooks/nuralx"
}
```

### Step 1: Get Access Token
```
POST {base_url}/v1/auth/token

Body: { "client_id": "...", "client_secret": "...", "grant_type": "client_credentials" }

Response:
  { "access_token": "Bearer xxx", "expires_in": 3600 }
```

### Step 2: Initiate Scan
```
POST {base_url}/v1/scan/initiate

Headers:
  Authorization: Bearer {access_token}

Body:
  {
    "reference_id": "{application_id}",
    "callback_url": "{callback_url}",
    "user_info": {
      "name": "Rahul Sharma",
      "age": 36,
      "gender": "male"
    }
  }

Response:
  {
    "scan_id": "nuralx-scan-xxx",
    "scan_url": "https://scan.beaive.nuralx.com/xxx",
    "expires_at": "2026-06-24T12:00:00Z"
  }
```

### Step 3: Webhook Callback (incoming to our server)
```
POST /api/webhooks/nuralx

Headers:
  X-NuralX-Signature: HMAC-SHA256(body, client_secret)
  Content-Type: application/json

Body:
  {
    "scan_id": "nuralx-scan-xxx",
    "reference_id": "{application_id}",
    "status": "COMPLETED",
    "vitals": {
      "heart_rate": { "value": 72, "unit": "bpm", "range": "normal" },
      "respiratory_rate": { "value": 16, "unit": "breaths/min", "range": "normal" },
      "blood_pressure": {
        "systolic": { "value": 118, "unit": "mmHg", "range": "normal" },
        "diastolic": { "value": 76, "unit": "mmHg", "range": "normal" }
      },
      "oxygen_saturation": { "value": 98, "unit": "%", "range": "normal" },
      "stress_index": { "value": 22, "unit": "score", "range": "low" }
    },
    "risk_score": 15,
    "scan_quality": "high"
  }
```

### Webhook Signature Verification
```typescript
import { createHmac } from 'crypto'

function verifyNuralXSignature(body: string, signature: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  return expected === signature
}
```

---

## 7. PIVC — Pre-Issuance Verification Call

**Purpose**: Video/audio KYC verification call.  
**Used in**: Step 11a (Biometrics)  
**API Name key**: `pivc`  
**Async**: Yes — polling/webhook

### Credentials (per insurer)
```json
{
  "base_url": "https://api.pivc-provider.com",
  "api_key": "your_pivc_key"
}
```

### Create Session
```
POST {base_url}/v1/sessions

Headers:
  Authorization: {api_key}

Body:
  {
    "reference_id": "{application_id}",
    "customer_name": "Rahul Sharma",
    "customer_mobile": "9876543210",
    "verification_type": "video_kyc"
  }

Response:
  {
    "session_id": "pivc-session-xxx",
    "pivc_link": "https://pivc.example.com/join/xxx",
    "expires_at": "2026-06-24T18:00:00Z"
  }
```

### Get Session Result
```
GET {base_url}/v1/sessions/{session_id}

Response when completed:
  {
    "session_id": "pivc-session-xxx",
    "status": "COMPLETED",
    "outcome": "PASSED",
    "agent_notes": "Identity verified successfully",
    "completed_at": "2026-06-24T14:30:00Z"
  }
```

---

## 8. STP Engine — Underwriting Decision

**Purpose**: Automated underwriting decision (APPROVED or REFERRED).  
**Used in**: Step 12 (STP Evaluation)  
**API Name key**: `stp`  
**Async**: No — synchronous (but can take 5-10 seconds)

### Credentials (per insurer)
```json
{
  "base_url": "https://stp.underwriting-engine.com",
  "api_key": "your_stp_api_key"
}
```

### Request
```
POST {base_url}/v1/evaluate

Headers:
  X-STP-Key: {api_key}
  Content-Type: application/json

Body (assembled from all collected application data):
  {
    "transaction_id": "{application_id}",
    "insurer_code": "STAR",
    "plan_code": "SH-INDV-STD-001",
    "sum_insured": 500000,
    "annual_premium": 14360,

    "applicant": {
      "pan": "ABCDE1234F",
      "name": "RAHUL SHARMA",
      "dob": "1990-05-15",
      "age": 36,
      "gender": "male",
      "occupation_type": "salaried",
      "annual_income": 600000,
      "city_tier": 1
    },

    "risk_profile": {
      "bureau_score": 740,
      "litigation_count": 0,
      "company_is_hazardous": false,
      "pan_verification_status": "verified",
      "pan_match_score": 95
    },

    "medical": {
      "bmi": 25.37,
      "is_smoker": false,
      "alcohol_consumption": "occasional",
      "ped_conditions": ["hypertension"],
      "ped_details": [{ "condition": "hypertension", "diagnosis_year": 2020, "is_controlled": true }],
      "has_surgery": false,
      "risk_score": 25,
      "risk_flags": ["has_ped"]
    },

    "biometrics": {
      "pivc_done": false,
      "nuralx_done": false,
      "nuralx_vitals": null,
      "nuralx_risk_score": null
    },

    "documents": {
      "kyc_types": ["aadhaar_front", "aadhaar_back", "pan_card", "photograph"],
      "financial_types": [],
      "all_ocr_successful": true
    }
  }
```

### Response
```json
{
  "transaction_id": "{application_id}",
  "decision": "REFERRED",
  "stp_score": 38,
  "message": "Pre-existing hypertension requires manual underwriter review.",
  "reasons": ["PRE_EXISTING_CONDITION"],
  "documents_required": [],
  "pivc_required": false,
  "biometric_required": false,
  "additional_data": {
    "risk_category": "MEDIUM",
    "suggested_loading": 25
  }
}
```

### STP Decision Logic (for mock)
```typescript
// Mock STP: simulate realistic decisions
export function mockStpResponse(payload: STPPayload) {
  const riskFlags = payload.medical.risk_flags
  const riskScore = payload.medical.risk_score
  
  if (riskFlags.includes('cancer_history') || riskFlags.includes('hiv')) {
    return { decision: 'REFERRED', stp_score: 10, reasons: ['HIGH_RISK_CONDITION'] }
  }
  if (riskFlags.includes('multiple_ped') || riskScore > 60) {
    return { decision: 'REFERRED', stp_score: 30, reasons: ['MULTIPLE_PED'] }
  }
  if (riskFlags.includes('has_ped') && payload.applicant.age > 50) {
    return { decision: 'REFERRED', stp_score: 35, reasons: ['PED_HIGH_AGE'] }
  }
  if (payload.risk_profile.litigation_count > 0) {
    return { decision: 'REFERRED', stp_score: 40, reasons: ['LITIGATION_FOUND'] }
  }
  // Default: approve clean cases
  return { decision: 'APPROVED', stp_score: 85, reasons: [], message: 'Application approved.' }
}
```

---

## 9. Razorpay — Payment

**Purpose**: Collect premium payment from customer.  
**Used in**: Steps 13a and 14  
**Mode**: Global (controlled by `RAZORPAY_MODE` env var, not per-insurer)

### SDK
```
npm install razorpay
```

### Create Order
```typescript
import Razorpay from 'razorpay'

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_MODE === 'live'
    ? process.env.RAZORPAY_LIVE_KEY_ID!
    : process.env.RAZORPAY_TEST_KEY_ID!,
  key_secret: process.env.RAZORPAY_MODE === 'live'
    ? process.env.RAZORPAY_LIVE_KEY_SECRET!
    : process.env.RAZORPAY_TEST_KEY_SECRET!,
})

const order = await razorpay.orders.create({
  amount: Math.round(final_premium * 100),  // in paise
  currency: 'INR',
  receipt: application_number,
  notes: { application_id, insurer_id, plan_name }
})
// Returns: { id: 'order_xxx', amount, currency, status: 'created' }
```

### Verify Signature
```typescript
import { createHmac } from 'crypto'

function verifyRazorpaySignature(
  order_id: string,
  payment_id: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_MODE === 'live'
    ? process.env.RAZORPAY_LIVE_KEY_SECRET!
    : process.env.RAZORPAY_TEST_KEY_SECRET!
  
  const expected = createHmac('sha256', secret)
    .update(`${order_id}|${payment_id}`)
    .digest('hex')
  
  return expected === signature  // MUST be true before policy issuance
}
```

### Webhook Signature Verification
```typescript
function verifyRazorpayWebhook(body: string, signature: string): boolean {
  const expected = createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex')
  return expected === signature
}
```

---

## 10. Brevo — Email & SMS

**Purpose**: Transactional emails and OTP delivery.  
**Used throughout journey**

### SDK
```
npm install @getbrevo/brevo
```

### Send Transactional Email
```typescript
import * as SibApiV3Sdk from '@getbrevo/brevo'

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi()
apiInstance.setApiKey(SibApiV3Sdk.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY!)

await apiInstance.sendTransacEmail({
  sender: { email: process.env.BREVO_SENDER_EMAIL!, name: process.env.BREVO_SENDER_NAME! },
  to: [{ email: customer_email, name: customer_name }],
  subject: 'Your OTP for health insurance application',
  htmlContent: `<p>Your OTP is: <strong>${otp}</strong>. Valid for 10 minutes.</p>`,
  // OR use template ID:
  templateId: 1,
  params: { otp, customer_name, application_number }
})
```

### Email Templates Required
| Template ID | Purpose | Key Params |
|---|---|---|
| 1 | OTP (mobile verification) | otp, expires_in |
| 2 | OTP (payment authorization) | otp, application_number, plan_name |
| 3 | Application under review | application_number, customer_name, insurer_name, timeline |
| 4 | UW Approved (standard) | application_number, plan_name, premium, payment_link |
| 5 | UW Approved with loading | application_number, plan_name, original_premium, loading_percent, revised_premium, payment_link |
| 6 | UW Approved with exclusions | application_number, plan_name, exclusions_list, payment_link |
| 7 | UW Rejected | application_number, rejection_reason, contact_info |
| 8 | UW More docs requested | application_number, docs_requested, upload_link |
| 9 | Policy issued | policy_number, plan_name, premium, start_date, end_date, download_link |
| 10 | NuralX scan link | scan_url, customer_name, expires_at |

### SMS (OTP via Brevo SMS)
```typescript
const smsApiInstance = new SibApiV3Sdk.TransactionalSMSApi()
smsApiInstance.setApiKey(...)

await smsApiInstance.sendTransacSms({
  sender: 'HLTHINS',
  recipient: `+91${mobile}`,
  content: `Your OTP for health insurance application is ${otp}. Valid for 10 minutes. Do not share with anyone.`
})
```

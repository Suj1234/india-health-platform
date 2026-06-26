# Journey Flow — Screen by Screen
**Complete parameter, API, and state details for every step**

---

## Overview

```
ENTRY POINTS:
  A) Landing page → Quote calculator → "Get Quote" → Step 1 (STP or Non-STP)
  B) Email resume link → OTP 3 gate → 3-step mini-stepper (Non-STP only)

═══════════════════════════════════════════════════════
STP PATH — Full stepper, 8 steps, one sitting
═══════════════════════════════════════════════════════

  MAIN STEPPER:  [1]──[2]──[3]──[4]──[5]──[6]──[7]──[8]
                  ✓    ✓    ✓    ✓    ✓    ✓   Pay  Policy

  Step 1 of 8:  Verify Mobile          /apply/1   [OTP 1]
  Step 2 of 8:  Your Identity          /apply/2   [OTP 2]
                  Sub-steps: PAN Verification · Your Details · Email
  Step 3 of 8:  Choose Plan            /apply/3
                  Sub-steps: Select Cover · Add Riders
  Step 4 of 8:  Health Declaration     /apply/4
                  Sub-steps: Vitals & Habits · Conditions · History · Body Scan
  Step 5 of 8:  Review & Proposal      /apply/5
                  Sub-steps: Review Details · Nominee · Declarations
  Step 6 of 8:  Documents              /apply/6
                  Sub-steps: Aadhaar · Photograph
  Step 7 of 8:  Payment                /apply/payment
  Step 8 of 8:  Policy Issued          /policy

═══════════════════════════════════════════════════════
NON-STP PATH — Stepper breaks at Step 6, resumes with 3-step mini-stepper
═══════════════════════════════════════════════════════

  SESSION 1 (customer's first sitting):
  MAIN STEPPER:  [1]──[2]──[3]──[4]──[5]──[6]──⏸[7]──⏸[8]
                  ✓    ✓    ✓    ✓    ✓    ✓   locked locked

  Steps 1–6 complete as above.
  After Step 6 (Documents), STP engine returns REFERRED.
  Steps 7 and 8 shown in stepper as LOCKED (visible but frozen).
  Customer sees "Under Review" message — knows steps 7 & 8 are waiting.
  Route: /apply/review

  ── UW reviews application (2–3 business days) ──

  SESSION 2 (customer clicks email link):
  Entry gate: /resume → OTP 3 sent to mobile → customer verifies
  OTP is a gate, not a stepper step. Once passed, mini-stepper starts.

  MINI-STEPPER (3 steps):  [1 of 3]──[2 of 3]──[3 of 3]
                            Review     Payment   Policy

  Step 1 of 3:  Review Decision    /resume/decision
                  Show: plan details, original premium
                  If loading: revised premium shown, customer accepts/declines
                  If exclusions: exclusion list shown, customer accepts/declines
                  If rejected: journey ends here
  Step 2 of 3:  Payment            /resume/payment
  Step 3 of 3:  Policy Issued      /policy

═══════════════════════════════════════════════════════
ROUTE MAP
═══════════════════════════════════════════════════════

  /              Landing Page (public)
  /apply/1       Step 1: Verify Mobile              [OTP 1]
  /apply/2       Step 2: Your Identity              [OTP 2]
  /apply/3       Step 3: Choose Plan
  /apply/4       Step 4: Health Declaration
  /apply/5       Step 5: Review & Proposal
  /apply/6       Step 6: Documents
  /apply/payment Step 7: Payment (STP path)
  /apply/review  Under Review — stepper frozen at step 6
  /resume        OTP 3 gate (Non-STP resume entry)
  /resume/decision  Mini-step 1 of 3: Review UW Decision
  /resume/payment   Mini-step 2 of 3: Payment
  /policy        Step 8 / Mini-step 3 of 3: Policy Issued

═══════════════════════════════════════════════════════
STEPPER STATES
═══════════════════════════════════════════════════════

  completed  ✓   step done, green/filled
  active     →   current step, highlighted
  locked     ⏸   visible but not clickable (non-STP steps 7–8 during review)
  upcoming   ○   not yet reached, greyed out

═══════════════════════════════════════════════════════
SUB-STEPPER RULES
═══════════════════════════════════════════════════════

  - Shown only inside Steps 2–6 (Steps 1, 7, 8 have no sub-steps)
  - Completed sub-steps show ✓ and are tappable (allow going back within same step)
  - Active sub-step is highlighted
  - Future sub-steps within same step are greyed out, not tappable
  - Cannot jump to a future MAIN step — only forward navigation
  - Mini-stepper (3 steps) follows same rules — no sub-steppers inside it

═══════════════════════════════════════════════════════
OTP SUMMARY
═══════════════════════════════════════════════════════

  OTP 1:  Mobile verification      Step 1        (all customers)
  OTP 2:  Email verification       Step 2        (all customers)
  OTP 3:  UW resume gate           /resume       (non-STP only, not a stepper step)

  STP customers:     2 OTPs total
  Non-STP customers: 3 OTPs total

═══════════════════════════════════════════════════════
REMOVED FROM OLD PLAN
═══════════════════════════════════════════════════════

  - iAdore profiling screen   → background only
  - Income profile step       → not applicable to health insurance
  - Needs analysis (PMW)      → removed entirely
  - ID verification screen    → TKYC runs silently in background
  - PIVC biometrics           → removed entirely
  - Financial document upload → insurer config only, default OFF
```

---

## Step 0: Landing Page

**Route**: `/` (public, no auth)  
**Status required**: none  
**DB writes**: none  

### Purpose
Marketing page + quote calculator entry point.

### Quote Calculator Parameters (sent to API)
```typescript
GET /api/quotes/calculate

Query params:
  age: number           // 18–65
  gender: 'male' | 'female' | 'other'
  city_tier: 1 | 2 | 3  // Metro=1, Tier2=2, Rest=3
  sum_insured: number   // 300000 | 500000 | 1000000 | 1500000 | 2000000 | 5000000
  members: number       // 1–6 (self + family)
  plan_type: 'individual' | 'family_floater'
  occupation_type: 'salaried' | 'self_employed' | 'business' | 'retired' | 'student'
  insurer_slug?: string // If white-label URL, pre-set insurer

Response:
  indicative_annual_premium: number  // in INR, before GST
  gst: number
  total: number
  plan_options: [
    { type: 'basic', premium: number, total: number },
    { type: 'standard', premium: number, total: number },
    { type: 'premium', premium: number, total: number }
  ]
```

**Note**: This is an indicative calculation using insurer mock/formula. Real quotes generated in Step 6.
Occupation type is used to apply hazardous-occupation surcharge flags at the indicative stage.
`salaried` / `retired` / `student` → standard rates. `self_employed` / `business` → flag if industry
is potentially hazardous (shown as "Surcharge may apply" banner, not a hard block at this stage).

### CTA Action
"Get Quote" / "Buy Now" → redirect to `/apply/1?insurer={slug}&sum_insured={n}&members={n}&plan_type={t}&occupation_type={o}`

---

## Step 1: Mobile OTP Verification

**Route**: `/apply/1`  
**URL Params**: `insurer`, `sum_insured`, `members`, `plan_type` (from Step 0)  
**Status required**: none (creates application)  
**DB writes**: `otp_logs`, `applications` (after OTP verified), `users`  

### UX Implementation (actual)
- Customer enters 10-digit mobile + checks consent checkbox
- "Get OTP" button sends OTP via Brevo SMS
- OTP input appears in a **bottom sheet** (not a separate page/sub-step)
- Resend available after **30-second** cooldown
- On success: brief "Mobile verified!" screen inside bottom sheet → auto-navigates to Step 2
- Input formatted with space after 5 digits for readability (stored as raw 10 digits)

### Sub-step 1a: Enter Mobile
```typescript
Input:
  mobile: string        // 10 digits, must start with 6-9
  consent_given: boolean // Must be true — blocks "Get OTP" button if unchecked

Validation:
  /^[6-9]\d{9}$/ — fail if invalid
  Rate limit: max 3 OTP requests per mobile per hour
```

### Sub-step 1b: Send OTP (bottom sheet opens)
```typescript
POST /api/auth/send-otp

Request:
  { mobile: string, insurer_slug: string }

Server logic:
  1. Validate mobile format
  2. Check rate limit (otp_logs table)
  3. Generate 6-digit OTP
  4. Hash OTP: SHA-256(otp + salt)
  5. Store in otp_logs: { mobile, otp_hash, purpose: 'mobile_verification', expires_at: NOW()+10min }
  6. Send via Brevo SMS API (email fallback if SMS fails)

Response:
  { success: true, otp_ref_id: uuid, expires_in_seconds: 600 }
```

### Sub-step 1c: Verify OTP (inside bottom sheet)
```typescript
POST /api/auth/verify-otp

Request:
  {
    mobile: string,
    otp: string,
    otp_ref_id: string,
    insurer_slug: string,
    initial_sum_insured?: number,   // from Step 0 query params
    initial_members?: number,
    initial_plan_type?: string
  }

Server logic:
  1. Find otp_log by otp_ref_id, check not expired, attempts < 3
  2. Hash and compare OTP
  3. If match:
     a. Mark OTP used
     b. Upsert user by mobile
     c. Create application (application_number, insurer_id, status='otp_verified')
     d. Generate customer JWT → set httpOnly cookie 'auth_token'

Response:
  { success: true, application_id: string, next_step: 2 }
```

### Application Status After Step 1
```
status: 'otp_verified'
current_step: 2
```

---

## Step 2: PAN + Basic Details

**Route**: `/apply/2`  
**Auth**: Customer JWT required  
**Status required**: `otp_verified`  
**DB writes**: `applications` (pan, name, dob, gender, email, address, occupation_type, employer_name)  
**Navigation**: On completion → `/apply/4` (Step 3 — old iAdore waiting screen — is skipped entirely)

### UX Phases (actual implementation)

This step has 5 internal phases driven by whether PAN can be auto-detected:

```
mount → [loading]
           ↓
    GET /api/journey/pre-profile
           ↓
  PAN found?
  ├── YES → [confirm-pan]  ← show masked PAN + masked name, user confirms/rejects
  │             ↓ confirmed
  │          [details]
  │
  └── NO  → [manual-pan]  ← user types PAN manually
                ↓ verify clicked
             [verify-pan]  ← show masked name from PAN lookup, user confirms
                ↓ confirmed
             [details]
                         ↓ (both routes arrive here)
                      [email-otp]  ← bottom sheet, OTP sent to entered email
                         ↓ verified
                      POST /api/journey/profile → router.push('/apply/4')
```

### Phase: loading
- On mount, auto-calls `GET /api/journey/pre-profile`
- Shows spinner: "Fetching your linked PAN…"
- If API returns `can_prefill: true` → moves to `confirm-pan`
- If API fails or `can_prefill: false` → moves to `manual-pan`

### Phase: confirm-pan
```typescript
// Displayed to customer (masked for privacy):
  PAN:  ABC*****H      // first 3 + last 2, middle masked
  Name: Rah** S****    // first 3 chars of first name + first char of last name

// Two CTAs:
  "Yes, that's me — Continue"  → Phase: details
  "This is not my PAN"         → Phase: manual-pan
```

### Phase: manual-pan
```typescript
Input:
  pan: string   // user types, auto-uppercased, /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

"Verify PAN" button → calls Karza/iAdore PAN lookup silently
→ moves to verify-pan phase
```

### Phase: verify-pan
```typescript
// After manual PAN lookup, show:
  PAN:           ABC*****H  (masked)
  Name on PAN:   Rah** S*** (masked)

// Two CTAs:
  "Yes, this is me — Continue"  → Phase: details
  "Try a different PAN"         → back to manual-pan
```

### Phase: details (pre-filled form)
```typescript
// READ-ONLY (from iAdore/PAN, not editable):
  Full Name:  string      // fetched from PAN record
  DOB:        string      // fetched from PAN record
  Gender:     string      // fetched from PAN record

// COLLAPSIBLE + EDITABLE (pre-filled from iAdore, customer can correct):
  Address section:
    address_line: string
    city: string
    state: string
    pincode: string

  Employment section:
    occupation_type: 'salaried' | 'self_employed' | 'business' | 'retired' | 'student'
    employer_name: string  // shown only if salaried or business

// MANDATORY INPUT (customer must enter):
  email: string   // validated: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                  // hint: "Policy document will be sent here"

// REMOVED vs old plan:
  - vehicle_reg_number: removed
  - DOB manual entry: removed (read-only from PAN)
  - Gender manual entry: removed (read-only from PAN)

"Send Email OTP & Continue" CTA → triggers email OTP
```

### Phase: email-otp (bottom sheet — OTP 2 in journey)
```typescript
POST /api/auth/send-email-otp
Request: { email: string }
Response: { success: true, otp_ref_id: uuid }

// Bottom sheet opens — same UX pattern as Step 1 mobile OTP
// 30-second resend cooldown

POST /api/auth/verify-email-otp
Request: { email: string, otp: string, otp_ref_id: string }
Response: { success: true }

// On email OTP verified → submit profile to backend:
POST /api/journey/profile
Request:
  {
    pan: string,
    dob: string,
    gender: string,
    email: string,
    name: string,
    address_line: string,
    city: string,
    state: string,
    pincode: string,
    occupation_type: string,
    employer_name?: string
  }

Response: { success: true }
→ router.push('/apply/4')
```

### Server logic (POST /api/journey/profile)
```typescript
1. Guard: application status must be 'otp_verified'
2. Validate PAN format, email format
3. Check PAN uniqueness for this insurer
4. Update application: pan, name, dob, gender, email, address, occupation_type, employer_name
5. Start iAdore async job in BACKGROUND (no customer-facing wait):
   a. Create job entry (iadore_job_id = UUID)
   b. Spawn background fetch to iAdore API (or mock via api-router)
   c. Store iadore_job_id in application
   d. iAdore result stored in DB when ready — used by STP engine later
6. Update status: 'profiling_started'

Response: { success: true }
// Navigation handled client-side to /apply/4
```

### OTP count note
With email OTP added in Step 2, the journey now has up to 3 OTPs total:
- OTP 1: Mobile verification (Step 1)
- OTP 2: Email verification (Step 2) ← added in this implementation
- OTP 3: Payment/resume authorization (UW resume path only)

For STP-approved customers: 2 OTPs total (mobile + email). No payment OTP needed.

---

## Step 3: iAdore Profiling — REMOVED AS CUSTOMER-FACING STEP

**Old route**: `/apply/3` — this route is no longer shown to the customer.  
**Status**: iAdore runs silently in the background after Step 2 profile submission.  
**Customer sees**: nothing. No waiting screen, no profiling results displayed.  

iAdore result (name, address, bureau data, occupation, litigation, company flags) is stored in
the DB and used internally by the STP engine. It is never shown to the customer.

The old `/apply/3` route is bypassed — Step 2 navigates directly to `/apply/4`.

---

## Step 3: Quote Selection

**Route**: `/apply/4`  
**Auth**: Customer JWT required  
**Status required**: `profiling_started` (iAdore running in background — does not need to finish)  
**DB writes**: `quotes` (3 rows), `applications` (selected_quote_id, final_premium, status)  

### Data available by this step
```
age          → computed from DOB (Step 2)
gender       → from Step 2
city_tier    → from iAdore address (or Step 0 fallback if iAdore still running)
sum_insured  → from Step 0 landing page (customer can change here)
plan_type    → individual | family_floater (from Step 0)
members      → [{ relation, dob, gender }] for family floater (from Step 2)
occupation   → from iAdore (or Step 2 input if iAdore still running)
```

### Quote Generation
```typescript
POST /api/journey/quotes

// Server builds quote request from above data:
{
  age: number,
  gender: string,
  dob: string,
  sum_insured: number,
  city_tier: 1 | 2 | 3,
  occupation_type: string,
  is_smoker: false,           // default false — updated after Step 4 if smoker declared
  members: [{ relation, age, gender }],
  plan_type: 'individual' | 'family_floater',
  insurer_id: string
}

// Returns 3 quotes stored in quotes table:
{
  plan_type: 'basic' | 'standard' | 'premium',
  plan_name: string,
  plan_code: string,
  sum_insured: number,
  annual_premium: number,
  gst_amount: number,           // 18%
  total_premium: number,
  benefits: [{ name, description, limit }],
  exclusions: [{ name, description }],
  waiting_periods: [{ condition, days }],
  riders: [{ code, name, annual_premium, gst, total }],
  network_hospitals_count: number
}
```

### Customer Sees
- Sum insured selector (can change from Step 0 value)
- 3 plan cards: Basic / Standard / Premium
- Each card: premium (with GST), key benefits, waiting periods, network hospitals
- "Recommended" tag on Standard plan (based on age/city)
- Rider toggles below plan cards
- "Proceed with [Plan Name]" CTA

### Quote Selection
```typescript
POST /api/journey/select-quote

Request:
  {
    application_id: string,
    quote_id: string,
    selected_riders: string[]
  }

Server logic:
  1. Mark quote selected (is_selected = true)
  2. Compute final_premium = quote_premium + sum(selected_rider_premiums)
  3. Update application: selected_quote_id, final_premium, sum_insured locked, status='quote_selected'

Response: { success: true, final_premium: number }
// Navigate to /apply/5
```

---

## Step 4: Medical Questionnaire

**Route**: `/apply/5`  
**Auth**: Customer JWT required  
**Status required**: `quote_selected`  
**DB writes**: `medical_questionnaires`, `applications` (status, risk_flags, risk_score)  

### Questions (8 total — no more)
```
Q1. Height (cm) + Weight (kg)          → BMI computed server-side
Q2. Tobacco/Smoking: Y/N
    → If yes: type (cigarette/bidi/tobacco/other), quantity per day, years
Q3. Alcohol: None / Occasional / Regular
Q4. Pre-existing conditions (tick all that apply):
      □ Diabetes          □ Hypertension
      □ Heart disease     □ Asthma / respiratory
      □ Kidney disease    □ Cancer (any type)
      □ Thyroid disorder  □ Arthritis / joint disorder
    → For each YES: year first diagnosed + on medication currently Y/N
Q5. Surgery in last 5 years: Y/N
    → If yes: brief description (text, max 200 chars)
Q6. Hospitalised (non-surgery) in last 2 years: Y/N
    → If yes: reason (text, max 200 chars)
Q7. Any permanent disability or physical impairment: Y/N
Q8. For family floater — repeat Q2–Q4 for each insured member
```

### API Call
```typescript
POST /api/journey/medical

Request:
  {
    application_id: string,
    height_cm: number,
    weight_kg: number,
    is_smoker: boolean,
    smoker_type?: string,
    cigarettes_per_day?: number,
    smoking_years?: number,
    alcohol_consumption: 'none' | 'occasional' | 'regular',
    ped_conditions: {
      diabetes: boolean,
      hypertension: boolean,
      heart_disease: boolean,
      asthma: boolean,
      kidney_disease: boolean,
      cancer: boolean,
      thyroid: boolean,
      arthritis: boolean
    },
    ped_details?: [{ condition, year_diagnosed, on_medication }],
    had_surgery: boolean,
    surgery_details?: string,
    hospitalised: boolean,
    hospitalisation_details?: string,
    has_disability: boolean,
    members_medical?: [{ member_index, is_smoker, ped_conditions, ped_details }]
  }

Server logic:
  1. Compute BMI = weight_kg / (height_cm/100)²
  2. Compute risk_flags:
     - bmi_over_30 | bmi_over_35
     - smoker | heavy_smoker (>10/day)
     - alcohol_regular
     - has_ped (any PED = true)
     - multiple_ped (count > 2)
     - had_surgery | hospitalised | has_disability
     - cancer (high weight)
  3. Compute risk_score (weighted sum)
  4. If is_smoker = true → update selected quote premium (smoking loading)
  5. Insert medical_questionnaire record
  6. Update application status: 'medical_done'

Response: { success: true, risk_score: number }
// Navigate to /apply/6
```

---

## Step 5: NuralX Vitals

**Route**: `/apply/6`  
**Auth**: Customer JWT required  
**Status required**: `medical_done`  
**DB writes**: `biometric_sessions`, `applications` (status)  
**Applies to**: ALL applicants — no skip, no exception  

### Initiate Scan
```typescript
POST /api/journey/biometrics/nuralx

Request: { application_id: string }

Server logic:
  1. NuralX OAuth: POST /auth → access_token
  2. POST /scan/initiate → { scan_id, scan_url }
  3. Insert biometric_session: { application_id, scan_id, scan_url, status: 'initiated', type: 'nuralx' }
  4. Send email to customer with scan_url (Brevo) as backup
  5. Update application status: 'nuralx_initiated'

Response:
  { success: true, scan_url: string, scan_id: string, email_sent_to: string }
```

### Customer Experience
- In-app: "Complete your health scan" with scan_url as a button/link → opens on phone
- 30-second face scan via phone camera (no app install needed — browser-based)
- Backup: link also sent to email in case customer wants to do it on a different device
- Page polls for completion every 5 seconds

### NuralX Webhook (server receives vitals)
```typescript
POST /api/webhooks/nuralx

Request (from NuralX):
  {
    scan_id: string,
    status: 'completed' | 'failed',
    vitals: {
      heart_rate: number,               // bpm, normal 60–100
      respiratory_rate: number,          // breaths/min, normal 12–20
      blood_pressure_systolic: number,   // mmHg
      blood_pressure_diastolic: number,  // mmHg
      oxygen_saturation: number,         // %
      stress_index: number               // 0–100
    },
    risk_score: number
  }

Server logic:
  1. Verify NuralX HMAC signature header
  2. Find biometric_session by scan_id
  3. Update session: status='completed', vitals=result
  4. Update application status: 'nuralx_done'
```

### Poll for Completion
```typescript
GET /api/journey/biometrics/status?application_id={id}&type=nuralx

Response when done:
  {
    status: 'completed',
    vitals: { heart_rate, respiratory_rate, blood_pressure_systolic,
              blood_pressure_diastolic, oxygen_saturation, stress_index },
    risk_score: number
  }

// Customer sees vitals summary card: "Your health snapshot is captured"
// No alarming labels — just the numbers displayed calmly
// Navigate to /apply/7
```

### If NuralX Fails / Times Out
```
If no webhook received within 15 minutes:
  - Mark biometric_session status: 'timeout'
  - Still allow customer to proceed (UW will note missing vitals)
  - Update application status: 'nuralx_done' (with vitals = null)
```

---

## Step 6: Proposal + Nominee

**Route**: `/apply/7`  
**Auth**: Customer JWT required  
**Status required**: `nuralx_done`  
**DB writes**: `applications` (proposal_data, status)  

### What Customer Sees
```typescript
// READ-ONLY (pre-filled, cannot edit):
  Full Name:     from application.name (iAdore/PAN)
  Date of Birth: from application.dob
  Gender:        from application.gender
  PAN:           masked (ABCDE****F)
  Mobile:        masked (+91 98***43210)
  Email:         from application.email
  Address:       from application (Step 2 confirmed/edited)
  Occupation:    from application (Step 2 confirmed/edited)

// CUSTOMER MUST FILL:
  Marital Status: Single | Married | Divorced | Widowed

  Nominee:
    Name:         string (mandatory)
    Relationship: Spouse | Child | Parent | Sibling | Other
    Date of Birth: date picker
    Share:        100% (fixed — single nominee)

  Family floater members (if applicable):
    For each member added in Step 2:
      Name: string (mandatory — DOB/gender/relation already known)

// PED WAITING PERIOD ACKNOWLEDGMENT (shown ONLY if any PED declared in medical step):
  Section header: "Waiting periods applicable to your declared conditions"
  For each declared PED condition → show one row:
    • [Condition display name]  —  36-month waiting period from policy start date
  Standard disease-specific waiting (sourced from selected plan's waiting_periods[]):
    • E.g., Cataract, Hernia, Sinusitis, Joint replacement → 24 months
    (only shown if plan covers these and customer is under 36-month PED window)
  □ I acknowledge and accept the above waiting periods for my declared conditions
    (mandatory checkbox when has_ped = true — hard blocks form submission if unchecked)

// FREE-LOOK PERIOD NOTICE (shown to all):
  "You have a 15-day free-look period from the date of policy receipt. If you are not
   satisfied, you may return the policy within 15 days for a refund of premium after
   deductions for medical examination charges and stamp duty."

// DECLARATIONS (4 checkboxes — all mandatory):
  □ I declare that all information in this proposal form is true, complete, and correct
    to the best of my knowledge. I understand that any misrepresentation or concealment
    of material facts may render the policy void.
  □ I consent to my personal, financial, and health data being used by the insurer,
    reinsurers, and IRDAI for underwriting, KYC, claims processing, and regulatory purposes.
  □ I have read and accept the policy terms, conditions, exclusions, and waiting periods
    of the selected plan.
  □ I authorise the insurer to obtain any medical, financial, or other information required
    to process this proposal from hospitals, doctors, banks, or any other institution.
```

### API Call
```typescript
POST /api/journey/proposal

Request:
  {
    application_id: string,
    marital_status: 'single' | 'married' | 'divorced' | 'widowed',
    nominee_name: string,
    nominee_relation: 'spouse' | 'child' | 'parent' | 'sibling' | 'other',
    nominee_dob: string,       // YYYY-MM-DD
    nominee_share: 100,
    member_names?: [{ member_index: number, name: string }],
    declaration_health_accurate: true,       // replaces old declaration_accepted
    consent_data_sharing: true,
    consent_plan_terms: true,
    declaration_insurer_info_access: true,   // authorise insurer to obtain medical/financial info
    declaration_ped_acknowledged?: true      // required only when application has any PED declared
  }

Server logic:
  1. Validate all mandatory fields
  2. All 4 declaration fields must be true — hard reject if any false
     Additionally: if application.medical.has_any_ped = true,
       declaration_ped_acknowledged must also be true — hard reject if missing or false
  3. Update application: proposal_data, status='proposal_submitted'
  4. Trigger TKYC PAN verification silently in background:
     Karza API: { pan, name, dob } → match_score, status
     Store in id_verifications table (no customer screen shown)
  5. Trigger STP engine in background (STP runs while customer does Step 7)

Response: { success: true }
// Navigate to /apply/8
```

---

## Step 7: Document Upload

**Route**: `/apply/8`  
**Auth**: Customer JWT required  
**Status required**: `proposal_submitted`  
**DB writes**: `documents`, `applications` (status)  

### Required Documents (always)
```
1. Aadhaar  — front + back  (OR via DigiLocker — single fetch)
2. Photograph / Selfie      (camera capture or upload — JPG/PNG only)
```

### Conditional Documents
```
Financial documents:
  ONLY if insurer.config.financial_docs_enabled = true
  AND sum_insured >= occupation-specific threshold (all insurer-configurable):

  | occupation_type | Config key (insurer.config)                  | Default SI threshold | Documents required                                               |
  |-----------------|----------------------------------------------|----------------------|------------------------------------------------------------------|
  | salaried        | financial_docs_threshold_salaried            | ₹20,00,000          | Payslips — last 3 months (PDF) + ITR or Form 16 (latest year)  |
  | self_employed   | financial_docs_threshold_self_employed       | ₹10,00,000          | Bank statement — last 6 months (PDF) + ITR — last 2 years      |
  | business        | financial_docs_threshold_business            | ₹10,00,000          | Bank statement — last 6 months + ITR — last 2 years +          |
  |                 |                                              |                      | GST certificate (mandatory if SI ≥ ₹50,00,000)                 |
  | retired         | financial_docs_threshold_retired             | ₹20,00,000          | Bank statement — last 6 months + pension statement             |
  | student         | N/A                                          | N/A                  | Financial documents not required                                |

  Default: financial_docs_enabled = false (insurer must explicitly enable in config)

Screen shows the exact required document list upfront (computed from occupation + SI) before
customer begins uploading — no surprises mid-flow.
```

### Two Upload Options (shown side by side)
```
┌─────────────────────────┐  ┌─────────────────────────────┐
│  DigiLocker (Recommended)│  │     Upload Manually          │
│                         │  │                              │
│  Connect your DigiLocker│  │  Aadhaar front (JPG/PDF)     │
│  account to fetch:      │  │  Aadhaar back  (JPG/PDF)     │
│  • Aadhaar XML          │  │  Photograph    (JPG/PNG)     │
│                         │  │                              │
│  [Connect DigiLocker]   │  │  [Upload Files]              │
└─────────────────────────┘  └─────────────────────────────┘
```

### Option A: DigiLocker Flow
```typescript
POST /api/journey/documents/digilocker/initiate

Server logic:
  1. Generate DigiLocker OAuth URL with state = application_id
  2. Return redirect URL

Customer → redirected to DigiLocker → authorises → callback to platform

GET /api/journey/documents/digilocker/callback?code=...&state=application_id

Server logic:
  1. Exchange code for access_token
  2. Fetch Aadhaar XML from DigiLocker API
  3. Parse and store: name, dob, gender, address, aadhaar_last4
  4. Store document record (source: 'digilocker', no Cloudinary upload needed)
  5. Mark aadhaar as verified

Response: { success: true, aadhaar_verified: true }
```

### Option B: Manual Upload Flow
```typescript
POST /api/journey/documents/upload
Content-Type: multipart/form-data

Request:
  application_id: string
  document_type: 'aadhaar_front' | 'aadhaar_back' | 'photograph'
               | 'bank_statement' | 'itr' | 'payslip' | 'form_16'
               | 'gst_certificate' | 'pension_statement'   // conditional
  file: File    // max 10MB, PDF/JPG/PNG/JPEG

Server logic:
  1. Validate MIME type (check magic bytes, not just extension)
  2. Validate size ≤ 10MB
  3. Upload to Cloudinary:
     path: india-health/{insurer_slug}/{application_id}/{doc_type}_{timestamp}
  4. Insert document record (cloudinary_public_id, cloudinary_url)
  5. Trigger Karza OCR async (background)

Response: { success: true, document_id: string }
```

### Finalize Documents
```typescript
POST /api/journey/documents/finalize

Request: { application_id: string }

Server logic:
  1. Check all required documents present
  2. Run photo-face match: selfie vs Aadhaar face (Karza, if OCR available)
  3. Update application status: 'docs_uploaded'
  4. Check if STP result already available (it was triggered in Step 6)
     - If STP done: redirect based on decision
     - If STP still running: wait (poll, max 30s timeout)

Response: { success: true, stp_decision: 'approved' | 'referred' | 'pending' }

IF approved  → router.push('/apply/payment')
IF referred  → router.push('/apply/review')
IF pending   → show "finalising your application…" spinner, poll /api/journey/stp/status
```

---

## Payment (STP Approved)

**Route**: `/apply/payment`  
**Auth**: Customer JWT required  
**Status required**: `stp_evaluated` with `stp_decision = 'approved'`  
**DB writes**: `payments`, `applications`, `policies`  

### What Customer Sees
- Selected plan summary (plan name, sum insured, key benefits)
- Premium breakdown:
  - Base premium: ₹X
  - GST (18%):    ₹X
  - Riders:       ₹X (if any selected)
  - **Total:**    ₹X
- "Pay Now" CTA → Razorpay checkout

### Create Razorpay Order
```typescript
POST /api/payment/create-order

Request: { application_id: string }

Server logic:
  1. Verify application status = 'stp_evaluated' + stp_decision = 'approved'
     OR status = 'uw_approved' (non-STP path)
  2. Get final_premium from application
  3. Create Razorpay order:
     {
       amount: Math.round(final_premium * 100),  // paise
       currency: 'INR',
       receipt: application_number,
       notes: { application_id, insurer_id, plan_name, sum_insured }
     }
  4. Store in payments: { razorpay_order_id, amount, status: 'created' }

Response:
  { success: true, order_id: string, amount: number, razorpay_key: string }
```

### Razorpay Client-Side Checkout
```typescript
const rzp = new Razorpay({
  key: razorpay_key,
  amount: amount,
  currency: 'INR',
  order_id: order_id,
  name: insurer.name,
  description: `Health Insurance — ${plan_name}`,
  prefill: { name: customer.name, email: customer.email, contact: customer.mobile },
  handler: (response) => verifyPayment(response)
})
rzp.open()
```

### Verify Payment + Issue Policy
```typescript
POST /api/payment/verify

Request:
  { application_id, razorpay_payment_id, razorpay_order_id, razorpay_signature }

Server logic:
  1. CRITICAL: HMAC-SHA256(order_id + '|' + payment_id, RAZORPAY_SECRET)
     Must match razorpay_signature — reject 400 if not
  2. Update payment: status='paid', signature_verified=true
  3. Update application: status='payment_done'
  4. Call POST /api/policy/issue internally

POST /api/policy/issue (internal)
  1. Generate policy_number: {INSURER_CODE}-{YYYY}-{8-digit-seq}
  2. start_date = today, end_date = today + 1 year
  3. Get exclusions (insurer standard + UW exclusions if non-STP)
  4. Generate PDF (pdf-lib): summary, benefits, exclusions, IRDAI grievance
  5. Upload PDF to Cloudinary
  6. Insert policy record
  7. Update application: policy_id, status='policy_issued'
  8. Send policy PDF via Brevo email

Response: { success: true }
→ router.push('/policy')
```

---

## Under Review (STP Referred)

**Route**: `/apply/review`  
**Auth**: Customer JWT required  
**Status required**: `uw_pending`  

### Display
- Application reference number (prominent)
- "Your application is under review"
- "Typically reviewed within 2–3 business days"
- "You will receive an email at {masked_email} once a decision is made"

### Email Sent Automatically
```
To: customer.email
Subject: [Insurer Name] — Your health insurance application is under review
Body:
  Dear {name},
  Application {application_number} for {plan_name} (₹{sum_insured}) is under review.
  Expected decision: within 2–3 business days.
  You will receive an email with a secure link to complete your purchase.
  For queries: {insurer_contact}
```

---

## Resume After UW Decision

**Route**: `/resume?token={jwt}`  
**Auth**: Token from email + OTP 3 (mobile OTP)  

### Flow
```
Customer clicks secure link in email
  ↓
1. Decode token → extract application_id
2. Show: "Enter OTP sent to +91 98***43210"
3. POST /api/auth/send-otp { mobile, purpose: 'payment_authorization', application_id }
4. Customer enters OTP
5. POST /api/auth/verify-otp { mobile, otp, otp_ref_id, token }
   → token also verified server-side (JWT signature + expiry check)
6. On success → show UW decision screen
```

### UW Decision Screen
```typescript
GET /api/applications/{id}/uw-decision

Approved (standard):
  → Show plan summary + premium
  → "Proceed to Pay" CTA → /apply/payment

Approved with loading:
  Original premium:  ₹X
  Loading ({n}%):   +₹X
  Revised premium:   ₹X  ← customer pays this
  → "Accept & Pay" or "Decline" (application cancelled if declined)

Approved with exclusions:
  Exclusion list: [{ condition, type: 'permanent'|'time-limited', duration, description }]
  → "Accept exclusions & Pay" or "Decline"

Rejected:
  → "We're unable to offer coverage at this time"
  → Rejection reason (if insurer allows showing)
  → application_closed
```

---

## Policy Issued

**Route**: `/policy`  
**Auth**: Customer JWT required  
**Status required**: `policy_issued`  

### Display
```typescript
GET /api/policy/{application_id}

{
  policy_number: string,           // prominent
  plan_name: string,
  sum_insured: number,
  total_premium_paid: number,
  policy_start_date: string,
  policy_end_date: string,         // start + 1 year
  insured_name: string,
  nominee_name: string,
  free_look_period_expires: string, // start + 15 days
  policy_document_url: string      // signed Cloudinary URL, 1hr expiry
}
```

### Actions
- Download Policy PDF
- "Policy sent to {email}" confirmation message

---

## Application Status State Machine

```
initiated
  ↓ (mobile OTP verified)
otp_verified
  ↓ (PAN + details + email OTP + profile submitted)
profiling_started           ← iAdore running silently in background
  ↓ (quote selected)
quote_selected
  ↓ (medical questionnaire submitted)
medical_done
  ↓ (NuralX scan completed or timed out)
nuralx_done
  ↓ (proposal + nominee submitted)
proposal_submitted          ← TKYC PAN check runs silently
                            ← STP engine starts running silently
  ↓ (documents uploaded + finalized)
docs_uploaded
  ↓ (STP result available)
stp_evaluated
  ├─[approved]──→ payment_pending → payment_done → policy_issued
  └─[referred]──→ uw_pending
                    ↓ (UW takes decision)
              uw_approved ──────→ payment_pending → payment_done → policy_issued
              uw_approved_loading → payment_pending → payment_done → policy_issued
              uw_approved_exclusion → payment_pending → payment_done → policy_issued
              uw_rejected ──────→ application_closed
              uw_more_docs ─────→ docs_requested → docs_uploaded → uw_pending
```

---

## Background Processes (never shown to customer)

| Process | Triggered at | Customer sees |
|---------|-------------|---------------|
| iAdore data fetch | Step 2 profile submit | Nothing |
| TKYC PAN verification | Step 6 proposal submit | Nothing |
| Karza Aadhaar OCR | Step 7 manual upload | Upload spinner only |
| STP engine | Step 6 proposal submit | "Finalising..." if still running at Step 7 end |
| NuralX webhook receive | Step 5 scan completion | Vitals card |
| Policy PDF generation | After payment verify | Email confirmation |

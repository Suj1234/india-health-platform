# PRD — India Health Insurance Platform
**Version**: 1.0  
**Date**: June 2026  
**Status**: Planning  

---

## 1. Product Overview

A white-label, fully digital health insurance onboarding platform for the Indian market. The platform enables insurers to configure their products and offer a seamless STP (Straight-Through Processing) or near-STP purchase journey to customers. Where STP is not possible, the application is routed to an underwriter for review, after which the customer can complete payment and receive a policy.

### Core Value Propositions

1. **Zero data entry** — customer data pre-filled via iAdore (Perfios) from PAN + mobile
2. **Instant underwriting** — STP engine issues approval without human intervention for eligible cases
3. **Maximum 2 OTPs** in the entire journey (mobile verify + payment authorize)
4. **White-label** — each insurer gets their own branded experience with their own API credentials and mode settings
5. **Fraud detection** — multi-layered: IIB integration, financial behavioral analysis, biometric liveness

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|---|---|---|
| Reduce manual data entry | % fields auto-filled from iAdore | > 80% |
| Fast journey completion | Average time from start to policy | < 15 minutes (STP) |
| High STP rate | % applications auto-approved | > 60% |
| Low drop-off | Journey completion rate | > 70% |
| OTP minimization | OTPs per completed application | ≤ 2 |
| Fraud prevention | Fraud flag rate | Measurable + logged |

---

## 3. User Personas

### 3.1 Customer (Primary)
- Indian resident, 18-65 years old
- Buying health insurance for self or family
- Entry point: email link, website, or agent referral
- Expected tech literacy: basic smartphone user
- Journey: self-service, completely digital
- Language: English (Phase 1), regional languages (Phase 2)

### 3.2 Underwriter
- Insurance company employee
- Reviews non-STP applications
- Takes decisions: approve, reject, loading, exclusion, request more docs
- Works on desktop browser
- Has insurer-specific login

### 3.3 Platform Admin (Super Admin)
- Manages the white-label platform
- Creates and configures insurers
- Creates underwriter users
- Manages API credentials per insurer
- Toggles insurer mode (test/live)

### 3.4 Insurer Admin
- Employee of a specific insurer
- Can view all applications for their insurer
- Can manage underwriter users within their insurer
- Cannot change API credentials or mode

---

## 4. Portals & Feature Scope

### 4.1 Customer Portal (Phase 1)

#### Landing Page
- Full marketing page: hero, value props, how-it-works, quote calculator, FAQs
- Quote calculator: enter age, gender, city/tier, sum insured, members → see indicative premium
- CTA: "Get Quote" → starts application

#### Application Journey (14 steps — see Journey Flow doc for full detail)
- Step 1: Mobile OTP verification
- Step 2: Basic details (PAN + form)
- Step 3: iAdore profiling (auto-fill from PAN/mobile)
- Step 4: Income profile review
- Step 5: Needs analysis results
- Step 6: Quote selection (3 options)
- Step 7: Medical questionnaire
- Step 8: Proposal review + declaration
- Step 9: ID verification (Karza TKYC)
- Step 10: Document upload (KYC + financial)
- Step 11: Biometrics (PIVC + NuralX face scan — conditional)
- Step 12: STP evaluation
- Step 13a (STP): Payment → Policy issued
- Step 13b (Non-STP): "Under review" screen, await email
- Step 14 (Non-STP resume): Email link → OTP2 → UW decision view → Payment → Policy

#### Post-Policy
- Policy document download (PDF)
- Policy summary page
- Email confirmation with policy PDF

### 4.2 Underwriter Portal (Phase 1)

#### Dashboard
- Summary stats: pending, approved, rejected, in-review, total
- Application list with filter/sort/search
- Real-time updates (polling)

#### Application Review
- Full applicant profile view
- Document viewer (inline PDF/image)
- Medical questionnaire answers
- iAdore risk indicators
- STP evaluation details (why it was referred)
- Biometric vitals (if collected)
- ID verification results
- Communication history

#### Decision Actions
- Approve (standard)
- Approve with Loading (% or flat amount → revised premium)
- Approve with Exclusions (select from predefined list)
- Request More Documents (specify type + message)
- Request Medical Tests (specify tests + message)
- Reject (select reason + optional message)

### 4.3 Admin Portal (Phase 1)

#### Insurer Management
- Create / edit insurer (name, slug, logo, config)
- Toggle insurer mode: test ↔ live
- Configure API credentials per external API
- View all applications across platform

#### User Management
- Create underwriter users (assign to insurer)
- Create insurer admin users
- Deactivate users

#### Platform Monitoring
- API call logs (real vs mock)
- Application volume by insurer
- Error rate by API

---

## 5. Customer Journey — Detailed Screen Specifications

> Full parameter details in docs/JOURNEY_FLOW.md

### Screen 0: Landing Page
**Purpose**: Marketing + quote entry point  
**Key Elements**:
- Quote calculator widget (age, gender, sum insured, members, cover type)
- Indicative premium display
- "Start Application" CTA

**API Called**: `GET /api/quotes/calculate` (public, no auth)  
**Input**: age, gender, sum_insured, members_count, city_tier, plan_type  
**Output**: indicative_premium, gst, total  

---

### Screen 1: Mobile Verification (OTP 1)
**Purpose**: Verify customer identity, create application  
**Key Elements**:
- Mobile number input (10 digits, Indian)
- "Send OTP" button
- 6-digit OTP input
- Resend OTP (after 60 seconds)
- Consent checkbox: "I agree to Terms and allow sharing of data for insurance purposes"

**APIs Called**:
1. `POST /api/auth/send-otp` → sends SMS via Brevo
2. `POST /api/auth/verify-otp` → verifies + creates application + returns JWT

**Validation**:
- Mobile: exactly 10 digits, starts with 6-9
- OTP: 6 digits, expires 10 min, max 3 attempts

---

### Screen 2: Basic Details
**Purpose**: Collect minimum data to trigger iAdore profiling  
**Key Elements**:
- Full name (optional — iAdore will fetch)
- PAN number (mandatory)
- Date of birth
- Gender (M/F/Other)
- Email address
- Vehicle registration number (optional — for income surrogate)

**API Called**: `POST /api/journey/profile` → triggers iAdore async job  
**Redirect**: → Screen 3 (profiling in progress)

---

### Screen 3: Profiling (iAdore — async)
**Purpose**: Show iAdore profiling in progress, display results  
**Key Elements**:
- Progress indicator (SSE-based or polling every 3s)
- Once complete: show extracted data card
  - Name, DOB, Gender confirmed
  - Address
  - Occupation + employer
  - Company risk flags (if any)
  - Litigation flags (if any)
  - Credit bureau indicators

**APIs Called**:
1. `GET /api/journey/profile/status?applicationId=xxx` (poll)
2. External: iAdore API (server-side, via api-router)

**Data Displayed** (read-only, no edit):
- `customer_detail.demographicDetails`: name, dob, gender, address
- `customer_detail.panDetails`: pan_name, category
- `customer_detail.employmentDetails`: employer_name, designation
- `company_checks`: is_hazardous, gst_status
- `litigation_details`: pending_cases count

---

### Screen 4: Income Profile
**Purpose**: Consolidate income from multiple sources  
**Key Elements**:
- Customer declared annual income (editable)
- iAdore-sourced income (bureau, bank statement) — read-only display
- Vehicle registration number (if not entered in step 2)
- Consolidated income profile (auto-calculated, show ranking)
- Source priority: Customer Declared > Bank Statement > Bureau > Vehicle Surrogate

**API Called**: `POST /api/journey/income`  
**Input**: declared_income, vehicle_reg_number  
**Output**: income_profile (selected_source, selected_amount, all_sources, cross_analysis)

---

### Screen 5: Needs Analysis
**Purpose**: Show ProtectMeWell recommendations  
**Key Elements**:
- Health insurance recommendation (primary)
- Term cover, critical illness, disability (secondary)
- Each card: cover amount, duration, premium estimate
- "Proceed to see quotes" CTA

**API Called**: `GET /api/journey/needs?applicationId=xxx`  
**External**: PMW needs analysis API

---

### Screen 6: Quote Selection
**Purpose**: Customer selects health insurance plan  
**Key Elements**:
- 3 plan cards: Basic / Standard / Premium
- Each card: sum insured, annual premium (+ GST), key benefits list, exclusion highlights
- Rider options (if configured by insurer): room rent waiver, OPD, maternity, etc.
- Selected plan highlighted
- "Proceed with [Plan Name]" CTA

**APIs Called**:
1. `GET /api/journey/quotes?applicationId=xxx` → calls Quote API
2. `POST /api/journey/select-quote` → saves selection

**Quote Object Parameters**:
- plan_id, plan_name, plan_type (basic/standard/premium)
- sum_insured, annual_premium, gst_amount, total_premium
- benefits: [{name, description, limit}]
- exclusions: [{name, description}]
- riders: [{name, premium, selected: false}]
- waiting_periods: [{condition, days}]
- network_hospitals_count

---

### Screen 7: Medical Questionnaire
**Purpose**: Collect health declaration for underwriting  
**Key Elements**:
- Height (cm) + Weight (kg) → BMI auto-calculated
- Tobacco/smoking: yes/no → if yes: type, quantity/day, years
- Alcohol: none/occasional/regular → if regular: units/week
- Pre-existing conditions checklist (16 conditions)
- For each "yes": diagnosis year, current treatment, current medications
- Surgical history: yes/no → if yes: details
- Family history: yes/no → if yes: per member
- Existing insurance: yes/no → details
- Claims in last 3 years: yes/no → details
- For family floater: repeat key questions per member

**API Called**: `POST /api/journey/medical`  
**Input**: Full questionnaire object (see MEDICAL_QUESTIONNAIRE.md for all fields)  
**Output**: questionnaire saved, risk_flags computed internally

---

### Screen 8: Proposal Review
**Purpose**: Customer reviews pre-filled proposal form, signs declaration  
**Key Elements**:
- Pre-filled from iAdore + customer inputs (editable where needed):
  - Full name, DOB, gender, PAN
  - Address (from iAdore)
  - Occupation, annual income
  - Email, mobile
- Nominee details (mandatory):
  - Nominee name, relationship, DOB
  - Nominee % (100% for single nominee)
- Members for family floater (if applicable): name, DOB, relationship, gender
- Declaration text (IRDAI-mandated)
- Consent checkboxes
- "Submit Proposal" CTA

**API Called**: `POST /api/journey/proposal`  
**Input**: proposal_data object + nominee_details + member_details

---

### Screen 9: ID Verification
**Purpose**: Karza TKYC verification of government IDs  
**Key Elements**:
- PAN verification (auto-triggered with proposal data — mandatory)
- Voter ID (optional — enter number)
- Passport (optional — enter number)
- Each shows: status (verified/failed), match details

**API Called**: `POST /api/journey/verify-id`  
**Input**: { id_type: 'pan'|'voter'|'passport', id_value: string }  
**External**: Karza TKYC API

**PAN Verification Parameters**:
- pan_number, name, dob → match_score, status

**Voter ID Verification Parameters**:
- voter_id, name → match_score, status

**Passport Verification Parameters**:
- passport_number, dob, name → match_score, status

---

### Screen 10: Document Upload
**Purpose**: Upload KYC and financial documents  
**Sub-sections**:

#### 10a: KYC Documents
- Aadhaar (front + back) — mandatory
- PAN card — mandatory
- Photograph — mandatory
- Voter ID — if verified in step 9
- Passport — if verified in step 9

#### 10b: Financial Documents (conditional — based on sum insured threshold)
- Bank statement (last 6 months) — if sum insured > ₹10L
- ITR / ITR-V — if sum insured > ₹10L
- Payslip (last 3 months) — for salaried, if sum insured > ₹10L

**APIs Called**:
1. `POST /api/journey/upload-document` — upload each file to Cloudinary + trigger OCR
2. `GET /api/journey/document-status/:docId` — poll Karza OCR status
3. `POST /api/journey/finalize-docs` — mark upload step complete

**Upload Parameters per document**:
- file (multipart), document_type, category (kyc/financial), application_id

**OCR Output (Karza)**:
- For Aadhaar: name, dob, gender, address, aadhaar_last4
- For PAN: name, dob, pan_number
- For bank statement: account_number, bank_name, avg_balance, average_monthly_credit

---

### Screen 11: Biometrics (Conditional)
**Purpose**: Additional verification for high-risk or high-value applications  
**Trigger Conditions** (any one):
- Sum insured > ₹20 lakhs
- Age > 50
- Any PED declared
- STP engine requests it

#### 11a: PIVC (Pre-Issuance Verification Call)
- Schedule video verification call
- Customer receives call link
- Agent/system verifies identity on call

#### 11b: NuralX Face Biometric
- Customer receives email link (or in-app prompt)
- Customer does face scan (30 seconds)
- Vitals collected: heart rate, respiratory rate, blood pressure, SpO2
- Results displayed: vitals card + risk score

**APIs Called**:
1. `POST /api/journey/biometrics/pivc` → start PIVC session
2. `POST /api/journey/biometrics/nuralx` → start NuralX scan (sends email link)
3. `GET /api/journey/biometrics/status` → poll completion
4. `POST /api/webhooks/nuralx` → NuralX callback (server-receives vitals)

---

### Screen 12: STP Evaluation
**Purpose**: Run underwriting engine, show decision  
**Key Elements**:
- "Evaluating your application..." (spinner during STP call)
- Result: APPROVED or REFERRED

**API Called**: `GET /api/journey/stp?applicationId=xxx`  
**External**: STP Engine API  

**STP Input Payload**:
- customer demographics, income_profile, medical_questionnaire
- id_verification_results, document_references
- biometric_results (if collected)
- selected_quote, sum_insured
- iadore_summary (litigation, company_flags, bureau_score)

**STP Output**:
- decision: 'APPROVED' | 'REFERRED'
- message: string
- documents_required: string[] (if referred)
- pivc_required: boolean
- biometric_required: boolean
- stp_score: number

---

### Screen 13a: Payment (STP Approved)
**Purpose**: Customer pays premium, policy issued instantly  
**Key Elements**:
- Premium breakdown: base premium + GST + total
- Plan summary (selected plan card)
- Payment CTA → Razorpay checkout
- On success → Policy issued screen
- On failure → retry option

**APIs Called**:
1. `POST /api/payment/create-order` → Razorpay order
2. Razorpay client-side checkout
3. `POST /api/payment/verify` → signature verify + policy trigger
4. `POST /api/policy/issue` → generate policy number + PDF

**Razorpay Order Parameters**:
- amount (in paise), currency: 'INR', receipt: application_number
- notes: { application_id, insurer_id, plan_name }

---

### Screen 13b: Under Review (Non-STP)
**Purpose**: Inform customer their application is with underwriter  
**Key Elements**:
- "Application Under Review" message
- Expected timeline: 2-3 business days
- What to expect: email from [insurer name]
- Application reference number

**Email Sent to Customer**:
- Subject: "Your health insurance application is under review"
- Body: application ID, expected timeline, contact info

---

### Screen 14: Resume After UW Decision (via Email Link)
**Purpose**: Customer resumes from email after UW approval  
**Flow**:
1. Customer clicks secure link in email
2. OTP2 sent to mobile for verification
3. Customer enters OTP2
4. Show UW decision details:
   - If approved (standard): proceed to payment
   - If approved with loading: show revised premium with breakdown
   - If approved with exclusions: show exclusion list, customer accepts
5. Customer pays via Razorpay
6. Policy issued

**Token in email link**: signed JWT, contains application_id, expires 7 days  
**APIs Called**:
1. `POST /api/auth/send-otp` (OTP2 for payment auth)
2. `POST /api/auth/verify-otp` (OTP2 verify)
3. `GET /api/applications/:id/uw-decision` → show UW decision
4. `POST /api/payment/create-order`
5. `POST /api/payment/verify`
6. `POST /api/policy/issue`

---

### Screen 15: Policy Issued
**Purpose**: Show policy confirmation, allow document download  
**Key Elements**:
- Policy number (prominent display)
- Coverage summary
- Policy start date / end date
- Premium paid
- Download Policy Document (PDF)
- Email confirmation message

---

## 6. Non-Functional Requirements

### Performance
- Landing page: LCP < 2.5s
- API route response (cached): < 200ms
- API route response (DB query): < 500ms
- External API calls: timeout after 30s, show progress indicator
- Razorpay checkout: < 3s to load

### Availability
- Target: 99.5% uptime (Vercel SLA)
- Monitoring via UptimeRobot (5-minute checks)
- Email alerts on downtime

### Security
- All routes over HTTPS (enforced by Vercel)
- API keys never exposed to browser
- OTP hashed in DB (never plaintext)
- Razorpay signature verified server-side
- File uploads: type + size validated server-side
- SQL injection: prevented by Drizzle ORM parameterized queries
- Rate limiting: OTP send — max 3/hour per mobile number
- CORS: whitelist only platform domains

### Scalability
- Current target: 5-10 applications/day, max 5,000/month
- Neon free tier: 0.5GB storage, 190 compute hours/month — sufficient for this volume
- Cloudinary free tier: 25GB storage — sufficient for this volume
- Vercel serverless: auto-scales, no config needed

### Compliance (IRDAI India)
- Data residency: Neon free tier (US region — note for production compliance)
- Policy document must include: policy number, insurer name, sum insured, premium, start/end dates, exclusions
- Customer must give explicit consent before data collection
- Right to withdraw: customer can request application cancellation before policy issuance
- KYC mandatory before policy issuance (per IRDAI/PMLA guidelines)

### Accessibility
- Responsive design: mobile + desktop
- No UI/UX details in this doc — see separate design brief

---

## 7. Phase 2 Scope (Out of Phase 1)

- Agent Portal (full-fledged sales agent dashboard)
- Multi-language support (Hindi, regional languages)
- ABDM (Ayushman Bharat Digital Mission) health records integration
- Group health insurance
- Policy renewal flow
- Claims initiation
- Chatbot / AI assistant
- Push notifications
- WhatsApp journey (via WhatsApp Business API)
- Mobile app (React Native)

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| iAdore API down during journey | Medium | High | Mock fallback in live mode; show manual entry form |
| Karza OCR failure | Medium | Medium | Allow manual doc upload without OCR; UW reviews manually |
| STP engine timeout | Low | High | 30s timeout → treat as REFERRED; don't block customer |
| Razorpay payment failure | Low | High | Retry mechanism; never auto-issue policy without verified payment |
| Neon DB cold start (free tier) | Medium | Low | First-request latency spike acceptable at this volume |
| NuralX callback never received | Medium | Medium | Polling fallback at 24hr mark; allow UW to override |
| PDF generation failure | Low | Medium | Queue retry; email link as fallback |

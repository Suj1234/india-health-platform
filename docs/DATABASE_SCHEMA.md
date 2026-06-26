# Database Schema
**Database**: `india_health_db` (Neon PostgreSQL)  
**ORM**: Drizzle ORM  
**Convention**: All IDs are UUID. All timestamps are TIMESTAMPTZ (UTC). All monetary values in INR (decimal, 2 places). Amounts are stored in rupees, not paise.

---

## Tables Overview

| Table | Purpose |
|---|---|
| `insurers` | White-label insurer configuration |
| `insurer_api_credentials` | Per-insurer external API keys |
| `users` | All portal users (underwriters, admins, customers) |
| `otp_logs` | OTP send/verify tracking |
| `applications` | Core application data (main table) |
| `application_step_logs` | Audit trail of every step |
| `quotes` | Generated quote options per application |
| `medical_questionnaires` | Health declaration form data |
| `documents` | Uploaded document metadata + OCR results |
| `id_verifications` | Karza TKYC results per ID type |
| `biometric_sessions` | PIVC and NuralX session tracking |
| `payments` | Razorpay transaction records |
| `policies` | Issued policy records |
| `underwriter_actions` | All UW decisions and actions |
| `email_logs` | Sent email audit trail |
| `api_call_logs` | External API call log (real + mock) |

---

## Full SQL Schema

```sql
-- ================================================================
-- EXTENSIONS
-- ================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ================================================================
-- TABLE: insurers
-- White-label insurer configuration
-- ================================================================
CREATE TABLE insurers (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug              VARCHAR(50) UNIQUE NOT NULL,
  -- slug used in URLs and folder paths: e.g., 'star-health', 'niva-bupa'
  name              VARCHAR(200) NOT NULL,
  logo_url          TEXT,
  mode              VARCHAR(10) NOT NULL DEFAULT 'test',
  -- 'test' = all external APIs mocked
  -- 'live' = real external APIs (fallback to mock if credentials missing)
  is_active         BOOLEAN NOT NULL DEFAULT true,
  config            JSONB NOT NULL DEFAULT '{}',
  -- {
  --   "primary_color": "#003087",
  --   "secondary_color": "#ffffff",
  --   "contact_email": "support@insurer.com",
  --   "contact_phone": "1800-xxx-xxxx",
  --   "irdai_registration": "123",
  --   "gstin": "27AAACI1234H1Z5",
  --   "website": "https://insurer.com",
  --   "free_look_days": 15,
  --   "biometric_threshold_sum_insured": 2000000,
  --   "financial_docs_threshold_sum_insured": 1000000,
  --   "stp_auto_biometric_age": 50,
  --   "skip_needs_analysis": false,
  --   "skip_pivc": false,
  --   "skip_nuralx": false
  -- }
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT insurers_mode_check CHECK (mode IN ('test', 'live'))
);

-- ================================================================
-- TABLE: insurer_api_credentials
-- Per-insurer external API credentials (encrypted at application level)
-- ================================================================
CREATE TABLE insurer_api_credentials (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insurer_id        UUID NOT NULL REFERENCES insurers(id) ON DELETE CASCADE,
  api_name          VARCHAR(50) NOT NULL,
  -- Values: 'iadore', 'karza_tkyc', 'karza_ocr', 'pmw', 'quotes',
  --         'nuralx', 'pivc', 'stp'
  credentials       JSONB NOT NULL,
  -- iAdore: { base_url, org_key, hmac_key, income_api_url }
  -- Karza:  { base_url, api_key }
  -- PMW:    { base_url, api_key }
  -- Quotes: { base_url, api_key }
  -- NuralX: { base_url, client_id, client_secret, callback_url }
  -- PIVC:   { base_url, api_key }
  -- STP:    { base_url, api_key }
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (insurer_id, api_name)
);

-- ================================================================
-- TABLE: users
-- All portal users: customers, underwriters, admins, insurer_admins
-- ================================================================
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile            VARCHAR(15) UNIQUE,
  email             VARCHAR(200),
  name              VARCHAR(200),
  password_hash     VARCHAR(200),
  -- NULL for customers (OTP-only auth)
  -- bcrypt hash for underwriters and admins
  role              VARCHAR(20) NOT NULL,
  -- 'customer' | 'underwriter' | 'insurer_admin' | 'super_admin'
  insurer_id        UUID REFERENCES insurers(id) ON DELETE SET NULL,
  -- NULL for super_admin
  -- set for underwriter and insurer_admin
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_login_at     TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT users_role_check CHECK (role IN ('customer', 'underwriter', 'insurer_admin', 'super_admin'))
);

-- ================================================================
-- TABLE: otp_logs
-- OTP send and verify tracking
-- ================================================================
CREATE TABLE otp_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile            VARCHAR(15),
  email             VARCHAR(200),
  otp_hash          VARCHAR(200) NOT NULL,
  -- SHA-256 hash of OTP (never store plaintext)
  purpose           VARCHAR(50) NOT NULL,
  -- 'mobile_verification' (OTP1) | 'payment_authorization' (OTP2)
  application_id    UUID,
  -- NULL for OTP1 (application not yet created)
  attempts          INTEGER NOT NULL DEFAULT 0,
  max_attempts      INTEGER NOT NULL DEFAULT 3,
  expires_at        TIMESTAMPTZ NOT NULL,
  used_at           TIMESTAMPTZ,
  -- NULL = unused, non-null = verified/consumed
  is_valid          BOOLEAN NOT NULL DEFAULT true,
  -- Set false after max attempts or after use
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_otp_logs_mobile ON otp_logs(mobile, created_at DESC);
CREATE INDEX idx_otp_logs_application ON otp_logs(application_id);

-- ================================================================
-- TABLE: applications
-- Main application record — one row per insurance application
-- ================================================================
CREATE TABLE applications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_number    VARCHAR(50) UNIQUE NOT NULL,
  -- Format: IH-{YYYY}-{NNNNNN} e.g. IH-2026-000001
  -- Generated on application creation
  insurer_id            UUID NOT NULL REFERENCES insurers(id),
  customer_id           UUID REFERENCES users(id),
  -- Set after OTP verification creates/links customer user

  -- ── STATUS TRACKING ──
  status                VARCHAR(50) NOT NULL DEFAULT 'initiated',
  -- See state machine in CLAUDE.md
  current_step          INTEGER NOT NULL DEFAULT 1,
  -- 1=mobile_verify, 2=basic_details, 3=profiling, 4=income,
  -- 5=needs, 6=quotes, 7=medical, 8=proposal, 9=id_verify,
  -- 10=documents, 11=biometrics, 12=stp, 13=payment, 14=policy

  -- ── LEAD DATA ──
  pan                   VARCHAR(10),
  mobile                VARCHAR(15) NOT NULL,
  email                 VARCHAR(200),
  name                  VARCHAR(200),
  dob                   DATE,
  gender                VARCHAR(10),
  -- 'male' | 'female' | 'other'

  -- ── IADORE DATA ──
  iadore_tx_id          VARCHAR(100),
  iadore_job_id         VARCHAR(100),
  -- internal async job reference
  iadore_status         VARCHAR(20) DEFAULT 'pending',
  -- 'pending' | 'running' | 'done' | 'failed'
  iadore_report         JSONB,
  -- Full parsed iAdore XML response
  iadore_summary        JSONB,
  -- Distilled summary built from iAdore report
  -- {
  --   name, dob, gender, address,
  --   employer_name, occupation_type,
  --   company_is_hazardous, gst_status,
  --   litigation_count, bureau_score,
  --   pan_category, pan_match_name
  -- }
  company_checks        JSONB,
  litigation_details    JSONB,
  bureau_data           JSONB,
  vahan_details         JSONB,
  -- Vehicle details from iAdore
  vehicle_reg_number    VARCHAR(20),

  -- ── INCOME DATA ──
  customer_declared_income     INTEGER,
  -- Annual income in INR declared by customer
  income_profile        JSONB,
  -- {
  --   sources: {
  --     customer_declared: 500000,
  --     bank_statement: 480000,
  --     bureau: 450000,
  --     vehicle_surrogate: 200000
  --   },
  --   selected_source: 'customer_declared',
  --   selected_annual_income: 500000,
  --   cross_analysis: [{source, amount, consistency}]
  -- }

  -- ── NEEDS ANALYSIS ──
  pmw_job_id            VARCHAR(100),
  pmw_data              JSONB,
  -- Full PMW API response
  needs_summary         JSONB,
  -- Distilled needs: {
  --   health_insurance: { cover_amount, premium, tiers },
  --   term_cover: { cover_amount, years, premium },
  --   critical_illness: { ... }, etc.
  -- }

  -- ── QUOTE SELECTION ──
  selected_quote_id     UUID REFERENCES quotes(id),
  -- Set when customer selects quote in step 6

  -- ── PROPOSAL DATA ──
  proposal_data         JSONB,
  -- {
  --   name, dob, gender, pan, mobile, email,
  --   address, city, state, pincode,
  --   occupation, occupation_type, annual_income,
  --   marital_status,
  --   nominee_name, nominee_relation, nominee_dob, nominee_share,
  --   members: [{ name, dob, gender, relation }],
  --   declaration_accepted: true,
  --   consent_given: true
  -- }

  -- ── STP EVALUATION ──
  stp_job_id            VARCHAR(100),
  stp_payload           JSONB,
  -- Full payload sent to STP engine
  stp_result            JSONB,
  -- Full STP engine response
  stp_decision          VARCHAR(20),
  -- 'approved' | 'referred'
  stp_score             DECIMAL(5,2),
  stp_message           TEXT,
  stp_documents_required  JSONB,
  -- List of docs STP wants
  stp_evaluated_at      TIMESTAMPTZ,

  -- ── UNDERWRITER DECISION ──
  uw_decision           VARCHAR(30),
  -- 'approved' | 'approved_with_loading' | 'approved_with_exclusion'
  -- | 'rejected' | 'more_docs_requested' | 'medical_test_requested'
  uw_loading_percent    DECIMAL(5,2),
  -- e.g. 25.00 means 25% loading on base premium
  uw_loading_amount     DECIMAL(10,2),
  -- Flat loading amount in INR (alternative to percent)
  uw_exclusions         JSONB,
  -- [{ condition, exclusion_type, duration, notes }]
  uw_rejection_reason   VARCHAR(200),
  uw_notes              TEXT,
  uw_revised_premium    DECIMAL(10,2),
  -- Final premium after loading (if any)
  uw_decided_at         TIMESTAMPTZ,
  uw_decided_by         UUID REFERENCES users(id),

  -- ── PAYMENT ──
  final_premium         DECIMAL(10,2),
  -- Amount customer must pay (may differ from quote if loading)
  payment_link_token    VARCHAR(500),
  -- Signed JWT for email payment link (non-STP)
  payment_link_expires_at  TIMESTAMPTZ,
  payment_id            UUID,
  -- FK to payments table

  -- ── POLICY ──
  policy_id             UUID,
  -- FK to policies table
  policy_number         VARCHAR(100),
  -- Denormalized for quick lookup
  policy_issued_at      TIMESTAMPTZ,

  -- ── METADATA ──
  source                VARCHAR(20) NOT NULL DEFAULT 'web',
  -- 'web' | 'email_link' | 'agent'
  ip_address            VARCHAR(45),
  user_agent            TEXT,
  utm_source            VARCHAR(100),
  utm_medium            VARCHAR(100),

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT applications_status_check CHECK (status IN (
    'initiated', 'otp_verified', 'profiling_done', 'income_done',
    'needs_done', 'quote_selected', 'medical_done', 'proposal_submitted',
    'id_verified', 'docs_uploaded', 'biometrics_done', 'stp_evaluated',
    'payment_pending', 'payment_done', 'policy_issued',
    'uw_pending', 'uw_approved', 'uw_rejected', 'uw_more_docs',
    'docs_requested', 'expired', 'cancelled'
  )),
  CONSTRAINT applications_gender_check CHECK (gender IN ('male', 'female', 'other', NULL))
);

CREATE INDEX idx_applications_insurer ON applications(insurer_id);
CREATE INDEX idx_applications_pan ON applications(pan);
CREATE INDEX idx_applications_mobile ON applications(mobile);
CREATE INDEX idx_applications_status ON applications(status);
CREATE INDEX idx_applications_created ON applications(created_at DESC);

-- ================================================================
-- TABLE: application_step_logs
-- Audit trail: every step start/complete/fail
-- ================================================================
CREATE TABLE application_step_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  step_number       INTEGER NOT NULL,
  step_name         VARCHAR(100) NOT NULL,
  -- 'mobile_verify', 'iadore_profile', 'income', etc.
  status            VARCHAR(20) NOT NULL,
  -- 'started' | 'completed' | 'failed' | 'skipped'
  input_summary     JSONB,
  -- Non-PII summary of input (for audit)
  output_summary    JSONB,
  -- Non-PII summary of output
  error_message     TEXT,
  duration_ms       INTEGER,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_step_logs_application ON application_step_logs(application_id);

-- ================================================================
-- TABLE: quotes
-- Generated quote options per application (3 per application)
-- ================================================================
CREATE TABLE quotes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  insurer_id        UUID NOT NULL REFERENCES insurers(id),
  plan_type         VARCHAR(20) NOT NULL,
  -- 'basic' | 'standard' | 'premium'
  plan_name         VARCHAR(200) NOT NULL,
  -- e.g. "Star Health Individual Gold Plan"
  plan_code         VARCHAR(100),
  -- insurer internal plan code
  sum_insured       DECIMAL(12,2) NOT NULL,
  annual_premium    DECIMAL(10,2) NOT NULL,
  -- Base premium before GST
  gst_amount        DECIMAL(10,2) NOT NULL,
  total_premium     DECIMAL(10,2) NOT NULL,
  -- annual_premium + gst_amount
  benefits          JSONB NOT NULL DEFAULT '[]',
  -- [{ name: string, description: string, limit: string }]
  exclusions        JSONB NOT NULL DEFAULT '[]',
  -- [{ name: string, description: string }]
  waiting_periods   JSONB NOT NULL DEFAULT '[]',
  -- [{ condition: string, days: number }]
  riders            JSONB NOT NULL DEFAULT '[]',
  -- [{ code, name, annual_premium, gst, total, selected: false }]
  network_hospitals_count  INTEGER,
  raw_api_response  JSONB,
  -- Full quote API response stored for reference
  is_selected       BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_quotes_application ON quotes(application_id);

-- ================================================================
-- TABLE: medical_questionnaires
-- Health declaration form (mandatory for all applications)
-- ================================================================
CREATE TABLE medical_questionnaires (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL UNIQUE REFERENCES applications(id) ON DELETE CASCADE,

  -- ── MEASUREMENTS ──
  height_cm             DECIMAL(5,2),
  weight_kg             DECIMAL(5,2),
  bmi                   DECIMAL(5,2),
  -- Auto-calculated: weight / (height/100)^2

  -- ── LIFESTYLE ──
  is_smoker             BOOLEAN NOT NULL DEFAULT false,
  tobacco_type          VARCHAR(50),
  -- 'cigarettes' | 'bidi' | 'cigars' | 'chewing' | 'multiple'
  cigarettes_per_day    INTEGER,
  smoking_years         INTEGER,
  has_quit_smoking      BOOLEAN DEFAULT false,
  quit_smoking_years    INTEGER,

  alcohol_consumption   VARCHAR(20) NOT NULL DEFAULT 'none',
  -- 'none' | 'occasional' | 'regular'
  alcohol_units_per_week INTEGER,
  alcohol_type          VARCHAR(50),

  -- ── PRE-EXISTING CONDITIONS ──
  has_diabetes              BOOLEAN NOT NULL DEFAULT false,
  has_hypertension          BOOLEAN NOT NULL DEFAULT false,
  has_heart_disease         BOOLEAN NOT NULL DEFAULT false,
  has_cancer                BOOLEAN NOT NULL DEFAULT false,
  has_kidney_disease        BOOLEAN NOT NULL DEFAULT false,
  has_liver_disease         BOOLEAN NOT NULL DEFAULT false,
  has_neurological_disorder BOOLEAN NOT NULL DEFAULT false,
  has_thyroid_disorder      BOOLEAN NOT NULL DEFAULT false,
  has_hiv_aids              BOOLEAN NOT NULL DEFAULT false,
  has_mental_health         BOOLEAN NOT NULL DEFAULT false,
  has_respiratory_disorder  BOOLEAN NOT NULL DEFAULT false,
  has_musculoskeletal       BOOLEAN NOT NULL DEFAULT false,
  has_digestive_disorder    BOOLEAN NOT NULL DEFAULT false,
  has_skin_disorder         BOOLEAN NOT NULL DEFAULT false,
  has_eye_disorder          BOOLEAN NOT NULL DEFAULT false,
  has_ear_disorder          BOOLEAN NOT NULL DEFAULT false,
  has_other_condition       BOOLEAN NOT NULL DEFAULT false,
  other_condition_details   TEXT,

  ped_details               JSONB DEFAULT '[]',
  -- [{
  --   condition: string,
  --   diagnosis_year: number,
  --   is_controlled: boolean,
  --   current_treatment: string,
  --   medications: string,
  --   last_hospitalized_year: number | null
  -- }]

  -- ── SURGICAL HISTORY ──
  has_had_surgery           BOOLEAN NOT NULL DEFAULT false,
  surgery_details           JSONB DEFAULT '[]',
  -- [{
  --   surgery_type: string,
  --   year: number,
  --   hospital: string,
  --   outcome: string
  -- }]

  -- ── FAMILY HISTORY ──
  has_family_history        BOOLEAN NOT NULL DEFAULT false,
  family_history            JSONB DEFAULT '[]',
  -- [{
  --   relation: 'father'|'mother'|'sibling'|'paternal_grandparent'|'maternal_grandparent',
  --   condition: string,
  --   age_at_onset: number | null,
  --   is_alive: boolean
  -- }]

  -- ── CURRENT MEDICATIONS ──
  is_on_medication          BOOLEAN NOT NULL DEFAULT false,
  current_medications       TEXT,

  -- ── INSURANCE HISTORY ──
  has_existing_health_insurance   BOOLEAN NOT NULL DEFAULT false,
  existing_insurance_details      JSONB DEFAULT '[]',
  -- [{ insurer, plan_name, sum_insured, since_year }]
  had_claim_last_3_years          BOOLEAN NOT NULL DEFAULT false,
  claim_details                   TEXT,
  was_ever_declined               BOOLEAN NOT NULL DEFAULT false,
  declined_details                TEXT,

  -- ── FAMILY FLOATER MEMBERS ──
  covers_family_members           BOOLEAN NOT NULL DEFAULT false,
  member_health_details           JSONB DEFAULT '[]',
  -- [{
  --   member_id: string (from proposal members),
  --   relation: string,
  --   name: string,
  --   dob: string,
  --   height_cm: number,
  --   weight_kg: number,
  --   bmi: number,
  --   is_smoker: boolean,
  --   ped_conditions: string[],
  --   ped_details: [...]
  -- }]

  -- ── RISK FLAGS (computed internally, not shown to customer) ──
  risk_flags                JSONB DEFAULT '[]',
  -- ['has_ped', 'bmi_over_30', 'smoker', 'multiple_ped', 'cancer_history']
  risk_score                INTEGER DEFAULT 0,
  -- Internal scoring: 0 (low) to 100 (high)
  biometric_recommended     BOOLEAN DEFAULT false,
  -- Computed flag: should biometrics be collected?

  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ================================================================
-- TABLE: documents
-- Uploaded document metadata and OCR results
-- ================================================================
CREATE TABLE documents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  document_type         VARCHAR(50) NOT NULL,
  -- KYC: 'aadhaar_front' | 'aadhaar_back' | 'pan_card' | 'voter_id'
  --      | 'passport' | 'photograph'
  -- Financial: 'bank_statement' | 'itr' | 'itrv' | 'payslip' | 'form_16'
  -- UW-requested: 'medical_report' | 'other'
  category              VARCHAR(20) NOT NULL,
  -- 'kyc' | 'financial' | 'medical' | 'uw_requested'
  cloudinary_public_id  VARCHAR(300) NOT NULL,
  -- Format: india-health/{insurer_slug}/{application_id}/{doc_type}_{timestamp}
  cloudinary_url        TEXT NOT NULL,
  file_name             VARCHAR(300),
  file_size_bytes       INTEGER,
  mime_type             VARCHAR(100),
  -- 'image/jpeg' | 'image/png' | 'application/pdf'

  -- ── OCR RESULTS (Karza OCR Plus) ──
  ocr_status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending' | 'queued' | 'processing' | 'done' | 'failed' | 'skipped'
  ocr_job_id            VARCHAR(100),
  -- Karza async job ID
  ocr_result            JSONB,
  -- Aadhaar: { name, dob, gender, address, pincode, uid_last4 }
  -- PAN: { name, dob, pan_number, father_name }
  -- Bank statement: { account_number, bank_name, avg_monthly_credit, periods }
  -- ITR: { pan, assessment_year, total_income, tax_paid }
  ocr_confidence        DECIMAL(5,2),
  -- 0.00 to 100.00
  ocr_processed_at      TIMESTAMPTZ,
  ocr_error             TEXT,

  is_uw_requested       BOOLEAN DEFAULT false,
  -- True if this document was uploaded after UW requested more docs
  uw_action_id          UUID,
  -- FK to underwriter_actions if uw_requested

  uploaded_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_application ON documents(application_id);
CREATE INDEX idx_documents_type ON documents(application_id, document_type);

-- ================================================================
-- TABLE: id_verifications
-- Karza TKYC verification results
-- ================================================================
CREATE TABLE id_verifications (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  id_type               VARCHAR(20) NOT NULL,
  -- 'pan' | 'voter_id' | 'passport' | 'aadhaar' (future)
  id_value              VARCHAR(50) NOT NULL,
  -- Masked in logs, full value stored here for UW review
  verification_status   VARCHAR(20) NOT NULL DEFAULT 'pending',
  -- 'pending' | 'verified' | 'failed' | 'mismatch' | 'not_found'
  match_score           DECIMAL(5,2),
  -- Name/DOB match score from Karza: 0.00 to 100.00
  verified_name         VARCHAR(200),
  -- Name as returned by verification (may differ from submitted)
  verification_response JSONB,
  -- Full Karza API response
  is_mock               BOOLEAN NOT NULL DEFAULT false,
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_id_verifications_application ON id_verifications(application_id);

-- ================================================================
-- TABLE: biometric_sessions
-- PIVC and NuralX biometric session tracking
-- ================================================================
CREATE TABLE biometric_sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  session_type      VARCHAR(20) NOT NULL,
  -- 'pivc' | 'nuralx'
  session_id        VARCHAR(200),
  -- External session/scan ID
  scan_url          TEXT,
  -- URL sent to customer for NuralX
  email_sent_at     TIMESTAMPTZ,
  status            VARCHAR(20) NOT NULL DEFAULT 'initiated',
  -- 'initiated' | 'link_sent' | 'in_progress' | 'completed' | 'failed' | 'expired'
  result            JSONB,
  -- NuralX: {
  --   risk_score: number,
  --   heart_rate: number,
  --   respiratory_rate: number,
  --   blood_pressure_systolic: number,
  --   blood_pressure_diastolic: number,
  --   oxygen_saturation: number,
  --   stress_index: number
  -- }
  -- PIVC: { outcome: 'passed'|'failed', agent_notes: string }
  is_mock           BOOLEAN NOT NULL DEFAULT false,
  completed_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_biometrics_application ON biometric_sessions(application_id);

-- ================================================================
-- TABLE: payments
-- Razorpay payment records
-- ================================================================
CREATE TABLE payments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES applications(id),
  razorpay_order_id     VARCHAR(100) UNIQUE NOT NULL,
  razorpay_payment_id   VARCHAR(100),
  razorpay_signature    VARCHAR(500),
  amount                DECIMAL(10,2) NOT NULL,
  -- Amount in INR
  amount_paise          INTEGER NOT NULL,
  -- Amount in paise (sent to Razorpay: amount * 100)
  currency              VARCHAR(5) NOT NULL DEFAULT 'INR',
  status                VARCHAR(20) NOT NULL DEFAULT 'created',
  -- 'created' | 'attempted' | 'paid' | 'failed' | 'refunded'
  payment_method        VARCHAR(50),
  -- 'card' | 'netbanking' | 'upi' | 'wallet' | 'emi'
  bank                  VARCHAR(100),
  -- Bank name if netbanking
  vpa                   VARCHAR(200),
  -- UPI VPA if UPI payment
  signature_verified    BOOLEAN DEFAULT false,
  -- Must be true before policy issuance
  is_test_mode          BOOLEAN NOT NULL DEFAULT true,
  payment_metadata      JSONB,
  -- Full Razorpay webhook payload
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT payments_status_check CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'refunded'))
);

CREATE INDEX idx_payments_application ON payments(application_id);
CREATE INDEX idx_payments_razorpay_order ON payments(razorpay_order_id);

-- ================================================================
-- TABLE: policies
-- Issued insurance policies
-- ================================================================
CREATE TABLE policies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL UNIQUE REFERENCES applications(id),
  payment_id            UUID NOT NULL REFERENCES payments(id),
  insurer_id            UUID NOT NULL REFERENCES insurers(id),
  customer_id           UUID NOT NULL REFERENCES users(id),
  quote_id              UUID REFERENCES quotes(id),

  policy_number         VARCHAR(100) UNIQUE NOT NULL,
  -- Format: {INSURER_CODE}-{YYYY}-{NNNNNNNN}
  plan_name             VARCHAR(200) NOT NULL,
  plan_code             VARCHAR(100),
  sum_insured           DECIMAL(12,2) NOT NULL,
  base_premium          DECIMAL(10,2) NOT NULL,
  loading_percent       DECIMAL(5,2) DEFAULT 0,
  loading_amount        DECIMAL(10,2) DEFAULT 0,
  final_premium         DECIMAL(10,2) NOT NULL,
  gst_amount            DECIMAL(10,2) NOT NULL,
  total_premium_paid    DECIMAL(10,2) NOT NULL,

  policy_start_date     DATE NOT NULL,
  policy_end_date       DATE NOT NULL,
  -- 1 year from start by default

  exclusions            JSONB DEFAULT '[]',
  -- Standard exclusions + UW-added exclusions
  -- [{ name, description, duration, is_permanent }]

  insured_name          VARCHAR(200) NOT NULL,
  insured_dob           DATE NOT NULL,
  insured_pan           VARCHAR(10),
  nominee_name          VARCHAR(200),
  nominee_relation      VARCHAR(100),

  members               JSONB DEFAULT '[]',
  -- For family floater: [{ name, dob, relation, member_id }]

  policy_document_url   TEXT,
  -- Cloudinary URL of generated PDF
  policy_document_public_id VARCHAR(300),

  status                VARCHAR(20) NOT NULL DEFAULT 'active',
  -- 'active' | 'cancelled' | 'expired' | 'lapsed'

  free_look_expires_at  DATE,
  -- policy_start_date + 15 days

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT policies_status_check CHECK (status IN ('active', 'cancelled', 'expired', 'lapsed'))
);

CREATE INDEX idx_policies_insurer ON policies(insurer_id);
CREATE INDEX idx_policies_customer ON policies(customer_id);
CREATE INDEX idx_policies_number ON policies(policy_number);

-- ================================================================
-- TABLE: underwriter_actions
-- All UW decisions and actions with full audit trail
-- ================================================================
CREATE TABLE underwriter_actions (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id        UUID NOT NULL REFERENCES applications(id),
  underwriter_id        UUID NOT NULL REFERENCES users(id),
  action                VARCHAR(40) NOT NULL,
  -- 'approved' | 'approved_with_loading' | 'approved_with_exclusion'
  -- | 'rejected' | 'request_more_docs' | 'request_medical_test'

  -- ── LOADING ──
  loading_type          VARCHAR(20),
  -- 'percentage' | 'flat'
  loading_percent       DECIMAL(5,2),
  loading_amount        DECIMAL(10,2),
  revised_premium       DECIMAL(10,2),

  -- ── EXCLUSIONS ──
  exclusions            JSONB DEFAULT '[]',
  -- [{ condition, type: 'permanent'|'temporary', duration_months, notes }]

  -- ── REJECTION ──
  rejection_reason_code VARCHAR(100),
  -- 'high_risk_occupation' | 'multiple_ped' | 'fraud_risk' | 'age_limit'
  -- | 'insufficient_documentation' | 'other'
  rejection_reason_text TEXT,

  -- ── MORE DOCS / MEDICAL ──
  requested_documents   JSONB DEFAULT '[]',
  -- [{ document_type, description, is_mandatory }]
  requested_tests       JSONB DEFAULT '[]',
  -- [{ test_name, description, lab_preferences }]

  -- ── COMMUNICATION ──
  customer_message      TEXT,
  -- Message sent to customer with the decision
  customer_notified_at  TIMESTAMPTZ,
  notification_email_id UUID,
  -- FK to email_logs

  -- ── NOTES ──
  internal_notes        TEXT,
  -- Not shared with customer

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uw_actions_action_check CHECK (action IN (
    'approved', 'approved_with_loading', 'approved_with_exclusion',
    'rejected', 'request_more_docs', 'request_medical_test'
  ))
);

CREATE INDEX idx_uw_actions_application ON underwriter_actions(application_id);
CREATE INDEX idx_uw_actions_underwriter ON underwriter_actions(underwriter_id);

-- ================================================================
-- TABLE: email_logs
-- All outbound email audit trail
-- ================================================================
CREATE TABLE email_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID,
  recipient_email   VARCHAR(200) NOT NULL,
  recipient_mobile  VARCHAR(15),
  -- For SMS OTPs
  email_type        VARCHAR(50) NOT NULL,
  -- 'otp_mobile' | 'otp_payment' | 'application_under_review'
  -- | 'uw_approved' | 'uw_approved_with_loading' | 'uw_approved_with_exclusion'
  -- | 'uw_rejected' | 'uw_more_docs' | 'uw_medical_test'
  -- | 'payment_link' | 'policy_issued' | 'policy_document'
  subject           VARCHAR(300),
  brevo_message_id  VARCHAR(200),
  status            VARCHAR(20) NOT NULL DEFAULT 'queued',
  -- 'queued' | 'sent' | 'failed' | 'bounced' | 'opened'
  error_message     TEXT,
  sent_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_email_logs_application ON email_logs(application_id);

-- ================================================================
-- TABLE: api_call_logs
-- Every external API call (real or mock) logged here
-- ================================================================
CREATE TABLE api_call_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id    UUID,
  insurer_id        UUID REFERENCES insurers(id),
  api_name          VARCHAR(50) NOT NULL,
  -- 'iadore' | 'karza_tkyc' | 'karza_ocr' | 'pmw' | 'quotes'
  -- | 'nuralx' | 'pivc' | 'stp'
  is_mock           BOOLEAN NOT NULL DEFAULT false,
  endpoint          TEXT,
  method            VARCHAR(10),
  status_code       INTEGER,
  request_summary   JSONB,
  -- Non-sensitive summary of request (no PII)
  response_summary  JSONB,
  -- Non-sensitive summary of response
  duration_ms       INTEGER,
  error_message     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_api_logs_application ON api_call_logs(application_id);
CREATE INDEX idx_api_logs_api_name ON api_call_logs(api_name, created_at DESC);
CREATE INDEX idx_api_logs_insurer ON api_call_logs(insurer_id, created_at DESC);

-- ================================================================
-- TRIGGERS: updated_at auto-update
-- ================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER insurers_updated_at BEFORE UPDATE ON insurers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER insurer_api_credentials_updated_at BEFORE UPDATE ON insurer_api_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER medical_questionnaires_updated_at BEFORE UPDATE ON medical_questionnaires
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER policies_updated_at BEFORE UPDATE ON policies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER biometric_sessions_updated_at BEFORE UPDATE ON biometric_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ================================================================
-- SEED: Initial super admin user
-- Password: change_me_immediately (bcrypt hash below is placeholder)
-- ================================================================
INSERT INTO users (id, email, name, password_hash, role)
VALUES (
  gen_random_uuid(),
  'admin@platform.com',
  'Platform Admin',
  '$2b$10$placeholder_hash_change_on_first_login',
  'super_admin'
);
```

---

## Drizzle Schema (TypeScript)

```typescript
// src/lib/db/schema.ts — key tables (abbreviated, expand per full SQL above)
import { pgTable, uuid, varchar, boolean, jsonb, decimal,
         integer, text, date, timestamp } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

const now = () => sql`NOW()`
const uuidDefault = () => sql`gen_random_uuid()`

export const insurers = pgTable('insurers', {
  id: uuid('id').primaryKey().default(uuidDefault()),
  slug: varchar('slug', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 200 }).notNull(),
  logoUrl: text('logo_url'),
  mode: varchar('mode', { length: 10 }).notNull().default('test'),
  isActive: boolean('is_active').notNull().default(true),
  config: jsonb('config').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(now()),
})

export const applications = pgTable('applications', {
  id: uuid('id').primaryKey().default(uuidDefault()),
  applicationNumber: varchar('application_number', { length: 50 }).unique().notNull(),
  insurerId: uuid('insurer_id').notNull().references(() => insurers.id),
  // ... all other columns
})

// Export inferred types
export type Insurer = typeof insurers.$inferSelect
export type NewInsurer = typeof insurers.$inferInsert
export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert
```

---

## Application Number Generation

```typescript
// Generate: IH-2026-000001
async function generateApplicationNumber(db: DB): Promise<string> {
  const year = new Date().getFullYear()
  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(applications)
    .where(sql`EXTRACT(YEAR FROM created_at) = ${year}`)
  
  const seq = (result[0].count + 1).toString().padStart(6, '0')
  return `IH-${year}-${seq}`
}
```

import {
  pgTable,
  uuid,
  varchar,
  boolean,
  jsonb,
  decimal,
  integer,
  text,
  date,
  timestamp,
  unique,
  index,
  check,
} from 'drizzle-orm/pg-core'
import { sql, relations } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'

const now = () => sql`NOW()`
const genUuid = () => randomUUID()

// ────────────────────────────────────────────────────────────────────────────
// TABLE: insurers
// ────────────────────────────────────────────────────────────────────────────
export const insurers = pgTable(
  'insurers',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    slug: varchar('slug', { length: 50 }).unique().notNull(),
    name: varchar('name', { length: 200 }).notNull(),
    logoUrl: text('logo_url'),
    mode: varchar('mode', { length: 10 }).notNull().default('test'),
    isActive: boolean('is_active').notNull().default(true),
    config: jsonb('config').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(now()),
  }
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: insurer_api_credentials
// ────────────────────────────────────────────────────────────────────────────
export const insurerApiCredentials = pgTable(
  'insurer_api_credentials',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    insurerId: uuid('insurer_id').notNull().references(() => insurers.id, { onDelete: 'cascade' }),
    apiName: varchar('api_name', { length: 50 }).notNull(),
    credentials: jsonb('credentials').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    uniqueInsurerApi: unique().on(t.insurerId, t.apiName),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: users
// ────────────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().$defaultFn(genUuid),
  mobile: varchar('mobile', { length: 15 }).unique(),
  email: varchar('email', { length: 200 }),
  name: varchar('name', { length: 200 }),
  passwordHash: varchar('password_hash', { length: 200 }),
  role: varchar('role', { length: 20 }).notNull(),
  insurerId: uuid('insurer_id').references(() => insurers.id, { onDelete: 'set null' }),
  isActive: boolean('is_active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(now()),
})

// ────────────────────────────────────────────────────────────────────────────
// TABLE: otp_logs
// ────────────────────────────────────────────────────────────────────────────
export const otpLogs = pgTable(
  'otp_logs',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    mobile: varchar('mobile', { length: 15 }),
    email: varchar('email', { length: 200 }),
    otpHash: varchar('otp_hash', { length: 200 }).notNull(),
    purpose: varchar('purpose', { length: 50 }).notNull(),
    applicationId: uuid('application_id'),
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    isValid: boolean('is_valid').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    mobileIdx: index('idx_otp_logs_mobile').on(t.mobile, t.createdAt),
    appIdx: index('idx_otp_logs_application').on(t.applicationId),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: applications
// ────────────────────────────────────────────────────────────────────────────
export const applications = pgTable(
  'applications',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationNumber: varchar('application_number', { length: 50 }).unique().notNull(),
    insurerId: uuid('insurer_id').notNull().references(() => insurers.id),
    customerId: uuid('customer_id').references(() => users.id),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('initiated'),
    currentStep: integer('current_step').notNull().default(1),

    // Cover type
    coverType: varchar('cover_type', { length: 20 }),            // 'individual' | 'family_floater' | 'parents'
    proposerIsInsured: boolean('proposer_is_insured').notNull().default(true),
    membersData: jsonb('members_data').default([]),               // InsuredMember[] — set at Step 2

    // Lead data
    pan: varchar('pan', { length: 10 }),
    mobile: varchar('mobile', { length: 15 }).notNull(),
    email: varchar('email', { length: 200 }),
    name: varchar('name', { length: 200 }),
    dob: date('dob'),
    gender: varchar('gender', { length: 10 }),

    // iAdore
    iadoreTxId: varchar('iadore_tx_id', { length: 100 }),
    iadoreJobId: varchar('iadore_job_id', { length: 100 }),
    iadoreStatus: varchar('iadore_status', { length: 20 }).default('pending'),
    iadoreReport: jsonb('iadore_report'),
    iadoreSummary: jsonb('iadore_summary'),
    companyChecks: jsonb('company_checks'),
    litigationDetails: jsonb('litigation_details'),
    bureauData: jsonb('bureau_data'),
    vahanDetails: jsonb('vahan_details'),
    vehicleRegNumber: varchar('vehicle_reg_number', { length: 20 }),

    // Income
    customerDeclaredIncome: integer('customer_declared_income'),
    incomeProfile: jsonb('income_profile'),

    // Needs
    pmwJobId: varchar('pmw_job_id', { length: 100 }),
    pmwData: jsonb('pmw_data'),
    needsSummary: jsonb('needs_summary'),

    // Quote
    selectedQuoteId: uuid('selected_quote_id'),
    initialSumInsured: integer('initial_sum_insured'),
    initialMembers: integer('initial_members'),
    initialPlanType: varchar('initial_plan_type', { length: 30 }),

    // Proposal
    proposalData: jsonb('proposal_data'),

    // STP
    stpJobId: varchar('stp_job_id', { length: 100 }),
    stpPayload: jsonb('stp_payload'),
    stpResult: jsonb('stp_result'),
    stpDecision: varchar('stp_decision', { length: 20 }),
    stpScore: decimal('stp_score', { precision: 5, scale: 2 }),
    stpMessage: text('stp_message'),
    stpDocumentsRequired: jsonb('stp_documents_required'),
    stpEvaluatedAt: timestamp('stp_evaluated_at', { withTimezone: true }),

    // Underwriter
    uwDecision: varchar('uw_decision', { length: 30 }),
    uwLoadingPercent: decimal('uw_loading_percent', { precision: 5, scale: 2 }),
    uwLoadingAmount: decimal('uw_loading_amount', { precision: 10, scale: 2 }),
    uwExclusions: jsonb('uw_exclusions'),
    uwRejectionReason: varchar('uw_rejection_reason', { length: 200 }),
    uwNotes: text('uw_notes'),
    uwRevisedPremium: decimal('uw_revised_premium', { precision: 10, scale: 2 }),
    uwDecidedAt: timestamp('uw_decided_at', { withTimezone: true }),
    uwDecidedBy: uuid('uw_decided_by').references(() => users.id),

    // Payment
    finalPremium: decimal('final_premium', { precision: 10, scale: 2 }),
    paymentLinkToken: varchar('payment_link_token', { length: 500 }),
    paymentLinkExpiresAt: timestamp('payment_link_expires_at', { withTimezone: true }),
    paymentId: uuid('payment_id'),

    // Policy
    policyId: uuid('policy_id'),
    policyNumber: varchar('policy_number', { length: 100 }),
    policyIssuedAt: timestamp('policy_issued_at', { withTimezone: true }),

    // Metadata
    source: varchar('source', { length: 20 }).notNull().default('web'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    utmSource: varchar('utm_source', { length: 100 }),
    utmMedium: varchar('utm_medium', { length: 100 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    insurerIdx: index('idx_applications_insurer').on(t.insurerId),
    panIdx: index('idx_applications_pan').on(t.pan),
    mobileIdx: index('idx_applications_mobile').on(t.mobile),
    statusIdx: index('idx_applications_status').on(t.status),
    createdIdx: index('idx_applications_created').on(t.createdAt),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: application_step_logs
// ────────────────────────────────────────────────────────────────────────────
export const applicationStepLogs = pgTable(
  'application_step_logs',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    stepNumber: integer('step_number').notNull(),
    stepName: varchar('step_name', { length: 100 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    inputSummary: jsonb('input_summary'),
    outputSummary: jsonb('output_summary'),
    errorMessage: text('error_message'),
    durationMs: integer('duration_ms'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    appIdx: index('idx_step_logs_application').on(t.applicationId),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: quotes
// ────────────────────────────────────────────────────────────────────────────
export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    insurerId: uuid('insurer_id').notNull().references(() => insurers.id),
    planType: varchar('plan_type', { length: 20 }).notNull(),
    planName: varchar('plan_name', { length: 200 }).notNull(),
    planCode: varchar('plan_code', { length: 100 }),
    sumInsured: decimal('sum_insured', { precision: 12, scale: 2 }).notNull(),
    annualPremium: decimal('annual_premium', { precision: 10, scale: 2 }).notNull(),
    gstAmount: decimal('gst_amount', { precision: 10, scale: 2 }).notNull(),
    totalPremium: decimal('total_premium', { precision: 10, scale: 2 }).notNull(),
    benefits: jsonb('benefits').notNull().default([]),
    exclusions: jsonb('exclusions').notNull().default([]),
    waitingPeriods: jsonb('waiting_periods').notNull().default([]),
    riders: jsonb('riders').notNull().default([]),
    networkHospitalsCount: integer('network_hospitals_count'),
    rawApiResponse: jsonb('raw_api_response'),
    isSelected: boolean('is_selected').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    appIdx: index('idx_quotes_application').on(t.applicationId),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: medical_questionnaires
// ────────────────────────────────────────────────────────────────────────────
export const medicalQuestionnaires = pgTable('medical_questionnaires', {
  id: uuid('id').primaryKey().$defaultFn(genUuid),
  applicationId: uuid('application_id').notNull().unique().references(() => applications.id, { onDelete: 'cascade' }),

  // Measurements
  heightCm: decimal('height_cm', { precision: 5, scale: 2 }),
  weightKg: decimal('weight_kg', { precision: 5, scale: 2 }),
  bmi: decimal('bmi', { precision: 5, scale: 2 }),

  // Lifestyle
  isSmoker: boolean('is_smoker').notNull().default(false),
  tobaccoType: varchar('tobacco_type', { length: 50 }),
  cigarettesPerDay: integer('cigarettes_per_day'),
  smokingYears: integer('smoking_years'),
  hasQuitSmoking: boolean('has_quit_smoking').default(false),
  quitSmokingYears: integer('quit_smoking_years'),
  alcoholConsumption: varchar('alcohol_consumption', { length: 20 }).notNull().default('none'),
  alcoholUnitsPerWeek: integer('alcohol_units_per_week'),
  alcoholType: varchar('alcohol_type', { length: 50 }),

  // Pre-existing conditions
  hasDiabetes: boolean('has_diabetes').notNull().default(false),
  hasHypertension: boolean('has_hypertension').notNull().default(false),
  hasHeartDisease: boolean('has_heart_disease').notNull().default(false),
  hasCancer: boolean('has_cancer').notNull().default(false),
  hasKidneyDisease: boolean('has_kidney_disease').notNull().default(false),
  hasLiverDisease: boolean('has_liver_disease').notNull().default(false),
  hasNeurologicalDisorder: boolean('has_neurological_disorder').notNull().default(false),
  hasThyroidDisorder: boolean('has_thyroid_disorder').notNull().default(false),
  hasHivAids: boolean('has_hiv_aids').notNull().default(false),
  hasMentalHealth: boolean('has_mental_health').notNull().default(false),
  hasRespiratoryDisorder: boolean('has_respiratory_disorder').notNull().default(false),
  hasMusculoskeletal: boolean('has_musculoskeletal').notNull().default(false),
  hasDigestiveDisorder: boolean('has_digestive_disorder').notNull().default(false),
  hasSkinDisorder: boolean('has_skin_disorder').notNull().default(false),
  hasEyeDisorder: boolean('has_eye_disorder').notNull().default(false),
  hasEarDisorder: boolean('has_ear_disorder').notNull().default(false),
  hasOtherCondition: boolean('has_other_condition').notNull().default(false),
  otherConditionDetails: text('other_condition_details'),
  pedDetails: jsonb('ped_details').default([]),

  // Surgical history
  hasHadSurgery: boolean('has_had_surgery').notNull().default(false),
  surgeryDetails: jsonb('surgery_details').default([]),

  // Family history
  hasFamilyHistory: boolean('has_family_history').notNull().default(false),
  familyHistory: jsonb('family_history').default([]),

  // Medications
  isOnMedication: boolean('is_on_medication').notNull().default(false),
  currentMedications: text('current_medications'),

  // Insurance history
  hasExistingHealthInsurance: boolean('has_existing_health_insurance').notNull().default(false),
  existingInsuranceDetails: jsonb('existing_insurance_details').default([]),
  hadClaimLast3Years: boolean('had_claim_last_3_years').notNull().default(false),
  claimDetails: text('claim_details'),
  wasEverDeclined: boolean('was_ever_declined').notNull().default(false),
  declinedDetails: text('declined_details'),

  // Family floater members
  coversFamilyMembers: boolean('covers_family_members').notNull().default(false),
  memberHealthDetails: jsonb('member_health_details').default([]),

  // Risk (computed)
  riskFlags: jsonb('risk_flags').default([]),
  riskScore: integer('risk_score').default(0),
  biometricRecommended: boolean('biometric_recommended').default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(now()),
})

// ────────────────────────────────────────────────────────────────────────────
// TABLE: documents
// ────────────────────────────────────────────────────────────────────────────
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    documentType: varchar('document_type', { length: 50 }).notNull(),
    category: varchar('category', { length: 20 }).notNull(),
    cloudinaryPublicId: varchar('cloudinary_public_id', { length: 300 }).notNull(),
    cloudinaryUrl: text('cloudinary_url').notNull(),
    fileName: varchar('file_name', { length: 300 }),
    fileSizeBytes: integer('file_size_bytes'),
    mimeType: varchar('mime_type', { length: 100 }),

    // OCR
    ocrStatus: varchar('ocr_status', { length: 20 }).notNull().default('pending'),
    ocrJobId: varchar('ocr_job_id', { length: 100 }),
    ocrResult: jsonb('ocr_result'),
    ocrConfidence: decimal('ocr_confidence', { precision: 5, scale: 2 }),
    ocrProcessedAt: timestamp('ocr_processed_at', { withTimezone: true }),
    ocrError: text('ocr_error'),

    // Ownership — which member this document belongs to
    belongsToMemberId: uuid('belongs_to_member_id'),             // null = proposer's doc
    belongsToRole: varchar('belongs_to_role', { length: 30 }),   // 'proposer' | 'father' | 'mother' | 'spouse' | 'child_1' etc.

    isUwRequested: boolean('is_uw_requested').default(false),
    uwActionId: uuid('uw_action_id'),

    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    appIdx: index('idx_documents_application').on(t.applicationId),
    typeIdx: index('idx_documents_type').on(t.applicationId, t.documentType),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: id_verifications
// ────────────────────────────────────────────────────────────────────────────
export const idVerifications = pgTable(
  'id_verifications',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    idType: varchar('id_type', { length: 20 }).notNull(),
    idValue: varchar('id_value', { length: 50 }).notNull(),
    verificationStatus: varchar('verification_status', { length: 20 }).notNull().default('pending'),
    matchScore: decimal('match_score', { precision: 5, scale: 2 }),
    verifiedName: varchar('verified_name', { length: 200 }),
    verificationResponse: jsonb('verification_response'),
    isMock: boolean('is_mock').notNull().default(false),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    appIdx: index('idx_id_verifications_application').on(t.applicationId),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: biometric_sessions
// ────────────────────────────────────────────────────────────────────────────
export const biometricSessions = pgTable(
  'biometric_sessions',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationId: uuid('application_id').notNull().references(() => applications.id, { onDelete: 'cascade' }),
    sessionType: varchar('session_type', { length: 20 }).notNull(),
    sessionId: varchar('session_id', { length: 200 }),
    scanUrl: text('scan_url'),
    emailSentAt: timestamp('email_sent_at', { withTimezone: true }),
    status: varchar('status', { length: 20 }).notNull().default('initiated'),
    result: jsonb('result'),
    isMock: boolean('is_mock').notNull().default(false),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    appIdx: index('idx_biometrics_application').on(t.applicationId),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: payments
// ────────────────────────────────────────────────────────────────────────────
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationId: uuid('application_id').notNull().references(() => applications.id),
    razorpayOrderId: varchar('razorpay_order_id', { length: 100 }).unique().notNull(),
    razorpayPaymentId: varchar('razorpay_payment_id', { length: 100 }),
    razorpaySignature: varchar('razorpay_signature', { length: 500 }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    amountPaise: integer('amount_paise').notNull(),
    currency: varchar('currency', { length: 5 }).notNull().default('INR'),
    status: varchar('status', { length: 20 }).notNull().default('created'),
    paymentMethod: varchar('payment_method', { length: 50 }),
    bank: varchar('bank', { length: 100 }),
    vpa: varchar('vpa', { length: 200 }),
    signatureVerified: boolean('signature_verified').default(false),
    isTestMode: boolean('is_test_mode').notNull().default(true),
    paymentMetadata: jsonb('payment_metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    appIdx: index('idx_payments_application').on(t.applicationId),
    orderIdx: index('idx_payments_razorpay_order').on(t.razorpayOrderId),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: policies
// ────────────────────────────────────────────────────────────────────────────
export const policies = pgTable(
  'policies',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationId: uuid('application_id').notNull().unique().references(() => applications.id),
    paymentId: uuid('payment_id').notNull().references(() => payments.id),
    insurerId: uuid('insurer_id').notNull().references(() => insurers.id),
    customerId: uuid('customer_id').notNull().references(() => users.id),
    quoteId: uuid('quote_id').references(() => quotes.id),

    policyNumber: varchar('policy_number', { length: 100 }).unique().notNull(),
    planName: varchar('plan_name', { length: 200 }).notNull(),
    planCode: varchar('plan_code', { length: 100 }),
    sumInsured: decimal('sum_insured', { precision: 12, scale: 2 }).notNull(),
    basePremium: decimal('base_premium', { precision: 10, scale: 2 }).notNull(),
    loadingPercent: decimal('loading_percent', { precision: 5, scale: 2 }).default('0'),
    loadingAmount: decimal('loading_amount', { precision: 10, scale: 2 }).default('0'),
    finalPremium: decimal('final_premium', { precision: 10, scale: 2 }).notNull(),
    gstAmount: decimal('gst_amount', { precision: 10, scale: 2 }).notNull(),
    totalPremiumPaid: decimal('total_premium_paid', { precision: 10, scale: 2 }).notNull(),

    policyStartDate: date('policy_start_date').notNull(),
    policyEndDate: date('policy_end_date').notNull(),

    exclusions: jsonb('exclusions').default([]),

    insuredName: varchar('insured_name', { length: 200 }).notNull(),
    insuredDob: date('insured_dob').notNull(),
    insuredPan: varchar('insured_pan', { length: 10 }),
    nomineeName: varchar('nominee_name', { length: 200 }),
    nomineeRelation: varchar('nominee_relation', { length: 100 }),

    members: jsonb('members').default([]),

    policyDocumentUrl: text('policy_document_url'),
    policyDocumentPublicId: varchar('policy_document_public_id', { length: 300 }),

    status: varchar('status', { length: 20 }).notNull().default('active'),

    freeLookExpiresAt: date('free_look_expires_at'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    insurerIdx: index('idx_policies_insurer').on(t.insurerId),
    customerIdx: index('idx_policies_customer').on(t.customerId),
    numberIdx: index('idx_policies_number').on(t.policyNumber),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: underwriter_actions
// ────────────────────────────────────────────────────────────────────────────
export const underwriterActions = pgTable(
  'underwriter_actions',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationId: uuid('application_id').notNull().references(() => applications.id),
    underwriterId: uuid('underwriter_id').notNull().references(() => users.id),
    action: varchar('action', { length: 40 }).notNull(),

    // Loading
    loadingType: varchar('loading_type', { length: 20 }),
    loadingPercent: decimal('loading_percent', { precision: 5, scale: 2 }),
    loadingAmount: decimal('loading_amount', { precision: 10, scale: 2 }),
    revisedPremium: decimal('revised_premium', { precision: 10, scale: 2 }),

    // Exclusions
    exclusions: jsonb('exclusions').default([]),

    // Rejection
    rejectionReasonCode: varchar('rejection_reason_code', { length: 100 }),
    rejectionReasonText: text('rejection_reason_text'),

    // More docs / medical
    requestedDocuments: jsonb('requested_documents').default([]),
    requestedTests: jsonb('requested_tests').default([]),

    // Communication
    customerMessage: text('customer_message'),
    customerNotifiedAt: timestamp('customer_notified_at', { withTimezone: true }),
    notificationEmailId: uuid('notification_email_id'),

    // Notes
    internalNotes: text('internal_notes'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    appIdx: index('idx_uw_actions_application').on(t.applicationId),
    uwIdx: index('idx_uw_actions_underwriter').on(t.underwriterId),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: email_logs
// ────────────────────────────────────────────────────────────────────────────
export const emailLogs = pgTable(
  'email_logs',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationId: uuid('application_id'),
    recipientEmail: varchar('recipient_email', { length: 200 }).notNull(),
    recipientMobile: varchar('recipient_mobile', { length: 15 }),
    emailType: varchar('email_type', { length: 50 }).notNull(),
    subject: varchar('subject', { length: 300 }),
    brevoMessageId: varchar('brevo_message_id', { length: 200 }),
    status: varchar('status', { length: 20 }).notNull().default('queued'),
    errorMessage: text('error_message'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    appIdx: index('idx_email_logs_application').on(t.applicationId),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// TABLE: api_call_logs
// ────────────────────────────────────────────────────────────────────────────
export const apiCallLogs = pgTable(
  'api_call_logs',
  {
    id: uuid('id').primaryKey().$defaultFn(genUuid),
    applicationId: uuid('application_id'),
    insurerId: uuid('insurer_id').references(() => insurers.id),
    apiName: varchar('api_name', { length: 50 }).notNull(),
    isMock: boolean('is_mock').notNull().default(false),
    endpoint: text('endpoint'),
    method: varchar('method', { length: 10 }),
    statusCode: integer('status_code'),
    requestSummary: jsonb('request_summary'),
    responseSummary: jsonb('response_summary'),
    durationMs: integer('duration_ms'),
    errorMessage: text('error_message'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(now()),
  },
  (t) => ({
    appIdx: index('idx_api_logs_application').on(t.applicationId),
    apiIdx: index('idx_api_logs_api_name').on(t.apiName, t.createdAt),
    insurerIdx: index('idx_api_logs_insurer').on(t.insurerId, t.createdAt),
  })
)

// ────────────────────────────────────────────────────────────────────────────
// RELATIONS
// ────────────────────────────────────────────────────────────────────────────
export const insurersRelations = relations(insurers, ({ many }) => ({
  credentials: many(insurerApiCredentials),
  users: many(users),
  applications: many(applications),
  policies: many(policies),
  apiCallLogs: many(apiCallLogs),
}))

export const applicationsRelations = relations(applications, ({ one, many }) => ({
  insurer: one(insurers, { fields: [applications.insurerId], references: [insurers.id] }),
  customer: one(users, { fields: [applications.customerId], references: [users.id] }),
  quotes: many(quotes),
  documents: many(documents),
  idVerifications: many(idVerifications),
  biometricSessions: many(biometricSessions),
  medicalQuestionnaire: one(medicalQuestionnaires, {
    fields: [applications.id],
    references: [medicalQuestionnaires.applicationId],
  }),
  uwActions: many(underwriterActions),
  stepLogs: many(applicationStepLogs),
}))

// ────────────────────────────────────────────────────────────────────────────
// INFERRED TYPES
// ────────────────────────────────────────────────────────────────────────────
export type Insurer = typeof insurers.$inferSelect
export type NewInsurer = typeof insurers.$inferInsert
export type InsurerApiCredential = typeof insurerApiCredentials.$inferSelect
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type OtpLog = typeof otpLogs.$inferSelect
export type Application = typeof applications.$inferSelect
export type NewApplication = typeof applications.$inferInsert
export type ApplicationStepLog = typeof applicationStepLogs.$inferSelect
export type Quote = typeof quotes.$inferSelect
export type NewQuote = typeof quotes.$inferInsert
export type MedicalQuestionnaire = typeof medicalQuestionnaires.$inferSelect
export type NewMedicalQuestionnaire = typeof medicalQuestionnaires.$inferInsert
export type Document = typeof documents.$inferSelect
export type NewDocument = typeof documents.$inferInsert
export type IdVerification = typeof idVerifications.$inferSelect
export type BiometricSession = typeof biometricSessions.$inferSelect
export type Payment = typeof payments.$inferSelect
export type NewPayment = typeof payments.$inferInsert
export type Policy = typeof policies.$inferSelect
export type NewPolicy = typeof policies.$inferInsert
export type UnderwriterAction = typeof underwriterActions.$inferSelect
export type NewUnderwriterAction = typeof underwriterActions.$inferInsert
export type EmailLog = typeof emailLogs.$inferSelect
export type ApiCallLog = typeof apiCallLogs.$inferSelect

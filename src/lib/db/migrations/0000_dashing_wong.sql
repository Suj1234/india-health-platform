CREATE TABLE IF NOT EXISTS "api_call_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid,
	"insurer_id" uuid,
	"api_name" varchar(50) NOT NULL,
	"is_mock" boolean DEFAULT false NOT NULL,
	"endpoint" text,
	"method" varchar(10),
	"status_code" integer,
	"request_summary" jsonb,
	"response_summary" jsonb,
	"duration_ms" integer,
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "application_step_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"step_number" integer NOT NULL,
	"step_name" varchar(100) NOT NULL,
	"status" varchar(20) NOT NULL,
	"input_summary" jsonb,
	"output_summary" jsonb,
	"error_message" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "applications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_number" varchar(50) NOT NULL,
	"insurer_id" uuid NOT NULL,
	"customer_id" uuid,
	"status" varchar(50) DEFAULT 'initiated' NOT NULL,
	"current_step" integer DEFAULT 1 NOT NULL,
	"pan" varchar(10),
	"mobile" varchar(15) NOT NULL,
	"email" varchar(200),
	"name" varchar(200),
	"dob" date,
	"gender" varchar(10),
	"iadore_tx_id" varchar(100),
	"iadore_job_id" varchar(100),
	"iadore_status" varchar(20) DEFAULT 'pending',
	"iadore_report" jsonb,
	"iadore_summary" jsonb,
	"company_checks" jsonb,
	"litigation_details" jsonb,
	"bureau_data" jsonb,
	"vahan_details" jsonb,
	"vehicle_reg_number" varchar(20),
	"customer_declared_income" integer,
	"income_profile" jsonb,
	"pmw_job_id" varchar(100),
	"pmw_data" jsonb,
	"needs_summary" jsonb,
	"selected_quote_id" uuid,
	"initial_sum_insured" integer,
	"initial_members" integer,
	"initial_plan_type" varchar(30),
	"proposal_data" jsonb,
	"stp_job_id" varchar(100),
	"stp_payload" jsonb,
	"stp_result" jsonb,
	"stp_decision" varchar(20),
	"stp_score" numeric(5, 2),
	"stp_message" text,
	"stp_documents_required" jsonb,
	"stp_evaluated_at" timestamp with time zone,
	"uw_decision" varchar(30),
	"uw_loading_percent" numeric(5, 2),
	"uw_loading_amount" numeric(10, 2),
	"uw_exclusions" jsonb,
	"uw_rejection_reason" varchar(200),
	"uw_notes" text,
	"uw_revised_premium" numeric(10, 2),
	"uw_decided_at" timestamp with time zone,
	"uw_decided_by" uuid,
	"final_premium" numeric(10, 2),
	"payment_link_token" varchar(500),
	"payment_link_expires_at" timestamp with time zone,
	"payment_id" uuid,
	"policy_id" uuid,
	"policy_number" varchar(100),
	"policy_issued_at" timestamp with time zone,
	"source" varchar(20) DEFAULT 'web' NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "applications_application_number_unique" UNIQUE("application_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "biometric_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"session_type" varchar(20) NOT NULL,
	"session_id" varchar(200),
	"scan_url" text,
	"email_sent_at" timestamp with time zone,
	"status" varchar(20) DEFAULT 'initiated' NOT NULL,
	"result" jsonb,
	"is_mock" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"category" varchar(20) NOT NULL,
	"cloudinary_public_id" varchar(300) NOT NULL,
	"cloudinary_url" text NOT NULL,
	"file_name" varchar(300),
	"file_size_bytes" integer,
	"mime_type" varchar(100),
	"ocr_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"ocr_job_id" varchar(100),
	"ocr_result" jsonb,
	"ocr_confidence" numeric(5, 2),
	"ocr_processed_at" timestamp with time zone,
	"ocr_error" text,
	"is_uw_requested" boolean DEFAULT false,
	"uw_action_id" uuid,
	"uploaded_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid,
	"recipient_email" varchar(200) NOT NULL,
	"recipient_mobile" varchar(15),
	"email_type" varchar(50) NOT NULL,
	"subject" varchar(300),
	"brevo_message_id" varchar(200),
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"error_message" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "id_verifications" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"id_type" varchar(20) NOT NULL,
	"id_value" varchar(50) NOT NULL,
	"verification_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"match_score" numeric(5, 2),
	"verified_name" varchar(200),
	"verification_response" jsonb,
	"is_mock" boolean DEFAULT false NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "insurer_api_credentials" (
	"id" uuid PRIMARY KEY NOT NULL,
	"insurer_id" uuid NOT NULL,
	"api_name" varchar(50) NOT NULL,
	"credentials" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "insurer_api_credentials_insurer_id_api_name_unique" UNIQUE("insurer_id","api_name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "insurers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"slug" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"logo_url" text,
	"mode" varchar(10) DEFAULT 'test' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "insurers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "medical_questionnaires" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"height_cm" numeric(5, 2),
	"weight_kg" numeric(5, 2),
	"bmi" numeric(5, 2),
	"is_smoker" boolean DEFAULT false NOT NULL,
	"tobacco_type" varchar(50),
	"cigarettes_per_day" integer,
	"smoking_years" integer,
	"has_quit_smoking" boolean DEFAULT false,
	"quit_smoking_years" integer,
	"alcohol_consumption" varchar(20) DEFAULT 'none' NOT NULL,
	"alcohol_units_per_week" integer,
	"alcohol_type" varchar(50),
	"has_diabetes" boolean DEFAULT false NOT NULL,
	"has_hypertension" boolean DEFAULT false NOT NULL,
	"has_heart_disease" boolean DEFAULT false NOT NULL,
	"has_cancer" boolean DEFAULT false NOT NULL,
	"has_kidney_disease" boolean DEFAULT false NOT NULL,
	"has_liver_disease" boolean DEFAULT false NOT NULL,
	"has_neurological_disorder" boolean DEFAULT false NOT NULL,
	"has_thyroid_disorder" boolean DEFAULT false NOT NULL,
	"has_hiv_aids" boolean DEFAULT false NOT NULL,
	"has_mental_health" boolean DEFAULT false NOT NULL,
	"has_respiratory_disorder" boolean DEFAULT false NOT NULL,
	"has_musculoskeletal" boolean DEFAULT false NOT NULL,
	"has_digestive_disorder" boolean DEFAULT false NOT NULL,
	"has_skin_disorder" boolean DEFAULT false NOT NULL,
	"has_eye_disorder" boolean DEFAULT false NOT NULL,
	"has_ear_disorder" boolean DEFAULT false NOT NULL,
	"has_other_condition" boolean DEFAULT false NOT NULL,
	"other_condition_details" text,
	"ped_details" jsonb DEFAULT '[]'::jsonb,
	"has_had_surgery" boolean DEFAULT false NOT NULL,
	"surgery_details" jsonb DEFAULT '[]'::jsonb,
	"has_family_history" boolean DEFAULT false NOT NULL,
	"family_history" jsonb DEFAULT '[]'::jsonb,
	"is_on_medication" boolean DEFAULT false NOT NULL,
	"current_medications" text,
	"has_existing_health_insurance" boolean DEFAULT false NOT NULL,
	"existing_insurance_details" jsonb DEFAULT '[]'::jsonb,
	"had_claim_last_3_years" boolean DEFAULT false NOT NULL,
	"claim_details" text,
	"was_ever_declined" boolean DEFAULT false NOT NULL,
	"declined_details" text,
	"covers_family_members" boolean DEFAULT false NOT NULL,
	"member_health_details" jsonb DEFAULT '[]'::jsonb,
	"risk_flags" jsonb DEFAULT '[]'::jsonb,
	"risk_score" integer DEFAULT 0,
	"biometric_recommended" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "medical_questionnaires_application_id_unique" UNIQUE("application_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "otp_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mobile" varchar(15),
	"email" varchar(200),
	"otp_hash" varchar(200) NOT NULL,
	"purpose" varchar(50) NOT NULL,
	"application_id" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"is_valid" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"razorpay_order_id" varchar(100) NOT NULL,
	"razorpay_payment_id" varchar(100),
	"razorpay_signature" varchar(500),
	"amount" numeric(10, 2) NOT NULL,
	"amount_paise" integer NOT NULL,
	"currency" varchar(5) DEFAULT 'INR' NOT NULL,
	"status" varchar(20) DEFAULT 'created' NOT NULL,
	"payment_method" varchar(50),
	"bank" varchar(100),
	"vpa" varchar(200),
	"signature_verified" boolean DEFAULT false,
	"is_test_mode" boolean DEFAULT true NOT NULL,
	"payment_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "payments_razorpay_order_id_unique" UNIQUE("razorpay_order_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policies" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"payment_id" uuid NOT NULL,
	"insurer_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"quote_id" uuid,
	"policy_number" varchar(100) NOT NULL,
	"plan_name" varchar(200) NOT NULL,
	"plan_code" varchar(100),
	"sum_insured" numeric(12, 2) NOT NULL,
	"base_premium" numeric(10, 2) NOT NULL,
	"loading_percent" numeric(5, 2) DEFAULT '0',
	"loading_amount" numeric(10, 2) DEFAULT '0',
	"final_premium" numeric(10, 2) NOT NULL,
	"gst_amount" numeric(10, 2) NOT NULL,
	"total_premium_paid" numeric(10, 2) NOT NULL,
	"policy_start_date" date NOT NULL,
	"policy_end_date" date NOT NULL,
	"exclusions" jsonb DEFAULT '[]'::jsonb,
	"insured_name" varchar(200) NOT NULL,
	"insured_dob" date NOT NULL,
	"insured_pan" varchar(10),
	"nominee_name" varchar(200),
	"nominee_relation" varchar(100),
	"members" jsonb DEFAULT '[]'::jsonb,
	"policy_document_url" text,
	"policy_document_public_id" varchar(300),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"free_look_expires_at" date,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "policies_application_id_unique" UNIQUE("application_id"),
	CONSTRAINT "policies_policy_number_unique" UNIQUE("policy_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "quotes" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"insurer_id" uuid NOT NULL,
	"plan_type" varchar(20) NOT NULL,
	"plan_name" varchar(200) NOT NULL,
	"plan_code" varchar(100),
	"sum_insured" numeric(12, 2) NOT NULL,
	"annual_premium" numeric(10, 2) NOT NULL,
	"gst_amount" numeric(10, 2) NOT NULL,
	"total_premium" numeric(10, 2) NOT NULL,
	"benefits" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"waiting_periods" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"riders" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"network_hospitals_count" integer,
	"raw_api_response" jsonb,
	"is_selected" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "underwriter_actions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"underwriter_id" uuid NOT NULL,
	"action" varchar(40) NOT NULL,
	"loading_type" varchar(20),
	"loading_percent" numeric(5, 2),
	"loading_amount" numeric(10, 2),
	"revised_premium" numeric(10, 2),
	"exclusions" jsonb DEFAULT '[]'::jsonb,
	"rejection_reason_code" varchar(100),
	"rejection_reason_text" text,
	"requested_documents" jsonb DEFAULT '[]'::jsonb,
	"requested_tests" jsonb DEFAULT '[]'::jsonb,
	"customer_message" text,
	"customer_notified_at" timestamp with time zone,
	"notification_email_id" uuid,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"mobile" varchar(15),
	"email" varchar(200),
	"name" varchar(200),
	"password_hash" varchar(200),
	"role" varchar(20) NOT NULL,
	"insurer_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	CONSTRAINT "users_mobile_unique" UNIQUE("mobile")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "api_call_logs" ADD CONSTRAINT "api_call_logs_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "application_step_logs" ADD CONSTRAINT "application_step_logs_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "applications" ADD CONSTRAINT "applications_uw_decided_by_users_id_fk" FOREIGN KEY ("uw_decided_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "biometric_sessions" ADD CONSTRAINT "biometric_sessions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "documents" ADD CONSTRAINT "documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "id_verifications" ADD CONSTRAINT "id_verifications_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "insurer_api_credentials" ADD CONSTRAINT "insurer_api_credentials_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "medical_questionnaires" ADD CONSTRAINT "medical_questionnaires_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_customer_id_users_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "policies" ADD CONSTRAINT "policies_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotes" ADD CONSTRAINT "quotes_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "quotes" ADD CONSTRAINT "quotes_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "underwriter_actions" ADD CONSTRAINT "underwriter_actions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "underwriter_actions" ADD CONSTRAINT "underwriter_actions_underwriter_id_users_id_fk" FOREIGN KEY ("underwriter_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "users" ADD CONSTRAINT "users_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_logs_application" ON "api_call_logs" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_logs_api_name" ON "api_call_logs" USING btree ("api_name","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_api_logs_insurer" ON "api_call_logs" USING btree ("insurer_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_step_logs_application" ON "application_step_logs" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_applications_insurer" ON "applications" USING btree ("insurer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_applications_pan" ON "applications" USING btree ("pan");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_applications_mobile" ON "applications" USING btree ("mobile");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_applications_status" ON "applications" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_applications_created" ON "applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_biometrics_application" ON "biometric_sessions" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documents_application" ON "documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_documents_type" ON "documents" USING btree ("application_id","document_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_logs_application" ON "email_logs" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_id_verifications_application" ON "id_verifications" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_logs_mobile" ON "otp_logs" USING btree ("mobile","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otp_logs_application" ON "otp_logs" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_application" ON "payments" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_razorpay_order" ON "payments" USING btree ("razorpay_order_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_policies_insurer" ON "policies" USING btree ("insurer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_policies_customer" ON "policies" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_policies_number" ON "policies" USING btree ("policy_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quotes_application" ON "quotes" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_uw_actions_application" ON "underwriter_actions" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_uw_actions_underwriter" ON "underwriter_actions" USING btree ("underwriter_id");

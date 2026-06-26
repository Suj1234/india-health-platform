ALTER TABLE "api_call_logs" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "application_step_logs" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "applications" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "biometric_sessions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "email_logs" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "id_verifications" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "insurer_api_credentials" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "insurers" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "medical_questionnaires" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "otp_logs" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "payments" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "policies" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "quotes" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "underwriter_actions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "cover_type" varchar(20);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "proposer_is_insured" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "members_data" jsonb DEFAULT '[]'::jsonb;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "belongs_to_member_id" uuid;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "belongs_to_role" varchar(30);
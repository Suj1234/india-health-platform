ALTER TABLE "otp_logs" ADD COLUMN "karza_request_id" varchar(200);--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "mobile_enrichment_data" jsonb;

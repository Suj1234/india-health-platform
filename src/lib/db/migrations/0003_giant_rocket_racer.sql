CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"insurer_id" uuid,
	"actor_user_id" uuid NOT NULL,
	"actor_role" varchar(20) NOT NULL,
	"impersonation_session_id" uuid,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" uuid,
	"field_changed" varchar(100),
	"old_value" text,
	"new_value" text,
	"ip_address" varchar(45),
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "impersonation_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"superadmin_user_id" uuid NOT NULL,
	"target_user_id" uuid NOT NULL,
	"insurer_id" uuid NOT NULL,
	"started_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"ended_at" timestamp with time zone,
	"end_reason" varchar(20),
	"ip_address" varchar(45)
);
--> statement-breakpoint
ALTER TABLE "applications" ADD COLUMN "mobile_enrichment_data" jsonb;--> statement-breakpoint
ALTER TABLE "otp_logs" ADD COLUMN "karza_request_id" varchar(200);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "must_change_password" boolean DEFAULT false NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_superadmin_user_id_users_id_fk" FOREIGN KEY ("superadmin_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "impersonation_sessions" ADD CONSTRAINT "impersonation_sessions_insurer_id_insurers_id_fk" FOREIGN KEY ("insurer_id") REFERENCES "public"."insurers"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_insurer" ON "audit_logs" USING btree ("insurer_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_impersonation_superadmin" ON "impersonation_sessions" USING btree ("superadmin_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_impersonation_insurer" ON "impersonation_sessions" USING btree ("insurer_id","started_at");
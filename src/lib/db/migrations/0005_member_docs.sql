CREATE TABLE IF NOT EXISTS "member_documents" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"member_id" varchar(100) NOT NULL,
	"member_role" varchar(30),
	"doc_type" varchar(20) NOT NULL,
	"upload_method" varchar(20) NOT NULL,
	"side" varchar(10) NOT NULL,
	"cloudinary_public_id" varchar(300),
	"cloudinary_url" text,
	"file_name" varchar(300),
	"file_size_bytes" integer,
	"mime_type" varchar(100),
	"ocr_raw" jsonb,
	"ocr_name" varchar(200),
	"ocr_dob" varchar(20),
	"ocr_doc_number" varchar(50),
	"ocr_address" jsonb,
	"validation_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"quality_flags" text[],
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT NOW() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "digilocker_sessions" (
	"id" uuid PRIMARY KEY NOT NULL,
	"application_id" uuid NOT NULL,
	"member_id" varchar(100) NOT NULL,
	"request_id" text NOT NULL,
	"doc_type" varchar(10) NOT NULL,
	"created_at" timestamp with time zone DEFAULT NOW() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "member_documents" ADD CONSTRAINT "member_documents_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "digilocker_sessions" ADD CONSTRAINT "digilocker_sessions_application_id_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."applications"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_member_docs_application" ON "member_documents" USING btree ("application_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_member_docs_member" ON "member_documents" USING btree ("application_id","member_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_digilocker_sessions_member" ON "digilocker_sessions" USING btree ("application_id","member_id");

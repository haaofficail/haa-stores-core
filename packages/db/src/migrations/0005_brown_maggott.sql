CREATE TABLE IF NOT EXISTS "kyc_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"profile_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"file_url" varchar(500) NOT NULL,
	"filename" varchar(255) NOT NULL,
	"mime_type" varchar(100) NOT NULL,
	"size_bytes" integer NOT NULL,
	"status" varchar(30) DEFAULT 'uploaded' NOT NULL,
	"rejection_reason" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kyc_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"tenant_id" integer NOT NULL,
	"business_type" varchar(30) DEFAULT 'individual' NOT NULL,
	"legal_name" varchar(255),
	"commercial_name" varchar(255),
	"national_id_or_iqama" varchar(20),
	"commercial_registration_number" varchar(50),
	"freelance_document_number" varchar(50),
	"vat_number" varchar(50),
	"country" varchar(100) DEFAULT 'SA',
	"city" varchar(100),
	"address" text,
	"status" varchar(30) DEFAULT 'not_started' NOT NULL,
	"submitted_at" timestamp,
	"reviewed_at" timestamp,
	"reviewed_by" integer,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "kyc_profiles_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "merchant_bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"account_holder_name" varchar(255) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"iban" varchar(34) NOT NULL,
	"iban_last4" varchar(4),
	"status" varchar(30) DEFAULT 'submitted' NOT NULL,
	"is_default" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kyc_documents" ADD CONSTRAINT "kyc_documents_profile_id_kyc_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."kyc_profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "kyc_profiles" ADD CONSTRAINT "kyc_profiles_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "merchant_bank_accounts" ADD CONSTRAINT "merchant_bank_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

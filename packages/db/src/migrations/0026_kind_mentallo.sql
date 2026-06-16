CREATE TABLE "oto_shipments" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"shipment_id" integer,
	"oto_order_id" varchar(255),
	"provider_shipment_id" varchar(255),
	"delivery_option_id" varchar(255),
	"delivery_company_name" varchar(255),
	"tracking_number" varchar(100),
	"tracking_url" varchar(500),
	"label_url" varchar(500),
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"sync_status" varchar(50) DEFAULT 'pending' NOT NULL,
	"error_code" varchar(100),
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oto_vendor_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"integration_model" varchar(50) DEFAULT 'marketplace_vendor' NOT NULL,
	"oto_vendor_email" varchar(255),
	"oto_client_id" varchar(255),
	"oto_vendor_status" varchar(50) DEFAULT 'not_registered' NOT NULL,
	"remaining_credit" numeric(12, 2),
	"validity_date" varchar(50),
	"registered_at" timestamp,
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "oto_vendor_mappings_store_id_unique" UNIQUE("store_id")
);
--> statement-breakpoint
CREATE TABLE "sender_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"sender_name" varchar(120) NOT NULL,
	"sender_phone" varchar(20) NOT NULL,
	"sender_email" varchar(255),
	"sender_country" varchar(2) DEFAULT 'SA' NOT NULL,
	"sender_city" varchar(100) NOT NULL,
	"sender_address_line" text NOT NULL,
	"sender_short_address_code" varchar(50),
	"lat" numeric(10, 7),
	"lon" numeric(10, 7),
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_provider_transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"settlement_batch_id" integer,
	"provider" varchar(50) DEFAULT 'geidea' NOT NULL,
	"provider_transaction_id" varchar(255) NOT NULL,
	"order_id" integer,
	"order_number" varchar(50),
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'SAR' NOT NULL,
	"gateway_fees" numeric(14, 2) DEFAULT '0' NOT NULL,
	"platform_fees" numeric(14, 2) DEFAULT '0' NOT NULL,
	"merchant_payable" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"reconciliation_status" varchar(30) DEFAULT 'unmatched' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_request_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"actor_user_id" integer,
	"actor_role" varchar(80),
	"event_type" varchar(80) NOT NULL,
	"from_status" varchar(30),
	"to_status" varchar(30),
	"amount" numeric(14, 2),
	"reason" text,
	"metadata" jsonb,
	"ip_address" varchar(50),
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"wallet_account_id" integer NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'SAR' NOT NULL,
	"status" varchar(30) DEFAULT 'requested' NOT NULL,
	"reference" varchar(100) NOT NULL,
	"bank_account_id" integer,
	"requested_by_user_id" integer,
	"reviewed_by_user_id" integer,
	"approved_by_user_id" integer,
	"transferred_by_user_id" integer,
	"verified_by_user_id" integer,
	"rejected_by_user_id" integer,
	"rejection_reason" text,
	"failure_reason" text,
	"internal_notes" text,
	"public_notes" text,
	"metadata" jsonb,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"reviewed_at" timestamp,
	"approved_at" timestamp,
	"processed_at" timestamp,
	"transferred_at" timestamp,
	"verified_at" timestamp,
	"paid_at" timestamp,
	"failed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payout_transfer_proofs" (
	"id" serial PRIMARY KEY NOT NULL,
	"payout_request_id" integer NOT NULL,
	"bank_reference" varchar(120) NOT NULL,
	"bank_name" varchar(100) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'SAR' NOT NULL,
	"transferred_at" timestamp NOT NULL,
	"transferred_by_user_id" integer NOT NULL,
	"beneficiary_name" varchar(255) NOT NULL,
	"beneficiary_iban_masked" varchar(40) NOT NULL,
	"proof_file_key" varchar(500),
	"notes" text,
	"verification_status" varchar(30) DEFAULT 'pending' NOT NULL,
	"verified_by_user_id" integer,
	"verified_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settlement_batches" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(50) DEFAULT 'geidea' NOT NULL,
	"provider_batch_id" varchar(255),
	"currency" varchar(3) DEFAULT 'SAR' NOT NULL,
	"gross_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"gateway_fees" numeric(14, 2) DEFAULT '0' NOT NULL,
	"platform_fees" numeric(14, 2) DEFAULT '0' NOT NULL,
	"merchant_payable" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" varchar(30) DEFAULT 'pending' NOT NULL,
	"reconciled_at" timestamp,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_settlement_readiness" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer,
	"funds_model" varchar(80) DEFAULT 'platform_collects_and_settles' NOT NULL,
	"safeguarded_account_configured" boolean DEFAULT false NOT NULL,
	"psp_settlement_partner_confirmed" boolean DEFAULT false NOT NULL,
	"merchant_of_record_confirmed" boolean DEFAULT false NOT NULL,
	"sama_compliance_status" varchar(40) DEFAULT 'unconfirmed' NOT NULL,
	"live_payout_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "provider_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"provider_type" varchar(50) NOT NULL,
	"provider_name" varchar(50) NOT NULL,
	"integration_model" varchar(50) DEFAULT 'not_configured' NOT NULL,
	"mode" varchar(20) DEFAULT 'sandbox' NOT NULL,
	"status" varchar(50) DEFAULT 'not_configured' NOT NULL,
	"external_vendor_id" varchar(255),
	"credentials_encrypted" text,
	"last_verified_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"customer_id" integer,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(20),
	"subject" varchar(500) NOT NULL,
	"message" text NOT NULL,
	"status" varchar(30) DEFAULT 'open' NOT NULL,
	"priority" varchar(20) DEFAULT 'medium' NOT NULL,
	"assigned_to" integer,
	"access_token" uuid DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ticket_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticket_id" integer NOT NULL,
	"author_type" varchar(20) NOT NULL,
	"author_id" integer,
	"message" text NOT NULL,
	"attachments" jsonb,
	"is_staff_reply" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "knowledge_base_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(500) NOT NULL,
	"content" text NOT NULL,
	"category" varchar(100),
	"is_published" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"event_type" varchar(50) NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"customer_id" integer,
	"product_id" integer,
	"cart_id" uuid,
	"order_id" integer,
	"path" text,
	"referrer" text,
	"device_type" varchar(50),
	"user_agent" text,
	"ip_address" varchar(45),
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_content" varchar(255),
	"utm_term" varchar(255),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketing_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"customer_id" integer,
	"cart_id" uuid,
	"order_id" integer,
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"utm_content" varchar(255),
	"utm_term" varchar(255),
	"landing_page" text,
	"referrer" text,
	"first_event_at" timestamp DEFAULT now() NOT NULL,
	"last_event_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketing_sessions_store_session_unique" UNIQUE("store_id","session_id")
);
--> statement-breakpoint
CREATE TABLE "product_performance_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"date" date NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"add_to_carts" integer DEFAULT 0 NOT NULL,
	"purchases" integer DEFAULT 0 NOT NULL,
	"revenue" numeric(12, 2) DEFAULT '0',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_performance_daily_store_product_date_unique" UNIQUE("store_id","product_id","date")
);
--> statement-breakpoint
ALTER TABLE "cart_items" DROP CONSTRAINT "cart_items_variant_id_products_id_fk";
--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "welcome_message" text;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "welcome_message_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "preparation_time" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "preparation_time_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "min_order_amount" numeric(14, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "min_order_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "city" varchar(100);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "district" varchar(100);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "street" varchar(255);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "postal_code" varchar(20);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "latitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "longitude" numeric(10, 7);--> statement-breakpoint
ALTER TABLE "shipments" ADD COLUMN "provider_shipment_id" varchar(255);--> statement-breakpoint
ALTER TABLE "oto_shipments" ADD CONSTRAINT "oto_shipments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oto_shipments" ADD CONSTRAINT "oto_shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oto_shipments" ADD CONSTRAINT "oto_shipments_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oto_vendor_mappings" ADD CONSTRAINT "oto_vendor_mappings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sender_locations" ADD CONSTRAINT "sender_locations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_transactions" ADD CONSTRAINT "payment_provider_transactions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_provider_transactions" ADD CONSTRAINT "ppt_settlement_batch_id_sb_id_fk" FOREIGN KEY ("settlement_batch_id") REFERENCES "public"."settlement_batches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_events" ADD CONSTRAINT "payout_events_payout_request_id_payout_requests_id_fk" FOREIGN KEY ("payout_request_id") REFERENCES "public"."payout_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_events" ADD CONSTRAINT "payout_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_events" ADD CONSTRAINT "payout_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_wallet_account_id_wallet_accounts_id_fk" FOREIGN KEY ("wallet_account_id") REFERENCES "public"."wallet_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_reviewed_by_user_id_users_id_fk" FOREIGN KEY ("reviewed_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_transferred_by_user_id_users_id_fk" FOREIGN KEY ("transferred_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_requests" ADD CONSTRAINT "payout_requests_rejected_by_user_id_users_id_fk" FOREIGN KEY ("rejected_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_transfer_proofs" ADD CONSTRAINT "payout_transfer_proofs_payout_request_id_payout_requests_id_fk" FOREIGN KEY ("payout_request_id") REFERENCES "public"."payout_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_transfer_proofs" ADD CONSTRAINT "payout_transfer_proofs_transferred_by_user_id_users_id_fk" FOREIGN KEY ("transferred_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payout_transfer_proofs" ADD CONSTRAINT "payout_transfer_proofs_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_settlement_readiness" ADD CONSTRAINT "wallet_settlement_readiness_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_connections" ADD CONSTRAINT "provider_connections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_messages" ADD CONSTRAINT "ticket_messages_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "knowledge_base_articles" ADD CONSTRAINT "knowledge_base_articles_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_events" ADD CONSTRAINT "marketing_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_sessions" ADD CONSTRAINT "marketing_sessions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_sessions" ADD CONSTRAINT "marketing_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketing_sessions" ADD CONSTRAINT "marketing_sessions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_performance_daily" ADD CONSTRAINT "product_performance_daily_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_performance_daily" ADD CONSTRAINT "product_performance_daily_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "payment_provider_transactions_store_provider_idx" ON "payment_provider_transactions" USING btree ("store_id","provider","provider_transaction_id");--> statement-breakpoint
CREATE INDEX "payment_provider_transactions_store_reconciliation_idx" ON "payment_provider_transactions" USING btree ("store_id","reconciliation_status");--> statement-breakpoint
CREATE INDEX "payout_events_payout_created_at_idx" ON "payout_events" USING btree ("payout_request_id","created_at");--> statement-breakpoint
CREATE INDEX "payout_events_store_created_at_idx" ON "payout_events" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "payout_requests_store_status_idx" ON "payout_requests" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "payout_requests_reference_idx" ON "payout_requests" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "payout_transfer_proofs_payout_idx" ON "payout_transfer_proofs" USING btree ("payout_request_id");--> statement-breakpoint
CREATE INDEX "settlement_batches_provider_batch_idx" ON "settlement_batches" USING btree ("provider","provider_batch_id");--> statement-breakpoint
CREATE INDEX "settlement_batches_status_idx" ON "settlement_batches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "wallet_settlement_readiness_store_idx" ON "wallet_settlement_readiness" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "support_tickets_store_status_idx" ON "support_tickets" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "support_tickets_store_created_idx" ON "support_tickets" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "support_tickets_customer_idx" ON "support_tickets" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "ticket_messages_ticket_idx" ON "ticket_messages" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "kb_articles_store_published_idx" ON "knowledge_base_articles" USING btree ("store_id","is_published");--> statement-breakpoint
CREATE INDEX "kb_articles_store_category_idx" ON "knowledge_base_articles" USING btree ("store_id","category");--> statement-breakpoint
CREATE INDEX "kb_articles_store_slug_idx" ON "knowledge_base_articles" USING btree ("store_id","slug");--> statement-breakpoint
CREATE INDEX "marketing_events_store_event_type_idx" ON "marketing_events" USING btree ("store_id","event_type","created_at");--> statement-breakpoint
CREATE INDEX "marketing_events_store_session_idx" ON "marketing_events" USING btree ("store_id","session_id");--> statement-breakpoint
CREATE INDEX "marketing_events_store_created_at_idx" ON "marketing_events" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "marketing_events_session_idx" ON "marketing_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "marketing_events_customer_idx" ON "marketing_events" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "marketing_sessions_store_customer_idx" ON "marketing_sessions" USING btree ("store_id","customer_id");--> statement-breakpoint
CREATE INDEX "marketing_sessions_store_cart_idx" ON "marketing_sessions" USING btree ("store_id","cart_id");--> statement-breakpoint
CREATE INDEX "marketing_sessions_store_order_idx" ON "marketing_sessions" USING btree ("store_id","order_id");--> statement-breakpoint
CREATE INDEX "product_performance_daily_store_date_idx" ON "product_performance_daily" USING btree ("store_id","date");--> statement-breakpoint
CREATE INDEX "product_performance_daily_product_date_idx" ON "product_performance_daily" USING btree ("product_id","date");--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;
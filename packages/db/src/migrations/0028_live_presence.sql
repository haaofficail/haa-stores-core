CREATE TABLE "marketplace_order_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"marketplace_order_id" integer NOT NULL,
	"order_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"store_name" varchar(255) NOT NULL,
	"store_slug" varchar(255) NOT NULL,
	"subtotal" numeric(12, 2) NOT NULL,
	"shipping_cost" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"platform_commission" numeric(12, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_order_links_order_id_unique" UNIQUE("order_id")
);
--> statement-breakpoint
CREATE TABLE "marketplace_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"marketplace_order_number" varchar(50) NOT NULL,
	"status" varchar(30) DEFAULT 'created' NOT NULL,
	"payment_status" varchar(30) DEFAULT 'unpaid' NOT NULL,
	"fulfillment_status" varchar(30) DEFAULT 'unfulfilled' NOT NULL,
	"customer_name" varchar(100) NOT NULL,
	"customer_phone" varchar(20) NOT NULL,
	"customer_email" varchar(255),
	"shipping_address" jsonb,
	"subtotal" numeric(12, 2) NOT NULL,
	"shipping_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total" numeric(12, 2) NOT NULL,
	"platform_commission" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_method" varchar(50),
	"notes" varchar(1000),
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_orders_marketplace_order_number_unique" UNIQUE("marketplace_order_number")
);
--> statement-breakpoint
CREATE TABLE "live_presence" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"current_path" text,
	"current_page_type" varchar(50),
	"current_product_id" integer,
	"current_cart_id" uuid,
	"current_cart_value" numeric(12, 2),
	"is_in_checkout" boolean DEFAULT false NOT NULL,
	"device_type" varchar(20),
	"os" varchar(20),
	"browser" varchar(30),
	"screen_size" varchar(10),
	"utm_source" varchar(255),
	"utm_medium" varchar(255),
	"utm_campaign" varchar(255),
	"referrer" text,
	"last_seen_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "live_presence_store_session_unique" UNIQUE("store_id","session_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "membership_permissions" (
	"id" serial PRIMARY KEY NOT NULL,
	"membership_id" integer NOT NULL,
	"permission_key" varchar(100) NOT NULL,
	"scope_type" varchar(20) DEFAULT 'store' NOT NULL,
	"scope_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"created_by_user_id" integer
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "haa_marketplace_enabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "haa_marketplace_commission_rate" numeric(5, 4) DEFAULT '0.0500' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "haa_marketplace_review_status" varchar(30) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "haa_marketplace_review_note" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "haa_marketplace_reviewed_at" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "haa_marketplace_reviewed_by" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "haa_marketplace_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "haa_marketplace_featured_until" timestamp;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "haa_marketplace_featured_sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "source" varchar(30) DEFAULT 'storefront' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "source" varchar(30) DEFAULT 'storefront' NOT NULL;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "platform_commission_rate" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "platform_commission" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "platform_commission" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "marketplace_order_links" ADD CONSTRAINT "mol_marketplace_order_id_mo_id_fk" FOREIGN KEY ("marketplace_order_id") REFERENCES "public"."marketplace_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_links" ADD CONSTRAINT "marketplace_order_links_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_presence" ADD CONSTRAINT "live_presence_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "live_presence" ADD CONSTRAINT "live_presence_current_product_id_products_id_fk" FOREIGN KEY ("current_product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_permissions" ADD CONSTRAINT "membership_permissions_membership_id_tenant_users_id_fk" FOREIGN KEY ("membership_id") REFERENCES "public"."tenant_users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "marketplace_order_links_marketplace_order_idx" ON "marketplace_order_links" USING btree ("marketplace_order_id");--> statement-breakpoint
CREATE INDEX "marketplace_order_links_store_idx" ON "marketplace_order_links" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "marketplace_orders_created_at_idx" ON "marketplace_orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "marketplace_orders_customer_phone_idx" ON "marketplace_orders" USING btree ("customer_phone");--> statement-breakpoint
CREATE INDEX "live_presence_store_last_seen_idx" ON "live_presence" USING btree ("store_id","last_seen_at");--> statement-breakpoint
CREATE INDEX "live_presence_store_page_type_idx" ON "live_presence" USING btree ("store_id","current_page_type");--> statement-breakpoint
CREATE INDEX "products_haa_marketplace_idx" ON "products" USING btree ("haa_marketplace_enabled","haa_marketplace_review_status","status","created_at");
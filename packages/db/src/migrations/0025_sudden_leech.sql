CREATE TABLE "pickup_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"name_ar" varchar(255) NOT NULL,
	"name_en" varchar(255),
	"address" text,
	"maps_url" varchar(500),
	"phone" varchar(20),
	"hours" jsonb,
	"instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_payment_provider_credentials" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"provider_code" varchar(20) NOT NULL,
	"encrypted_payload" text NOT NULL,
	"key_version" varchar(20) DEFAULT 'v1' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"rotated_at" timestamp,
	CONSTRAINT "uq_payment_creds_store_provider" UNIQUE("store_id","provider_code")
);
--> statement-breakpoint
CREATE TABLE "merchant_payment_provider_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"provider_code" varchar(20) NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"mode" varchar(10) DEFAULT 'test' NOT NULL,
	"country" varchar(3) DEFAULT 'SA' NOT NULL,
	"currency" varchar(3) DEFAULT 'SAR' NOT NULL,
	"display_name_ar" varchar(100),
	"display_name_en" varchar(100),
	"sort_order" integer DEFAULT 0 NOT NULL,
	"min_order_amount" numeric(12, 2),
	"max_order_amount" numeric(12, 2),
	"supported_payment_method" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'not_configured' NOT NULL,
	"last_validated_at" timestamp,
	"last_validation_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "uq_payment_settings_store_provider" UNIQUE("store_id","provider_code")
);
--> statement-breakpoint
CREATE TABLE "size_guides" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"name" varchar(120) NOT NULL,
	"type" varchar(40) DEFAULT 'clothing' NOT NULL,
	"unit" varchar(10) DEFAULT 'cm' NOT NULL,
	"rows" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_acknowledgements" (
	"id" serial PRIMARY KEY NOT NULL,
	"merchant_user_id" integer NOT NULL,
	"store_id" integer NOT NULL,
	"terms_version" varchar(20) NOT NULL,
	"privacy_version" varchar(20) NOT NULL,
	"data_processing_version" varchar(20) NOT NULL,
	"prohibited_products_version" varchar(20) NOT NULL,
	"takedown_policy_version" varchar(20) NOT NULL,
	"acknowledged_items" jsonb NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"accepted_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_settings" ALTER COLUMN "product_features" SET DEFAULT '{"imageLightbox":true,"stickyCart":true,"trustBadges":true,"badgeMaroof":false,"badgeSaudiBusinessCenter":false,"badgeSaudiMade":false,"reviews":true,"shareButton":true,"deliveryEstimate":true,"sizeGuide":true,"alsoBought":true,"recentlyViewed":true,"priceAlert":true,"giftWrap":true,"sendAsGift":true,"pickup":true,"stockBar":true,"liveViewers":true,"compareBadges":true}'::jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "token_version" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "gift_wrap_default_price" numeric(12, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "gift_message_max_length" integer DEFAULT 250;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "gift_wrap_instructions" text;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "pickup_instructions" text;--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "publish_status" varchar(20) DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "product_variants" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gift_wrap_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gift_wrap_price_override" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "gift_wrap_selected" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "gift_wrap_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "send_as_gift" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "gift_message" varchar(1000);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "gift_wrap_selected" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "gift_wrap_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "send_as_gift" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "gift_message" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_type" varchar(20) DEFAULT 'shipping';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_location_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gift_options" jsonb;--> statement-breakpoint
ALTER TABLE "shipping_methods" ADD COLUMN "config" jsonb;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "order_ready_for_pickup" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD COLUMN "order_picked_up" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payment_provider_credentials" ADD CONSTRAINT "merchant_payment_provider_credentials_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_payment_provider_settings" ADD CONSTRAINT "merchant_payment_provider_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "size_guides" ADD CONSTRAINT "size_guides_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "size_guides_store_active_idx" ON "size_guides" USING btree ("store_id","is_active");
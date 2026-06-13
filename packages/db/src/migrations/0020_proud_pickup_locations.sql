ALTER TABLE "products" ADD COLUMN "gift_wrap_available" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "gift_wrap_price_override" numeric(12,2);--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "gift_wrap_default_price" numeric(12,2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "gift_message_max_length" integer DEFAULT 250;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "gift_wrap_instructions" text;--> statement-breakpoint
ALTER TABLE "store_settings" ADD COLUMN "pickup_instructions" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "fulfillment_type" varchar(20) DEFAULT 'shipping';--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "pickup_location_id" integer;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "gift_options" jsonb;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "gift_wrap_selected" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "gift_wrap_price" numeric(12,2);--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "send_as_gift" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "order_items" ADD COLUMN "gift_message" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pickup_locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "store_id" integer NOT NULL REFERENCES "stores"("id"),
  "name_ar" varchar(255) NOT NULL,
  "name_en" varchar(255),
  "address" text,
  "maps_url" varchar(500),
  "hours" jsonb,
  "instructions" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE "live_radar_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL,
	"online_visitors" integer DEFAULT 0 NOT NULL,
	"active_product_viewers" integer DEFAULT 0 NOT NULL,
	"active_carts" integer DEFAULT 0 NOT NULL,
	"active_checkouts" integer DEFAULT 0 NOT NULL,
	"current_cart_value_total" numeric(12, 2) DEFAULT '0' NOT NULL,
	"orders_last_30_min" integer DEFAULT 0 NOT NULL,
	"paid_orders_last_30_min" integer DEFAULT 0 NOT NULL,
	"revenue_last_30_min" numeric(12, 2) DEFAULT '0' NOT NULL,
	"payment_failures_last_30_min" integer DEFAULT 0 NOT NULL,
	"top_pages" jsonb,
	"top_products" jsonb,
	"top_sources" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "live_radar_snapshots_store_created_at_unique" UNIQUE("store_id","created_at")
);
--> statement-breakpoint
ALTER TABLE "live_radar_snapshots" ADD CONSTRAINT "live_radar_snapshots_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "live_radar_snapshots_store_created_at_idx" ON "live_radar_snapshots" USING btree ("store_id","created_at");
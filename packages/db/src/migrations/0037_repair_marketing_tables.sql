CREATE TABLE IF NOT EXISTS "marketing_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL REFERENCES "public"."stores"("id"),
	"event_type" varchar(50) NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"customer_id" integer REFERENCES "public"."customers"("id"),
	"product_id" integer REFERENCES "public"."products"("id"),
	"cart_id" uuid,
	"order_id" integer REFERENCES "public"."orders"("id"),
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
CREATE TABLE IF NOT EXISTS "marketing_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL REFERENCES "public"."stores"("id"),
	"session_id" varchar(255) NOT NULL,
	"customer_id" integer REFERENCES "public"."customers"("id"),
	"cart_id" uuid,
	"order_id" integer REFERENCES "public"."orders"("id"),
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
CREATE TABLE IF NOT EXISTS "product_performance_daily" (
	"id" serial PRIMARY KEY NOT NULL,
	"store_id" integer NOT NULL REFERENCES "public"."stores"("id"),
	"product_id" integer NOT NULL REFERENCES "public"."products"("id"),
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
CREATE INDEX IF NOT EXISTS "marketing_events_store_event_type_idx" ON "marketing_events" USING btree ("store_id","event_type","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_events_store_session_idx" ON "marketing_events" USING btree ("store_id","session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_events_store_created_at_idx" ON "marketing_events" USING btree ("store_id","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_events_session_idx" ON "marketing_events" USING btree ("session_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_events_customer_idx" ON "marketing_events" USING btree ("customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_sessions_store_customer_idx" ON "marketing_sessions" USING btree ("store_id","customer_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_sessions_store_cart_idx" ON "marketing_sessions" USING btree ("store_id","cart_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_sessions_store_order_idx" ON "marketing_sessions" USING btree ("store_id","order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_performance_daily_store_date_idx" ON "product_performance_daily" USING btree ("store_id","date");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_performance_daily_product_date_idx" ON "product_performance_daily" USING btree ("product_id","date");

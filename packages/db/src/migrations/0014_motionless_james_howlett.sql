ALTER TABLE "products" ADD COLUMN "marketplace_channels" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "source" varchar(30) DEFAULT 'storefront' NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "external_id" varchar(255);
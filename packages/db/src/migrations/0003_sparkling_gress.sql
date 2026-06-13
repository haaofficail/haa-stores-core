ALTER TABLE "coupons" ADD COLUMN "name" varchar(255) DEFAULT '' NOT NULL;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "coupons" ADD COLUMN "max_discount_amount" numeric(12, 2);

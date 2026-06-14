ALTER TABLE "live_presence" ADD COLUMN "country_code" varchar(2);--> statement-breakpoint
ALTER TABLE "live_presence" ADD COLUMN "country_name" varchar(100);--> statement-breakpoint
ALTER TABLE "live_presence" ADD COLUMN "region_name" varchar(100);--> statement-breakpoint
ALTER TABLE "live_presence" ADD COLUMN "city_name" varchar(100);--> statement-breakpoint
ALTER TABLE "live_presence" ADD COLUMN "geo_accuracy" varchar(20);--> statement-breakpoint
CREATE INDEX "live_presence_store_country_idx" ON "live_presence" USING btree ("store_id","country_code");
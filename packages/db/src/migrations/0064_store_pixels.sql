-- Store social media pixel configuration
CREATE TABLE IF NOT EXISTS "store_pixels" (
  "id" serial PRIMARY KEY,
  "store_id" integer NOT NULL REFERENCES "stores"("id") ON DELETE CASCADE,
  "meta_pixel_id" varchar(50),
  "meta_access_token" text,
  "tiktok_pixel_id" varchar(50),
  "snapchat_pixel_id" varchar(50),
  "twitter_pixel_id" varchar(50),
  "ga4_measurement_id" varchar(50),
  "gtm_container_id" varchar(50),
  "pinterest_tag_id" varchar(50),
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "store_pixels_store_id_unique" UNIQUE ("store_id")
);

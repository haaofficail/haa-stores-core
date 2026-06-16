-- Store demo flags
-- Extracted from 0046_smiling_phil_sheldon.sql (the rest was duplicate content)
-- Idempotent: safe to re-run

ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "is_demo" boolean DEFAULT false NOT NULL;
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "demo_profile" varchar(50);
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "demo_seed_version" varchar(50);

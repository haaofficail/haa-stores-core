-- TASK-0041 Phase 2 — Track 2.2 — P0-1 SFDA Workflow
--
-- Plan: docs/ops/MARKETPLACE_HARDENING_PLAN.md §4 Phase 2.2.
--
-- Adds SFDA (Saudi Food & Drug Authority) columns to products + a
-- requires_sfda flag on categories. Together they form the contract
-- for regulated product categories (food, drug, medical_device,
-- cosmetic, supplement).
--
-- products (6 columns):
--   requires_sfda_number  : boolean, default false
--                            (per-product override; usually driven by
--                             category-level requires_sfda)
--   sfda_number           : varchar(100), nullable
--                            Format: [A-Z0-9-]{5,50} (regex-validated)
--   sfda_license_type     : varchar(30), nullable
--   sfda_expiry_date      : timestamp, nullable
--   sfda_verified_at      : timestamp, nullable
--                            Set by admin on review (TASK-0040 P0-5
--                            audit log captures this)
--   sfda_verified_by      : integer, nullable
--                            Admin user id who verified
--
-- categories (1 column):
--   requires_sfda         : boolean, default false
--                            Links to category-level rule. When true,
--                            products in this category must have a
--                            valid sfda_number to be published.
--
-- Default values preserve existing behavior: all existing rows get
-- requires_sfda_number=false and requires_sfda=false. No business
-- behavior changes at migration time. Admin must explicitly mark
-- categories as SFDA-required + products must opt in.

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "requires_sfda_number" boolean NOT NULL DEFAULT false;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "sfda_number" varchar(100);

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "sfda_license_type" varchar(30);

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "sfda_expiry_date" timestamp;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "sfda_verified_at" timestamp;

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "sfda_verified_by" integer;

-- Composite index for SFDA workflow: find products in regulated
-- categories that have been verified (or not) by admin.
CREATE INDEX IF NOT EXISTS "products_sfda_verification_idx"
  ON "products" ("requires_sfda_number", "sfda_verified_at");

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "requires_sfda" boolean NOT NULL DEFAULT false;

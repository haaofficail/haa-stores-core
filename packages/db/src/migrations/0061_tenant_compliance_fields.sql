-- TASK-0038 G1-G10 — Compliance fields on tenants table
--
-- Plan: docs/ops/MARKETPLACE_HARDENING_PLAN.md + 10 docs/ops/OWNER_ACTION_G*.md
-- Each owner action adds a column to the tenants table to track
-- compliance status. Engineering uses these fields to:
--   1. Gate features (e.g., block payouts until CR exists)
--   2. Display compliance status in admin dashboard
--   3. Generate regulatory reports (ZATCA, MoCI, NCA)
--
-- Defaults are null/empty — owner fills these as they progress
-- through G1 → G10.

ALTER TABLE "tenants"
  ADD COLUMN IF NOT EXISTS "commercial_registration_number" varchar(20),
  ADD COLUMN IF NOT EXISTS "commercial_registration_issued_at" timestamp,
  ADD COLUMN IF NOT EXISTS "vat_number" varchar(20),
  ADD COLUMN IF NOT EXISTS "vat_registered_at" timestamp,
  ADD COLUMN IF NOT EXISTS "ecommerce_license_number" varchar(30),
  ADD COLUMN IF NOT EXISTS "ecommerce_license_issued_at" timestamp,
  ADD COLUMN IF NOT EXISTS "ecommerce_license_expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "dpo_email" varchar(255),
  ADD COLUMN IF NOT EXISTS "dpo_phone" varchar(20),
  ADD COLUMN IF NOT EXISTS "dpo_appointed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "trademark_number" varchar(30),
  ADD COLUMN IF NOT EXISTS "trademark_registered_at" timestamp,
  ADD COLUMN IF NOT EXISTS "trademark_expires_at" timestamp,
  ADD COLUMN IF NOT EXISTS "asv_last_scan_at" timestamp,
  ADD COLUMN IF NOT EXISTS "asv_vendor" varchar(100),
  ADD COLUMN IF NOT EXISTS "asv_certificate_url" varchar(500),
  ADD COLUMN IF NOT EXISTS "pentest_last_scan_at" timestamp,
  ADD COLUMN IF NOT EXISTS "pentest_vendor" varchar(100),
  ADD COLUMN IF NOT EXISTS "pentest_report_url" varchar(500),
  ADD COLUMN IF NOT EXISTS "pentest_pass" boolean,
  ADD COLUMN IF NOT EXISTS "hosting_region" varchar(50),
  ADD COLUMN IF NOT EXISTS "hosting_provider" varchar(100),
  ADD COLUMN IF NOT EXISTS "hosting_ksa_residency" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "tabby_dpa_signed_at" timestamp,
  ADD COLUMN IF NOT EXISTS "tabby_dpa_url" varchar(500),
  ADD COLUMN IF NOT EXISTS "dr_plan_documented_at" timestamp,
  ADD COLUMN IF NOT EXISTS "dr_last_tabletop_at" timestamp,
  ADD COLUMN IF NOT EXISTS "dr_next_tabletop_at" timestamp;

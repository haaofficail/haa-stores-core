-- TASK-0041 Phase 2 — Track 2.1 — P0-2 Category Blocklist
--
-- Plan: docs/ops/MARKETPLACE_HARDENING_PLAN.md §4 Phase 2.1.
--
-- Adds compliance columns to categories table:
--   - regulated_category  : nullable enum string ('food' | 'drug' |
--                            'medical_device' | 'cosmetic' | 'supplement'
--                            | 'weapon' | 'adult' | 'counterfeit')
--                            Used for SFDA workflow (Track 2.2).
--   - prohibited_in_marketplace : boolean, default false
--                            When true, marketplace queries exclude all
--                            products whose primary category is this one.
--                            Admin UI toggles per category (deferred to
--                            Track 2.2 admin pass).
--
-- Default values preserve existing behavior: all existing rows get
-- prohibited_in_marketplace = false (visible by default). No business
-- behavior changes at migration time. Admin must explicitly mark
-- categories as prohibited.
--
-- SFDA / regulated category workflow (Track 2.2) will populate
-- regulated_category per Saudi compliance categories.

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "regulated_category" varchar(50);

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "prohibited_in_marketplace" boolean NOT NULL DEFAULT false;

-- Index for fast filtering on prohibited categories in marketplace queries.
-- Marketplace queries filter `prohibited_in_marketplace = false`, which
-- is the dominant access pattern; an index keeps it cheap.
CREATE INDEX IF NOT EXISTS "categories_prohibited_in_marketplace_idx"
  ON "categories" ("prohibited_in_marketplace");

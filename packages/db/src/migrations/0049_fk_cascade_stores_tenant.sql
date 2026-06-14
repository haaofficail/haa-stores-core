-- Quality Pass 1 — Item 5: Add ON DELETE CASCADE on stores.tenantId → tenants.id
-- This prevents orphan stores when a tenant is deleted.
-- Idempotent: safe to re-run.
-- Scope: ONLY stores.tenantId FK. Child tables of stores (products, orders, etc.)
-- are intentionally NOT changed — that's out of scope for Item 5.

-- Step 1: Drop the old FK constraint (if it exists, with old definition)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stores_tenant_id_tenants_id_fk'
      AND conrelid = 'stores'::regclass
  ) THEN
    ALTER TABLE "stores" DROP CONSTRAINT "stores_tenant_id_tenants_id_fk";
  END IF;
END$$;

-- Step 2: Re-add the FK constraint with ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'stores_tenant_id_tenants_id_fk'
      AND conrelid = 'stores'::regclass
  ) THEN
    ALTER TABLE "stores"
      ADD CONSTRAINT "stores_tenant_id_tenants_id_fk"
      FOREIGN KEY ("tenant_id")
      REFERENCES "public"."tenants"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION;
  END IF;
END$$;

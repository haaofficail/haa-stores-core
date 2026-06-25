-- Add store-level scoping to tenant_users.
--
-- The bug: before this migration, `tenant_users` carried only
-- `tenant_id` — every member of a tenant could see/edit every other
-- member of the same tenant, even when the tenant held multiple
-- stores. The merchant dashboard's Employees page therefore showed
-- owners of OTHER stores under the same tenant. PDPL Article 10/22
-- violation + cross-store privilege escalation.
--
-- The fix: add a nullable `store_id` column. New per-store memberships
-- MUST set it. A NULL `store_id` is reserved for tenant-wide roles
-- (super-admin); store-scoped queries filter as:
--
--   WHERE tenant_id = :ctx_tenant
--     AND (store_id IS NULL OR store_id = :ctx_store)
--
-- so a tenant-wide member appears in every store's view, and a
-- store-scoped member only in their own.
--
-- Backfill: any tenant with EXACTLY ONE store has its members
-- pointed at that store. Tenants with multiple stores leave their
-- members with `store_id = NULL` (tenant-wide) until manually
-- resolved — this is the SAFE default; the alternative (assigning
-- every member to one arbitrary store) would silently lock OTHER
-- store owners out of their own stores.
--
-- The unique constraint changes from (tenant_id, user_id) to
-- (tenant_id, store_id, user_id) so the same user can hold
-- memberships in multiple stores of the same tenant (a multi-store
-- franchise pattern), but cannot duplicate in one (tenant, store).
--
-- NOT auto-applied. Run via ops-staging-migrate workflow.

BEGIN;

-- 1) Add the column. Nullable for now — backfill happens below.
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "store_id" integer;

-- 2) Reference stores(id). Without ON DELETE: if a store is removed,
--    the membership becomes dangling — that's a separate cleanup
--    flow (revoke before delete) we don't auto-cascade here.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tenant_users_store_id_stores_id_fk'
  ) THEN
    ALTER TABLE "tenant_users"
      ADD CONSTRAINT "tenant_users_store_id_stores_id_fk"
      FOREIGN KEY ("store_id") REFERENCES "stores"("id");
  END IF;
END $$;

-- 3) Backfill: tenants with a single store get their members
--    auto-assigned to that store. Multi-store tenants stay NULL.
UPDATE "tenant_users" tu
SET "store_id" = (
  SELECT s.id FROM "stores" s
  WHERE s.tenant_id = tu.tenant_id
)
WHERE tu.store_id IS NULL
  AND (
    SELECT COUNT(*) FROM "stores" s WHERE s.tenant_id = tu.tenant_id
  ) = 1;

-- 4) Swap the unique constraint. The old one (tenant_id, user_id)
--    blocked the legitimate multi-store franchise pattern. The new
--    one (tenant_id, store_id, user_id) still prevents duplicate
--    membership in the same (tenant, store) pair.
ALTER TABLE "tenant_users" DROP CONSTRAINT IF EXISTS "tenant_users_tenant_id_user_id_unique";
ALTER TABLE "tenant_users" DROP CONSTRAINT IF EXISTS "tenant_users_tenantId_userId_unique";

-- Postgres treats NULLs as distinct in unique constraints by default,
-- which is the behaviour we want — multiple tenant-wide (store_id IS
-- NULL) memberships for the same user are still uniquely identified
-- by the (tenant_id, store_id, user_id) tuple at the application
-- layer's invite path (it refuses re-invites explicitly).
ALTER TABLE "tenant_users"
  ADD CONSTRAINT "tenant_users_tenant_id_store_id_user_id_unique"
  UNIQUE NULLS NOT DISTINCT ("tenant_id", "store_id", "user_id");

-- 5) Per-membership active flag. Pre-fix `EmployeeService.update` and
--    `EmployeeService.revoke` disabled `users.is_active` — a GLOBAL
--    flag — to deactivate a single tenant_user. A user who was a
--    member of both tenant A and tenant B would be locked out of B
--    when tenant A's admin "removed" them from tenant A. The new
--    columns scope the active-state to the membership row itself.
--
-- `is_active` defaults to TRUE so existing rows continue to authorise.
-- `revoked_at` / `revoked_by_user_id` provide a soft-delete audit
-- trail without losing the membership row (we need the row to render
-- "this member was revoked on date X by Y" in the future Activity
-- view).
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "is_active" boolean NOT NULL DEFAULT TRUE;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "revoked_at" timestamp;
ALTER TABLE "tenant_users" ADD COLUMN IF NOT EXISTS "revoked_by_user_id" integer REFERENCES users(id);

COMMIT;

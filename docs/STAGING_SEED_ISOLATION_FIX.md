# Staging Seed Isolation Fix — Runbook

**Date:** 2026-06-26  
**Issue:** Seed/Test Data Bug — merchant.perfumes appears in haa-demo Employees page  
**Severity:** P3 (staging-only, no auth bypass, no security risk)

---

## Background

Staging was seeded before commit `32a9cb46` (2026-06-25 "close cross-store employee isolation leak").
The old seed inserted both `merchant.haa-demo` and `merchant.perfumes` into `tenant_users` with
`store_id = haa-demo.id`, so both owners appeared in the haa-demo Employees page.

The seed files are already correct in the current codebase:

- `packages/db/src/seed/index.ts` — only inserts `haaDemoMerchant` into `tenant_users`
- `packages/db/src/seed/demo/perfume-demo.ts` — creates a separate `demo-perfumes` store and
  inserts `perfumeDemoMerchant` scoped to that store

Staging DB currently has:

```
tenant_users:
  id=1  tenant_id=1  store_id=1  role=owner  email=merchant.haa-demo@example.com   ← CORRECT
  id=2  tenant_id=1  store_id=1  role=owner  email=merchant.perfumes@example.com   ← WRONG (bug)
```

No `demo-perfumes` store exists in staging.

---

## Option A — Minimal Fix (Recommended)

Correct the `tenant_users` row and create the `demo-perfumes` store by running the
`perfume-demo.ts` seed script against staging. It is idempotent and non-destructive.

### Prerequisites

- SSH access to staging server (`72.61.108.208`)
- `.env` with staging `DATABASE_URL` available

### Steps

**Step 1 — Delete the wrong tenant_users row**

Connect to staging DB and run:

```sql
-- Verify the wrong row before deleting
SELECT tu.id, tu.store_id, u.email
FROM tenant_users tu
JOIN users u ON u.id = tu.user_id
WHERE u.email = 'merchant.perfumes@example.com';
-- Expected: store_id = 1 (haa-demo) — this is the bug

-- Delete it
DELETE FROM tenant_users
WHERE user_id = (SELECT id FROM users WHERE email = 'merchant.perfumes@example.com')
  AND store_id = (SELECT id FROM stores WHERE slug = 'haa-demo');
-- Expected: DELETE 1
```

> **Recommended:** instead of the raw SQL in Step 1, use the dry-run repair
> script which prints the exact row(s) it would delete before touching
> anything (staging only, requires owner approval):
>
> ```sh
> # 1. DRY-RUN — prints the contaminating row(s), writes nothing
> npx tsx scripts/ops/repair-staging-perfume-membership.ts
> # 2. APPLY — deletes only (perfume user × haa-demo store) rows, in a tx
> npx tsx scripts/ops/repair-staging-perfume-membership.ts --apply
> ```

**Step 2 — Run the perfume-demo seed script**

From the project root on the staging server:

```sh
cd ~/haa-stores-core
pnpm --filter @haa/db run seed:perfume
```

Or directly:

```sh
cd packages/db
npx tsx src/seed/demo/perfume-demo.ts
```

This will:

- Create the `demo-perfumes` store
- Create the correct `tenant_users` row for `merchant.perfumes` scoped to `demo-perfumes`

**Step 3 — Verify**

```sql
-- Should show TWO rows, each with a different store_id
SELECT tu.id, s.slug AS store_slug, u.email, tu.role
FROM tenant_users tu
JOIN users u ON u.id = tu.user_id
JOIN stores s ON s.id = tu.store_id
WHERE u.email IN ('merchant.haa-demo@example.com', 'merchant.perfumes@example.com')
ORDER BY u.email;

-- Expected:
--  merchant.haa-demo@example.com   | haa-demo      | owner
--  merchant.perfumes@example.com   | demo-perfumes  | owner
```

Login to `https://merchant.staging.haastores.com` as each merchant and verify:

- `merchant.haa-demo@example.com` → Employees page shows ONLY itself
- `merchant.perfumes@example.com` → Employees page shows ONLY itself

---

## Option B — Full Reseed (if staging data is stale beyond this fix)

If staging needs a full reseed (e.g. other data inconsistencies):

```sh
# 1. Drop and recreate the DB (or truncate all tables)
# 2. Run migrations
pnpm --filter @haa/db run migrate

# 3. Run main seed
pnpm --filter @haa/db run seed

# 4. Run perfume demo seed
pnpm --filter @haa/db run seed:perfume
```

⚠️ This wipes all staging data including test orders/customers. Use Option A when possible.

---

## Verification Checklist

- [ ] `SELECT count(*) FROM tenant_users WHERE store_id = (SELECT id FROM stores WHERE slug = 'haa-demo')` returns 1 (only haa-demo merchant)
- [ ] `SELECT count(*) FROM stores WHERE slug = 'demo-perfumes'` returns 1
- [ ] Login as `merchant.haa-demo@example.com`, open `/employees` → only 1 employee visible
- [ ] Login as `merchant.perfumes@example.com`, open `/employees` → only 1 employee visible
- [ ] Neither merchant can see the other's products or orders

---

## Local Test Coverage

The following test file was added to prevent regression:
`tests/seed-cross-store-isolation.test.ts`

Run it with:

```sh
pnpm vitest run tests/seed-cross-store-isolation.test.ts
```

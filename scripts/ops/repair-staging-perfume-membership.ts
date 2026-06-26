/**
 * Repair: remove the mis-seeded `merchant.perfumes` membership from the
 * `haa-demo` store on staging.
 *
 * Background (Seed/Demo Data Bug, audit 2026-06-26)
 * -------------------------------------------------
 * Staging was seeded BEFORE commit 32a9cb46 ("close cross-store employee
 * isolation leak"). The old seed inserted both `merchant.haa-demo` and
 * `merchant.perfumes` into `tenant_users` with `store_id = haa-demo.id`, so
 * `merchant.perfumes` shows up in the haa-demo Employees page. The current
 * seed code is already correct; only the existing staging ROW is wrong.
 *
 * The cross-store GET audit proved the API isolation itself is intact
 * (foreign store → 403, missing store → 404), so this is data cleanup, NOT a
 * security fix.
 *
 * SAFETY
 * ------
 * - DRY-RUN by default: prints the offending row(s) and the exact DELETE it
 *   WOULD run. Writes NOTHING.
 * - Pass `--apply` to actually delete the contaminating membership row(s),
 *   inside a single transaction, deleting ONLY rows matching
 *   (user = merchant.perfumes, store = haa-demo).
 * - This script never touches orders, never reseeds, never drops the user,
 *   and never creates the demo-perfumes store (run `pnpm --filter @haa/db
 *   seed:perfume` for that — see docs/STAGING_SEED_ISOLATION_FIX.md).
 * - Intended for STAGING only. Do not run against production.
 *
 * Usage:
 *   npx tsx scripts/ops/repair-staging-perfume-membership.ts            # dry-run
 *   npx tsx scripts/ops/repair-staging-perfume-membership.ts --apply    # execute
 */
import 'dotenv/config';
import postgres from 'postgres';

const PERFUME_EMAIL = 'merchant.perfumes@example.com';
const HAA_DEMO_SLUG = 'haa-demo';
const PERFUME_SLUG = 'demo-perfumes';

const APPLY = process.argv.includes('--apply');

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error('DATABASE_URL is required.');
}

const sql = postgres(url, { prepare: false, max: 1 });

async function main() {
  console.log(`\n🔧 Repair: perfume membership in ${HAA_DEMO_SLUG}`);
  console.log(`   Mode: ${APPLY ? '⚠️  APPLY (will write)' : '🔍 DRY-RUN (no writes)'}\n`);

  const [user] = await sql`SELECT id, email FROM users WHERE email = ${PERFUME_EMAIL} LIMIT 1`;
  const [haaStore] = await sql`SELECT id, slug FROM stores WHERE slug = ${HAA_DEMO_SLUG} LIMIT 1`;
  const [perfumeStore] = await sql`SELECT id, slug FROM stores WHERE slug = ${PERFUME_SLUG} LIMIT 1`;

  if (!user) { console.log('✓ Nothing to do: perfume user not found.'); return; }
  if (!haaStore) { console.log('✓ Nothing to do: haa-demo store not found.'); return; }

  console.log(`   perfume user:    id=${user.id}  ${user.email}`);
  console.log(`   haa-demo store:  id=${haaStore.id}`);
  console.log(`   demo-perfumes:   ${perfumeStore ? `id=${perfumeStore.id} (exists)` : 'MISSING — run seed:perfume after this'}\n`);

  // The contaminating rows: perfume user mapped to the haa-demo store.
  const bad = await sql`
    SELECT id, tenant_id, store_id, user_id, role
    FROM tenant_users
    WHERE user_id = ${user.id} AND store_id = ${haaStore.id}
  `;

  if (bad.length === 0) {
    console.log('✓ Clean: no perfume membership rows point at haa-demo. Nothing to repair.');
    return;
  }

  console.log(`Found ${bad.length} contaminating membership row(s):`);
  for (const r of bad) {
    console.log(`   tenant_users.id=${r.id}  tenant_id=${r.tenant_id}  store_id=${r.store_id}  role=${r.role}`);
  }
  console.log('\nPlanned action:');
  console.log(`   DELETE FROM tenant_users WHERE user_id = ${user.id} AND store_id = ${haaStore.id};  -- ${bad.length} row(s)\n`);

  if (!APPLY) {
    console.log('🔍 DRY-RUN: no changes made. Re-run with --apply to execute (staging only, with approval).');
    console.log('   Follow-up: `pnpm --filter @haa/db seed:perfume` to create the demo-perfumes store + correct membership.');
    return;
  }

  const deleted = await sql.begin(async (tx) => {
    const rows = await tx`
      DELETE FROM tenant_users
      WHERE user_id = ${user.id} AND store_id = ${haaStore.id}
      RETURNING id
    `;
    return rows;
  });
  console.log(`✅ Deleted ${deleted.length} row(s).`);
  console.log('   Next: run `pnpm --filter @haa/db seed:perfume` to (re)create the demo-perfumes membership.');

  // Verification
  const remaining = await sql`
    SELECT tu.id, s.slug AS store_slug, u.email, tu.role
    FROM tenant_users tu
    JOIN users u ON u.id = tu.user_id
    JOIN stores s ON s.id = tu.store_id
    WHERE u.email = ${PERFUME_EMAIL}
  `;
  console.log('\nPost-repair perfume memberships:');
  if (remaining.length === 0) {
    console.log('   (none — run seed:perfume to scope it to demo-perfumes)');
  } else {
    for (const r of remaining) console.log(`   store=${r.store_slug}  role=${r.role}`);
  }
}

main()
  .then(() => sql.end())
  .catch((err) => { console.error('❌ Repair failed:', err); sql.end(); process.exit(1); });

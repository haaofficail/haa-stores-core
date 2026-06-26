/**
 * RLS-001 — defense-in-depth tenant-isolation proof.
 *
 * Proves that `withTenantContext()` + Postgres RLS form a real SECOND layer of
 * tenant isolation: even when the application-layer `where(storeId)` filter is
 * missing, the database refuses to leak another tenant's rows. Operates on a
 * dedicated throwaway probe table (unique per process) so the shared test
 * schema and other suites are never touched.
 *
 * Role awareness (root-cause of the CI failure this guards against):
 * `FORCE ROW LEVEL SECURITY` makes RLS apply to the table OWNER, but a
 * SUPERUSER or a role with BYPASSRLS ALWAYS bypasses RLS regardless of FORCE.
 * The official `postgres` Docker image (used in CI) creates POSTGRES_USER as a
 * SUPERUSER, so reads on that connection bypass RLS. To test the real security
 * property in every environment, when the connection role bypasses RLS we
 * create a restricted (NOSUPERUSER NOBYPASSRLS) role and run the isolation
 * reads under `SET LOCAL ROLE` — exactly the posture production must use.
 *
 * Skips automatically if Postgres is unreachable.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDbClient, setRlsContext, withTenantContext, sql } from '@haa/db';

const db = createDbClient();
const TABLE = `rls_probe_${process.pid}`;
const APP_ROLE = `rls_probe_role_${process.pid}`;

const STORE_A = 9001;
const TENANT_A = 7001;
const STORE_B = 9002;
const TENANT_B = 7002;

// Probe connectivity + role privileges at module load (top-level await) so
// `it.skipIf` — evaluated at collection time, before beforeAll — sees the real
// values.
let dbAvailable = false;
let needsRoleSwitch = false;
try {
  await db.execute(sql`SELECT 1`);
  dbAvailable = true;
  const rows = (await db.execute(
    sql`SELECT (rolsuper OR rolbypassrls) AS bypass FROM pg_roles WHERE rolname = current_user`,
  )) as unknown as Array<{ bypass: boolean }>;
  needsRoleSwitch = rows[0]?.bypass === true;
} catch {
  dbAvailable = false;
}

/** Read under the restricted role (when the connection role bypasses RLS). */
async function isolatedRead<T = { store_id: number }>(
  ctx: { storeId: number; tenantId: number },
  query: string,
): Promise<T[]> {
  return withTenantContext(db, ctx, async (tx) => {
    if (needsRoleSwitch) await tx.execute(sql.raw(`SET LOCAL ROLE ${APP_ROLE}`));
    return (await tx.execute(sql.raw(query))) as unknown as T[];
  });
}

beforeAll(async () => {
  if (!dbAvailable) return;

  // set_tenant_context() — mirrors manual-migrations/002 (idempotent).
  await db.execute(sql`
    CREATE OR REPLACE FUNCTION set_tenant_context(p_store_id INTEGER, p_tenant_id INTEGER)
    RETURNS VOID AS $$
    BEGIN
      PERFORM set_config('app.current_store_id', p_store_id::TEXT, TRUE);
      PERFORM set_config('app.current_tenant_id', p_tenant_id::TEXT, TRUE);
    END;
    $$ LANGUAGE plpgsql;
  `);

  await db.execute(sql.raw(`DROP TABLE IF EXISTS ${TABLE}`));
  await db.execute(sql.raw(`
    CREATE TABLE ${TABLE} (
      id SERIAL PRIMARY KEY,
      store_id INTEGER NOT NULL,
      tenant_id INTEGER NOT NULL,
      name TEXT NOT NULL
    )
  `));
  // ENABLE + FORCE so the policy applies even to the table owner.
  await db.execute(sql.raw(`ALTER TABLE ${TABLE} ENABLE ROW LEVEL SECURITY`));
  await db.execute(sql.raw(`ALTER TABLE ${TABLE} FORCE ROW LEVEL SECURITY`));
  await db.execute(sql.raw(`
    CREATE POLICY tenant_isolation_${TABLE} ON ${TABLE}
      FOR ALL
      USING (store_id = current_setting('app.current_store_id')::int)
  `));

  if (needsRoleSwitch) {
    // Connection role bypasses RLS (CI superuser). Build a restricted role to
    // run the isolation reads under, so RLS is genuinely exercised.
    try {
      await db.execute(sql.raw(`DROP OWNED BY ${APP_ROLE}`));
    } catch { /* role may not exist yet */ }
    try {
      await db.execute(sql.raw(`DROP ROLE IF EXISTS ${APP_ROLE}`));
    } catch { /* best-effort */ }
    await db.execute(sql.raw(`CREATE ROLE ${APP_ROLE} NOSUPERUSER NOBYPASSRLS`));
    await db.execute(sql.raw(`GRANT USAGE ON SCHEMA public TO ${APP_ROLE}`));
    await db.execute(sql.raw(`GRANT SELECT ON ${TABLE} TO ${APP_ROLE}`));
    await db.execute(sql.raw(`GRANT ${APP_ROLE} TO current_user`));
  }

  // Seed two tenants' rows with context set (inserts succeed: superuser bypasses
  // RLS; non-super owner passes the WITH CHECK because context matches store).
  await db.transaction(async (tx) => {
    await setRlsContext(tx, STORE_A, TENANT_A);
    await tx.execute(sql.raw(`INSERT INTO ${TABLE} (store_id, tenant_id, name) VALUES (${STORE_A}, ${TENANT_A}, 'A-product-1'), (${STORE_A}, ${TENANT_A}, 'A-product-2')`));
  });
  await db.transaction(async (tx) => {
    await setRlsContext(tx, STORE_B, TENANT_B);
    await tx.execute(sql.raw(`INSERT INTO ${TABLE} (store_id, tenant_id, name) VALUES (${STORE_B}, ${TENANT_B}, 'B-product-1')`));
  });
}, 30_000);

afterAll(async () => {
  if (!dbAvailable) return;
  try {
    await db.execute(sql.raw(`DROP TABLE IF EXISTS ${TABLE}`));
  } catch { /* best-effort cleanup */ }
  if (needsRoleSwitch) {
    try { await db.execute(sql.raw(`REVOKE ${APP_ROLE} FROM current_user`)); } catch { /* noop */ }
    try { await db.execute(sql.raw(`DROP OWNED BY ${APP_ROLE}`)); } catch { /* noop */ }
    try { await db.execute(sql.raw(`DROP ROLE IF EXISTS ${APP_ROLE}`)); } catch { /* noop */ }
  }
  delete process.env.RLS_ENFORCE;
});

describe('RLS-001 — tenant isolation (defense-in-depth)', () => {
  it.skipIf(!dbAvailable)(
    'tenant A reading WITHOUT an app-layer storeId filter sees only its own rows',
    async () => {
      process.env.RLS_ENFORCE = 'on';
      // NOTE: intentionally NO `WHERE store_id = ...` — simulates a developer
      // forgetting the app-layer filter. RLS must still block tenant B.
      const rows = await isolatedRead<{ store_id: number }>(
        { storeId: STORE_A, tenantId: TENANT_A },
        `SELECT store_id, name FROM ${TABLE} ORDER BY id`,
      );
      expect(rows.length).toBe(2);
      expect(rows.every((r) => Number(r.store_id) === STORE_A)).toBe(true);
    },
  );

  it.skipIf(!dbAvailable)(
    'tenant B context never sees tenant A rows (no cross-tenant leak)',
    async () => {
      process.env.RLS_ENFORCE = 'on';
      const rows = await isolatedRead<{ store_id: number }>(
        { storeId: STORE_B, tenantId: TENANT_B },
        `SELECT store_id FROM ${TABLE}`,
      );
      expect(rows.length).toBe(1);
      expect(rows.every((r) => Number(r.store_id) === STORE_B)).toBe(true);
    },
  );

  it.skipIf(!dbAvailable)(
    'a query with NO tenant context fails closed under FORCE RLS (no silent leak)',
    async () => {
      process.env.RLS_ENFORCE = 'on';
      // No tenant context set → the policy's current_setting has no/empty value
      // → the read errors instead of leaking. Run under the restricted role when
      // the connection role would otherwise bypass RLS.
      const read = async () => {
        if (needsRoleSwitch) {
          return db.transaction(async (tx) => {
            await tx.execute(sql.raw(`SET LOCAL ROLE ${APP_ROLE}`));
            return tx.execute(sql.raw(`SELECT * FROM ${TABLE}`));
          });
        }
        return db.execute(sql.raw(`SELECT * FROM ${TABLE}`));
      };
      await expect(read()).rejects.toThrow();
    },
  );

  it.skipIf(!dbAvailable)(
    'withTenantContext is a transparent pass-through when RLS_ENFORCE is off (non-breaking)',
    async () => {
      delete process.env.RLS_ENFORCE;
      let received: unknown;
      const out = await withTenantContext(
        db,
        { storeId: STORE_A, tenantId: TENANT_A },
        async (tx) => {
          received = tx;
          return 'ok';
        },
      );
      // Flag off → no transaction, no RLS call: the callback receives the exact
      // base client instance, so behaviour is byte-for-byte the pre-change code.
      expect(received).toBe(db);
      expect(out).toBe('ok');
    },
  );

  it.skipIf(!dbAvailable)(
    'withTenantContext opens a distinct transaction client when RLS_ENFORCE is on',
    async () => {
      process.env.RLS_ENFORCE = 'on';
      let received: unknown;
      await withTenantContext(
        db,
        { storeId: STORE_A, tenantId: TENANT_A },
        async (tx) => {
          received = tx;
          return null;
        },
      );
      // Flag on → callback runs inside db.transaction(), so it is a tx-bound
      // client, never the raw pool client.
      expect(received).not.toBe(db);
    },
  );
});

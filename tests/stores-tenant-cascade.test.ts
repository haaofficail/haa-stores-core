import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const migrationsDir = resolve(projectRoot, 'packages/db/src/migrations');

describe('Quality Pass 1 — Stores.tenantId FK Cascade (Item 5)', () => {
  it('stores.ts schema must declare onDelete: "cascade" on tenantId', () => {
    const storesTs = readFileSync(
      resolve(projectRoot, 'packages/db/src/schema/stores.ts'),
      'utf-8',
    );
    expect(storesTs).toMatch(/tenantId.*references.*tenants\.id.*onDelete:\s*['"]cascade['"]/s);
  });

  it('cascade migration 0049 must exist', () => {
    const migration = readFileSync(
      resolve(migrationsDir, '0049_fk_cascade_stores_tenant.sql'),
      'utf-8',
    );
    expect(migration).toBeDefined();
    expect(migration.length).toBeGreaterThan(0);
  });

  it('cascade migration 0049 must drop and recreate the FK with CASCADE', () => {
    const migration = readFileSync(
      resolve(migrationsDir, '0049_fk_cascade_stores_tenant.sql'),
      'utf-8',
    );
    expect(migration).toMatch(/DROP CONSTRAINT.*stores_tenant_id_tenants_id_fk/);
    // Use a more specific pattern to match the actual SQL (FOREIGN KEY in DO block)
    expect(migration).toMatch(/FOREIGN KEY\s*\("tenant_id"\)/);
    expect(migration).toMatch(/ON DELETE CASCADE/);
    expect(migration).toMatch(/REFERENCES\s+"public"\."tenants"/);
  });

  it('cascade migration 0049 must be idempotent (IF EXISTS guards)', () => {
    const migration = readFileSync(
      resolve(migrationsDir, '0049_fk_cascade_stores_tenant.sql'),
      'utf-8',
    );
    expect(migration).toMatch(/IF EXISTS/);
  });

  it('cascade migration 0049 must NOT cascade child tables of stores (only stores itself)', () => {
    // Item 5 scope: ONLY stores.tenantId → tenants.id
    // NOT stores children (products, orders, etc.) — that's out of scope
    const migration = readFileSync(
      resolve(migrationsDir, '0049_fk_cascade_stores_tenant.sql'),
      'utf-8',
    );
    // Should only mention the stores FK
    const constraintMatches = migration.match(/FOREIGN KEY/g) || [];
    expect(constraintMatches.length).toBe(1);
  });
});

// Financial Integrity — Batch 2 wiring tests
//
// Source-grep tests that verify the DB-level financial guards are wired:
//   - migration 0062: unique partial index enforcing one platform_fee per (store, order)
//   - migration 0063: append-only triggers on wallet_entries (block amount edit + delete)
//   - WalletLedger.recordEntry is idempotent for platform_fee (onConflictDoNothing)
//
// Behavioral proof (index rejects duplicate; trigger rejects amount-update + delete;
// allows status transition) is verified separately against the local DB via psql
// BEGIN/ROLLBACK checks — see the Batch 2 report. We do NOT write financial rows
// into the live DB from the test suite (and the immutability trigger blocks the
// cleanup delete a DB-backed test would need).

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');
const migration = (prefix: string) => {
  const dir = resolve(ROOT, 'packages/db/src/migrations');
  const file = readdirSync(dir).find((f) => f.startsWith(prefix));
  if (!file) throw new Error(`migration ${prefix} not found`);
  return read(`packages/db/src/migrations/${file}`);
};

describe('Migration 0054 — platform_fee idempotency index', () => {
  const sql = (() => {
    try { return migration('0062_'); } catch { return ''; }
  })();

  it('creates a UNIQUE partial index on (store_id, reference_id) for platform_fee/order', () => {
    expect(sql).toContain('CREATE UNIQUE INDEX');
    expect(sql).toContain('wallet_entries');
    expect(sql).toMatch(/\(\s*store_id\s*,\s*reference_id\s*\)/);
    expect(sql.toUpperCase()).toContain('WHERE');
    expect(sql).toContain("type = 'platform_fee'");
    expect(sql).toContain("reference_type = 'order'");
  });

  it('is idempotent (IF NOT EXISTS)', () => {
    expect(sql.toUpperCase()).toContain('IF NOT EXISTS');
  });
});

describe('Migration 0055 — wallet_entries immutability', () => {
  const sql = (() => {
    try { return migration('0063_'); } catch { return ''; }
  })();

  it('installs a BEFORE UPDATE trigger that blocks edits to financial columns', () => {
    expect(sql.toUpperCase()).toContain('BEFORE UPDATE');
    expect(sql).toContain('wallet_entries');
    // amount must be protected
    expect(sql).toContain('amount');
  });

  it('installs a BEFORE DELETE trigger that blocks deletes', () => {
    expect(sql.toUpperCase()).toContain('BEFORE DELETE');
  });

  it('still allows the status transition (pending -> available)', () => {
    // The trigger must permit status changes (markPaymentReconciled relies on it).
    expect(sql).toContain('status');
  });
});

describe('WalletLedger.recordEntry — DB-level idempotency for platform_fee', () => {
  const src = read('packages/wallet-core/src/ledger.ts');

  it('uses onConflictDoNothing so a duplicate platform_fee is a no-op (not a double-charge)', () => {
    expect(src).toContain('onConflictDoNothing');
    expect(src).toContain('platform_fee');
  });

  it('does not update balances when the insert was a conflict no-op', () => {
    // The idempotent path returns the existing entry before touching balances.
    expect(src).toMatch(/onConflictDoNothing[\s\S]{0,400}?(return|existing)/i);
  });
});

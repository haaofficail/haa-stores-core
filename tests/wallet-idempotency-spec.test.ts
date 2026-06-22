// Wallet posting idempotency — DECISION-OS-018 / migration 0073.
//
// Structural guards on the DB schema + ledger code path. The runtime
// concurrent-insert test requires a live PostgreSQL fixture and lives
// in the broader integration suite. This file locks the static
// invariants that the migration + onConflictDoNothing pattern depend on.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SCHEMA = readFileSync(
  resolve(__dirname, '../packages/db/src/schema/wallet.ts'),
  'utf-8',
);
const LEDGER = readFileSync(
  resolve(__dirname, '../packages/wallet-core/src/ledger.ts'),
  'utf-8',
);
const MIGRATION = readFileSync(
  resolve(__dirname, '../packages/db/src/migrations/0073_wallet_idempotency.sql'),
  'utf-8',
);

const ENTRY_SPECS = [
  { type: 'sale', refType: 'order' },
  { type: 'cod_fee', refType: 'order' },
  { type: 'refund', refType: 'refund' },
  { type: 'gateway_fee', refType: 'order' },
  { type: 'payout_debit', refType: 'payout' },
  { type: 'payout_reversal', refType: 'payout' },
  { type: 'settlement_difference', refType: 'adjustment' },
];

describe('Wallet idempotency (DECISION-OS-018)', () => {
  it('schema declares a partial unique index per non-platform-fee entry type', () => {
    for (const spec of ENTRY_SPECS) {
      const wherePattern = new RegExp(
        `type = '${spec.type}' AND reference_type = '${spec.refType}'`,
      );
      expect(SCHEMA).toMatch(wherePattern);
    }
  });

  it('migration 0073 contains a CREATE UNIQUE INDEX per type', () => {
    for (const spec of ENTRY_SPECS) {
      const pattern = new RegExp(
        `CREATE UNIQUE INDEX[^;]*"wallet_entries_${spec.type === 'settlement_difference' ? 'settlement_diff' : spec.type}_uniq"`,
      );
      expect(MIGRATION).toMatch(pattern);
    }
  });

  it('migration 0073 uses IF NOT EXISTS so re-apply is safe', () => {
    expect(MIGRATION).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS/);
  });

  it('ledger.recordEntry routes every idempotent type through resolveIdempotentSpec', () => {
    expect(LEDGER).toMatch(/function resolveIdempotentSpec/);
    for (const spec of ENTRY_SPECS) {
      const pattern = new RegExp(`t === '${spec.type}'`);
      expect(LEDGER).toMatch(pattern);
    }
  });

  it('ledger.recordEntry uses onConflictDoNothing + return-existing pattern', () => {
    expect(LEDGER).toMatch(/onConflictDoNothing\(/);
    // After conflict, the ledger must look up and return the EXISTING entry
    // without touching balances (the original entry already moved them).
    expect(LEDGER).toMatch(/idempotentSpec && !entry/);
    expect(LEDGER).toMatch(/return existing/);
  });

  it('platform_fee (migration 0062) is still routed through the same spec', () => {
    expect(LEDGER).toMatch(/t === 'platform_fee'/);
  });
});

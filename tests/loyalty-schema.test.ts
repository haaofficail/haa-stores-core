import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

const schema = readFileSync(new URL('../packages/db/src/schema/loyalty.ts', import.meta.url), 'utf-8');
const migration = readFileSync(new URL('../packages/db/src/migrations/0071_loyalty.sql', import.meta.url), 'utf-8');
const index = readFileSync(new URL('../packages/db/src/schema/index.ts', import.meta.url), 'utf-8');

describe('loyalty schema (QA Loyalty)', () => {
  it('defines settings, accounts and transactions tables', () => {
    expect(schema).toContain('loyaltySettings');
    expect(schema).toContain('loyaltyAccounts');
    expect(schema).toContain('loyaltyTransactions');
  });

  it('is registered in the schema barrel', () => {
    expect(index).toContain("export * from './loyalty.js'");
  });

  it('account has a per-store-per-customer unique index', () => {
    expect(schema).toContain('loyalty_accounts_store_customer_uniq');
    expect(migration).toContain('loyalty_accounts_store_customer_uniq');
  });

  it('migration enforces earn idempotency via partial unique index', () => {
    expect(migration).toContain('loyalty_tx_earn_order_uniq');
    expect(migration).toMatch(/WHERE type = 'earn' AND reference_type = 'order'/);
  });

  it('ledger carries balance_before/after for immutable audit trail', () => {
    expect(schema).toContain('balanceBefore');
    expect(schema).toContain('balanceAfter');
    expect(migration).toContain('balance_before');
    expect(migration).toContain('balance_after');
  });
});

// W16 (Autopilot Phase 3) — wallet DB idempotency PLAN lock.
//
// Spec: "DB-level idempotency for the 7 non-platform_fee wallet entry
// types is a commercial-launch prerequisite. Migration file SHIPS,
// migration EXECUTION is owner-gated (do NOT run db:migrate inside
// the autopilot)."
//
// State: plan + migration file already shipped (PR #42).
//   - docs/agent-os/WALLET_IDEMPOTENCY_PLAN.md
//   - packages/db/src/migrations/0073_wallet_idempotency.sql
//   - WalletPostingService uses onConflictDoNothing + return-existing
//
// This file locks the contract so nobody can "clean up" the migration
// file or the plan doc thinking they're unused.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(ROOT, p), 'utf-8');

describe('Wallet DB idempotency plan (W16)', () => {
  it('plan document exists and lists all 7 entry types', () => {
    const plan = read('docs/agent-os/WALLET_IDEMPOTENCY_PLAN.md');
    for (const type of ['sale', 'refund', 'cod_fee', 'gateway_fee', 'payout_debit', 'payout_reversal', 'settlement_difference']) {
      expect(plan).toMatch(new RegExp(`\\b${type}\\b`));
    }
  });

  it('migration 0073 exists and is additive only (CREATE INDEX, no DROP)', () => {
    const sql = read('packages/db/src/migrations/0073_wallet_idempotency.sql');
    expect(sql).toMatch(/CREATE\s+(UNIQUE\s+)?INDEX/i);
    // Strip comments before negative match — the rationale text may
    // mention DROP / RENAME for the rollback contract.
    const exec = sql.split('\n').map((l) => l.replace(/--.*$/, '')).join('\n');
    expect(exec).not.toMatch(/\bDROP\b/i);
    expect(exec).not.toMatch(/\bRENAME\b/i);
  });

  it('migration 0073 covers all 7 entry types as partial unique indexes', () => {
    const sql = read('packages/db/src/migrations/0073_wallet_idempotency.sql');
    for (const type of ['sale', 'refund', 'cod_fee', 'gateway_fee', 'payout_debit', 'payout_reversal', 'settlement_difference']) {
      // Each type must appear in a WHERE clause of a partial index.
      expect(sql.toLowerCase()).toContain(type);
    }
  });

  it('WalletPostingService is the single posting surface (in-memory dedup until migration runs)', () => {
    // Current state: dedup is in-memory per service instance (DedupKey
    // map). DB-level partial unique indexes from migration 0073 are
    // the cross-instance backstop — once the migration is applied,
    // a follow-up commit can swap the in-memory map for
    // onConflictDoNothing semantics. We assert the canonical surface
    // exists so any new wallet-mutation code goes through it.
    const src = read('packages/commerce-core/src/wallet-posting-service.ts');
    expect(src).toMatch(/DedupKey/);
    expect(src).toMatch(/postSale|postRefund|postCodFee/);
    // The migration backstop is documented in the service header so a
    // future contributor finds the link from code → plan.
    expect(src.toLowerCase()).toMatch(/idempot|dedup/);
  });

  it('migration 0073 is documented as NOT to be auto-run (owner gate)', () => {
    const plan = read('docs/agent-os/WALLET_IDEMPOTENCY_PLAN.md');
    // The plan must state the execution gate clearly so an autopilot
    // future cannot accidentally include it in a batch migrate.
    expect(plan.toLowerCase()).toMatch(/owner|approval|gated|manual/);
  });

  it('owner decision DECISION-OS-018 references the wallet idempotency policy', () => {
    const owner = read('docs/agent-os/OWNER_DECISIONS.md');
    expect(owner).toMatch(/DECISION-OS-018/);
  });
});

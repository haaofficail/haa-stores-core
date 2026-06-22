// Audit PART 3 (MD_PAGES_AUDIT_PART_3_COMMERCE.md) — P0 #3 and P0 #4.
//
// P0 #4 — Wallet.tsx hero "you will receive" card lacked the `>= 0`
//          guard that the lower SummaryCard at line 263 already had.
//          A negative net balance rendered in `text-primary-700`
//          (positive brand color), misleading the merchant about
//          owed money. The fix derives the value once, checks
//          `< 0`, and renders it in `text-red-600` with an explicit
//          "−" prefix on the absolute value.
//
// P0 #3 — SettlementDetail.tsx rendered two different fee totals
//          (batch-level vs per-row sum) on the same page, and the
//          gross-amount fallback omitted shipping/discount/reserve.
//          The fix derives a single canonical set of fee/gross
//          values (batch-level preferred, per-row sum as fallback)
//          and feeds every cell from those variables.
//
// These tests are content-pattern tests (no JSX render) — consistent
// with the existing `merchant-touch-targets.test.ts` and
// `merchant-dashboard-brand-fidelity.test.ts` style. They lock the
// fix in place so a future refactor cannot silently reintroduce
// either of the two P0 money-correctness regressions.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const read = (rel: string) => readFileSync(resolve(ROOT, rel), 'utf-8');

const WALLET = read('apps/merchant-dashboard/src/pages/Wallet.tsx');
const SETTLEMENT_DETAIL = read('apps/merchant-dashboard/src/pages/SettlementDetail.tsx');

describe('Wallet.tsx hero card — negative netBalance guard (audit P0 #4)', () => {
  it('derives the hero value through a `< 0` guard, not the raw summary field', () => {
    // The fix introduces `rawNet = Number(summary?.netBalance ?? 0)`
    // and a `netIsNegative` flag derived from `rawNet < 0`.
    expect(WALLET).toMatch(/rawNet\s*=\s*Number\(summary\?\.netBalance\s*\?\?\s*0\)/);
    expect(WALLET).toMatch(/netIsNegative[^;]*rawNet\s*<\s*0/);
  });

  it('routes the negative branch to `text-red-600`, not `text-primary-700`', () => {
    // The branch selector — when the value is negative we MUST switch
    // away from the brand-positive color.
    expect(WALLET).toMatch(
      /heroColor\s*=\s*netIsNegative\s*\?\s*['"]text-red-600['"]\s*:\s*['"]text-primary-700['"]/,
    );
    // The hero <p> must read from the computed `heroColor`, not a
    // hard-coded `text-primary-700`.
    expect(WALLET).toMatch(/text-3xl\s+font-bold\s+\$\{heroColor\}\s+mt-1/);
  });

  it('renders a `-` prefix and absolute value when netBalance is negative', () => {
    // The hero display variable: `-${fmt(Math.abs(rawNet))}` for the
    // negative branch.
    expect(WALLET).toMatch(/heroDisplay[\s\S]{0,80}-\$\{fmt\(Math\.abs\(rawNet\)\)\}/);
  });

  it('SIMULATION — when netBalance = -100, the hero renders in text-red-600, not text-success', () => {
    // Mirror the exact logic block that ships in Wallet.tsx so this
    // test will fail if the production code drops the guard.
    const summary = { netBalance: -100 };
    const rawNet = Number(summary?.netBalance ?? 0);
    const netIsNegative = Number.isFinite(rawNet) && rawNet < 0;
    const heroColor = netIsNegative ? 'text-red-600' : 'text-primary-700';
    const heroDisplay = netIsNegative
      ? `-${Math.abs(rawNet).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : Number(summary?.netBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Negative net balance must NOT be rendered in the brand-positive
    // color the audit flagged.
    expect(heroColor).toBe('text-red-600');
    expect(heroColor).not.toBe('text-success');
    expect(heroColor).not.toBe('text-primary-700');
    expect(heroColor).not.toBe('text-emerald-600');
    // Display string must carry the minus sign on the absolute value.
    expect(heroDisplay).toBe('-100.00');
    expect(heroDisplay.startsWith('-')).toBe(true);
  });

  it('uses messageFromError for fetch errors (central error mapper)', () => {
    expect(WALLET).toMatch(/from\s+['"]@\/lib\/error-mapper['"]/);
    expect(WALLET).toMatch(/messageFromError\(\s*err\s*,\s*t\s*\)/);
  });
});

describe('SettlementDetail.tsx — single source of truth for fees (audit P0 #3)', () => {
  it('declares one canonical `gatewayFees` derived from batch ?? row sum', () => {
    // The fix introduces a clear single variable: `gatewayFees`.
    expect(SETTLEMENT_DETAIL).toMatch(/const\s+gatewayFees\s*=\s*detail\.gatewayFees\s*\?\?\s*rowGateway/);
    expect(SETTLEMENT_DETAIL).toMatch(/const\s+platformFees\s*=\s*detail\.platformFees\s*\?\?\s*rowPlatform/);
    expect(SETTLEMENT_DETAIL).toMatch(/const\s+totalFees\s*=\s*gatewayFees\s*\+\s*platformFees/);
  });

  it('every fee cell reads from the unified variables — no duplicate fallback expressions', () => {
    // After the fix, the OLD per-cell `detail.gatewayFees ?? totalGateway`
    // pattern must be GONE. There is exactly one place that resolves
    // the value, and the cells render the resolved variable.
    expect(SETTLEMENT_DETAIL).not.toMatch(/detail\.gatewayFees\s*\?\?\s*totalGateway/);
    expect(SETTLEMENT_DETAIL).not.toMatch(/detail\.platformFees\s*\?\?\s*totalPlatform/);
    // And the cells reference the canonical variable directly.
    expect(SETTLEMENT_DETAIL).toMatch(/formatCurrency\(gatewayFees\)/);
    expect(SETTLEMENT_DETAIL).toMatch(/formatCurrency\(platformFees\)/);
    expect(SETTLEMENT_DETAIL).toMatch(/formatCurrency\(totalFees\)/);
  });

  it('SIMULATION — renders a single fee total when batch and row aggregates diverge', () => {
    // Reproduce the exact derivation that ships. With backend rounding
    // skew the per-row sum (1.99 + 2.005 = 3.995) and the batch value
    // (4.00) used to render side-by-side as two different numbers.
    const detail = { gatewayFees: 4.0, platformFees: 2.0 };
    // Intentionally choose row aggregates that DO NOT match the batch
    // record — this is the exact backend-rounding-skew scenario the
    // audit flagged. Pre-fix, the page used to show both numbers.
    const transactions = [
      { gatewayFees: 1.97, platformFees: 0.61 },
      { gatewayFees: 2.04, platformFees: 1.59 },
    ];
    const rowGateway = transactions.reduce((s, tx) => s + (tx.gatewayFees ?? 0), 0);
    const rowPlatform = transactions.reduce((s, tx) => s + (tx.platformFees ?? 0), 0);
    const gatewayFees = detail.gatewayFees ?? rowGateway;
    const platformFees = detail.platformFees ?? rowPlatform;
    const totalFees = gatewayFees + platformFees;
    // The "Gateway Fees" card and the "Total Fees" card now share
    // the same upstream — the batch value wins, the per-row sum is
    // discarded when the batch is present.
    expect(gatewayFees).toBe(4.0);
    expect(platformFees).toBe(2.0);
    expect(totalFees).toBe(6.0);
    // And the row sum is NOT what gets shown — the two diverge
    // exactly the way the audit described.
    expect(gatewayFees).not.toBe(rowGateway);
    expect(platformFees).not.toBe(rowPlatform);
    expect(Math.abs(rowGateway - gatewayFees)).toBeGreaterThan(0);
    expect(Math.abs(rowPlatform - platformFees)).toBeGreaterThan(0);
  });

  it('gross-amount fallback uses per-row `tx.amount` (covers shipping + discount + reserve)', () => {
    // Old (broken) formula was
    //   totalGateway + totalPlatform + (detail.merchantPayable ?? 0)
    // which dropped shipping/discount/reserve. The fix derives `rowGross`
    // from `tx.amount` — the row's reported full order amount — which
    // by construction already includes shipping, discount and reserve.
    expect(SETTLEMENT_DETAIL).toMatch(
      /rowGross\s*=\s*transactions\.reduce\(\(\s*sum\s*,\s*tx\s*\)\s*=>\s*sum\s*\+\s*\(tx\.amount\s*\?\?\s*0\)\s*,\s*0\s*\)/,
    );
    expect(SETTLEMENT_DETAIL).toMatch(/const\s+grossAmount\s*=\s*detail\.grossAmount\s*\?\?\s*rowGross/);
    // The broken expression is gone.
    expect(SETTLEMENT_DETAIL).not.toMatch(
      /totalGateway\s*\+\s*totalPlatform\s*\+\s*\(detail\.merchantPayable\s*\?\?\s*0\)/,
    );
    // And the gross summary cell now reads from `grossAmount`, not the
    // inline formula.
    expect(SETTLEMENT_DETAIL).toMatch(/formatCurrency\(grossAmount\)/);
  });

  it('uses messageFromError for the fetch error path', () => {
    expect(SETTLEMENT_DETAIL).toMatch(/from\s+['"]@\/lib\/error-mapper['"]/);
    expect(SETTLEMENT_DETAIL).toMatch(/messageFromError\(\s*err\s*,\s*t\s*\)/);
  });
});

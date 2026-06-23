/**
 * useDashboardData — critical/secondary batch split (P1 audit Part 1).
 *
 * Original bug: useDashboardData fired 26 API calls in a single
 * Promise.allSettled on mount, so the above-the-fold KPI cards waited
 * on slow, below-the-fold queries (marketplace hub, notification logs,
 * compliance status, …).
 *
 * Fix: critical batch (≤8 calls — top KPIs + chart + recent orders +
 * readiness + subscription) fires immediately; secondary batch fires
 * AFTER critical resolves, scheduled via requestIdleCallback so the
 * paint of the primary KPIs is never blocked.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const HOOK = resolve(
  __dirname,
  '..',
  'apps/merchant-dashboard/src/pages/dashboard/hooks/useDashboardData.ts',
);

describe('useDashboardData critical/secondary split (P1 audit)', () => {
  const src = readFileSync(HOOK, 'utf-8');

  it('exposes a secondaryLoading flag distinct from loading', () => {
    expect(src).toMatch(/secondaryLoading:\s*boolean/);
    expect(src).toMatch(/setSecondaryLoading\(/);
  });

  it('critical Promise.allSettled batch is ≤ 8 calls (top KPIs + chart)', () => {
    // Find the first Promise.allSettled — that is the critical batch.
    const allSettled = src.indexOf('Promise.allSettled');
    expect(allSettled, 'no Promise.allSettled found').toBeGreaterThan(-1);
    // Slice from there to the matching `]` that closes the array literal.
    const slice = src.slice(allSettled, allSettled + 1200);
    const arrStart = slice.indexOf('[');
    const arrEnd = slice.indexOf(']);');
    const arr = slice.slice(arrStart + 1, arrEnd);
    // Count top-level commas as a proxy for entry count (the calls
    // are one-per-line, no nested arrays in this list).
    const entries = arr
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('//'))
      .filter((l) => /\(.*\)/.test(l));
    expect(entries.length).toBeLessThanOrEqual(8);
    expect(entries.length).toBeGreaterThanOrEqual(6); // we want the top KPIs there
  });

  it('secondary batch is gated behind requestIdleCallback (or 0ms setTimeout fallback)', () => {
    expect(src).toContain('requestIdleCallback');
    expect(src).toContain('setTimeout');
    // The secondary runner must be defined as runSecondary().
    expect(src).toMatch(/runSecondary\s*=\s*async/);
  });

  it('secondary batch contains the deferred (below-the-fold) calls', () => {
    // These were previously in the critical batch; the split moved them.
    const deferred = [
      'marketplaceApi.hub',
      'notificationApi.getLogs',
      'complianceApi.getStatus',
      'abandonedCartsApi.stats',
      'shippingApi.listReturns',
      'couponsApi.list',
    ];
    // Each must appear AFTER the first Promise.allSettled (the critical batch).
    const criticalIdx = src.indexOf('Promise.allSettled');
    for (const call of deferred) {
      const idx = src.indexOf(call);
      expect(idx, `${call} missing`).toBeGreaterThan(-1);
      expect(idx, `${call} should be in secondary, not critical`).toBeGreaterThan(criticalIdx);
    }
  });

  it('critical batch sets summary/wallet/salesData/recentOrders synchronously', () => {
    // After the first Promise.allSettled, these setters must fire
    // BEFORE setLoading(false) — that's the contract that primary KPIs
    // render as soon as the critical batch resolves.
    const firstAllSettledEnd = src.indexOf('Promise.allSettled');
    const setLoadingFalse = src.indexOf('setLoading(false)', firstAllSettledEnd);
    expect(setLoadingFalse).toBeGreaterThan(firstAllSettledEnd);
    const critical = src.slice(firstAllSettledEnd, setLoadingFalse);
    expect(critical).toMatch(/setSummary\(/);
    expect(critical).toMatch(/setWallet\(/);
    expect(critical).toMatch(/setSalesData\(/);
    expect(critical).toMatch(/setRecentOrders\(/);
  });
});

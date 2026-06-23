/**
 * L-PR-9 — Loyalty analytics tab in Reports.tsx (source-grep).
 *
 * Verifies the dashboard Reports page wires the new Loyalty tab,
 * pulls data from the loyalty.analytics endpoint, and renders the
 * five required metrics (active accounts, points outstanding,
 * redemption rate, breakage rate, top earners).
 *
 * Source-grep style mirrors the other Reports/dashboard tests
 * (notifications-provider-gating.test.tsx, settings-admin-p1-cluster.test.tsx)
 * so the test runs without a DOM and without mounting React.
 *
 * Also verifies:
 *   - apps/merchant-dashboard/src/lib/api.ts exposes `loyaltyApi.analytics`
 *   - apps/api/src/routes/loyalty.ts registers GET /analytics with the
 *     `reports:read` permission (same scope as the rest of Reports)
 *   - packages/commerce-core/src/loyalty.ts has the SQL aggregator
 *     `getAnalytics(storeId)` returning the five metrics.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
function read(rel: string): string {
  return readFileSync(resolve(ROOT, rel), 'utf-8');
}

const REPORTS = read('apps/merchant-dashboard/src/pages/Reports.tsx');
const API = read('apps/merchant-dashboard/src/lib/api.ts');
const ROUTE = read('apps/api/src/routes/loyalty.ts');
const SVC = read('packages/commerce-core/src/loyalty.ts');

describe('Reports page — Loyalty tab UI (L-PR-9)', () => {
  it('imports Tabs primitives + loyaltyApi + LoyaltyAnalytics type', () => {
    expect(REPORTS).toMatch(/from '@\/components\/ui\/tabs'/);
    expect(REPORTS).toMatch(/\bTabs\b[\s\S]{0,80}\bTabsList\b[\s\S]{0,80}\bTabsTrigger\b/);
    expect(REPORTS).toMatch(/loyaltyApi[\s\S]{0,80}from '@\/lib\/api'/);
    expect(REPORTS).toMatch(/type\s+LoyaltyAnalytics/);
  });

  it('renders a top-level Tabs with overview + loyalty triggers', () => {
    expect(REPORTS).toMatch(/<Tabs[^>]*defaultValue="overview"/);
    expect(REPORTS).toMatch(/data-testid="tab-trigger-overview"/);
    expect(REPORTS).toMatch(/data-testid="tab-trigger-loyalty"/);
  });

  it('LoyaltyTab calls loyaltyApi.analytics(storeId)', () => {
    expect(REPORTS).toMatch(/loyaltyApi\.analytics\(\s*storeId\s*\)/);
  });

  it('renders the four required metric cards', () => {
    expect(REPORTS).toContain('data-testid="loyalty-active-accounts"');
    expect(REPORTS).toContain('data-testid="loyalty-points-outstanding"');
    expect(REPORTS).toContain('data-testid="loyalty-redemption-rate"');
    expect(REPORTS).toContain('data-testid="loyalty-breakage-rate"');
  });

  it('renders the top earners table', () => {
    expect(REPORTS).toMatch(/topEarners\.map/);
    // Either the table header or the empty-state must be present.
    expect(REPORTS).toMatch(/data-testid="loyalty-top-earners-empty"|topEarners\.length\s*===\s*0/);
  });

  it('routes errors through messageFromError for accessible toasts', () => {
    expect(REPORTS).toMatch(/LoyaltyTab[\s\S]{0,2000}messageFromError\(\s*e\s*,\s*t\s*\)/);
  });
});

describe('Dashboard api.ts — loyaltyApi.analytics (L-PR-9)', () => {
  it('exports a LoyaltyAnalytics interface matching the API contract', () => {
    expect(API).toMatch(/export interface LoyaltyAnalytics\s*\{[\s\S]{0,500}activeAccounts:\s*number/);
    expect(API).toMatch(/pointsOutstanding:\s*number/);
    expect(API).toMatch(/redemptionRate:\s*number/);
    expect(API).toMatch(/breakageRate:\s*number/);
    expect(API).toMatch(/topEarners:\s*Array</);
  });

  it('exports loyaltyApi.analytics targeting /merchant/:storeId/loyalty/analytics', () => {
    // The block has grown to include L-PR-4 (getSettings/updateSettings/
    // getCustomer) + L-PR-9 (analytics). Match `loyaltyApi` containing
    // an `analytics:` field that targets the new endpoint.
    expect(API).toMatch(/export const loyaltyApi\s*=\s*\{[\s\S]{0,2000}analytics:[\s\S]{0,200}\/merchant\/\$\{storeId\}\/loyalty\/analytics/);
  });
});

describe('API route — GET /loyalty/analytics (L-PR-9)', () => {
  it('is registered on the loyaltyRouter with reports:read RBAC', () => {
    expect(ROUTE).toMatch(/loyaltyRouter\.get\(\s*['"]\/analytics['"]/);
    expect(ROUTE).toMatch(/['"]\/analytics['"][\s\S]{0,300}requirePermission\(\s*['"]reports:read['"]\s*\)/);
  });

  it('delegates to LoyaltyService.getAnalytics', () => {
    expect(ROUTE).toMatch(/getAnalytics\(\s*storeId\s*\)/);
  });
});

describe('LoyaltyService.getAnalytics — pure SQL aggregator (L-PR-9)', () => {
  it('is exported as a method', () => {
    expect(SVC).toContain('async getAnalytics');
  });

  it('returns activeAccounts via COUNT(*) FILTER (WHERE balance > 0)', () => {
    expect(SVC).toMatch(/COUNT\(\*\)\s*FILTER\s*\(\s*WHERE\s*\$\{s\.loyaltyAccounts\.balance\}\s*>\s*0\s*\)/);
  });

  it('returns pointsOutstanding via COALESCE(SUM(balance), 0)', () => {
    expect(SVC).toMatch(/COALESCE\(SUM\(\$\{s\.loyaltyAccounts\.balance\}\),\s*0\)/);
  });

  it('computes redemptionRate as lifetimeRedeemed / lifetimeEarned (guarded against /0)', () => {
    expect(SVC).toMatch(/redemptionRate\s*=\s*earned\s*>\s*0\s*\?\s*redeemed\s*\/\s*earned\s*:\s*0/);
  });

  it('computes breakageRate as lifetimeExpired / lifetimeEarned (guarded against /0)', () => {
    expect(SVC).toMatch(/breakageRate\s*=\s*earned\s*>\s*0\s*\?\s*expired\s*\/\s*earned\s*:\s*0/);
  });

  it('returns top 10 earners ordered by lifetimeEarned desc', () => {
    expect(SVC).toMatch(/orderBy\(desc\(s\.loyaltyAccounts\.lifetimeEarned\)\)[\s\S]{0,80}\.limit\(10\)/);
  });

  it('does NOT introduce a new table (read-only aggregates over loyalty_accounts)', () => {
    // The whole analytics block must only `select().from(s.loyaltyAccounts)` —
    // no joins, no other tables. This guards against schema drift.
    const block = SVC.match(/async getAnalytics[\s\S]{0,2500}^\s{2}\}/m)?.[0] ?? '';
    expect(block).toContain('s.loyaltyAccounts');
    // No `s.loyaltyTransactions`, no `s.customers`, no `s.orders` — all
    // forbidden inside this method because the task is "no new tables /
    // no joins on the hot path".
    expect(block).not.toMatch(/s\.loyaltyTransactions/);
    expect(block).not.toMatch(/s\.customers/);
    expect(block).not.toMatch(/s\.orders/);
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const dashboardRouteFile = resolve(projectRoot, 'apps/api/src/routes/dashboard.ts');
const dashboardServiceFile = resolve(projectRoot, 'packages/commerce-core/src/dashboard-service.ts');
const commerceCoreIndex = resolve(projectRoot, 'packages/commerce-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 10/24
 *
 * Pins the contract that the dashboard route
 * (apps/api/src/routes/dashboard.ts) was migrated from direct
 * Drizzle access to a new DashboardService in @haa/commerce-core.
 *
 * This migration is critical: the route is a single endpoint
 * that aggregates ~22 DB queries into the merchant's dashboard.
 * The KPI calculations (readiness score, urgency ordering,
 * financial totals) are all business logic that must be
 * preserved exactly.
 */
describe('Quality Pass 5 — Route Migration 10/24: dashboard.ts', () => {
  it('dashboard.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(dashboardRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('dashboard.ts route must use DashboardService (no inline DB queries)', () => {
    const content = read(dashboardRouteFile);
    expect(content).toMatch(/DashboardService/);
    expect(content).not.toMatch(/db\.select|db\.update|db\.insert|db\.delete/);
  });

  it('dashboard.ts must preserve the GET /summary endpoint', () => {
    const content = read(dashboardRouteFile);
    expect(content).toMatch(/dashboardRouter\.get\(['"]\/summary['"]/);
  });

  it('dashboard.ts must preserve the requirePermission(\'dashboard:view\') guard', () => {
    const content = read(dashboardRouteFile);
    expect(content).toMatch(/requirePermission\(['"]dashboard:view['"]\)/);
  });

  it('dashboard.ts must preserve the file-level requireAuth + requireStoreAccess', () => {
    const content = read(dashboardRouteFile);
    expect(content).toMatch(/dashboardRouter\.use\(['"]\*['"],\s*requireAuth\(\),\s*requireStoreAccess\(\)\)/);
  });

  it('dashboard.ts must preserve the full response shape (top-level keys)', () => {
    // The route returns the service result directly, so the
    // response shape lives in the service.
    const svcContent = read(dashboardServiceFile);
    // Top-level keys
    expect(svcContent).toMatch(/totalProducts/);
    expect(svcContent).toMatch(/activeProducts/);
    expect(svcContent).toMatch(/lowStockProducts/);
    expect(svcContent).toMatch(/totalOrders/);
    expect(svcContent).toMatch(/newOrders/);
    expect(svcContent).toMatch(/totalSales/);
    expect(svcContent).toMatch(/balance/);
    expect(svcContent).toMatch(/availableBalance/);
    expect(svcContent).toMatch(/pendingBalance/);
    expect(svcContent).toMatch(/totalFees/);
    expect(svcContent).toMatch(/activeShippingMethods/);
    expect(svcContent).toMatch(/actionCenter/);
    expect(svcContent).toMatch(/readiness/);
    expect(svcContent).toMatch(/recentActionableOrders/);
  });

  it('dashboard.ts must preserve the actionCenter sub-keys (6 counts)', () => {
    const svcContent = read(dashboardServiceFile);
    expect(svcContent).toMatch(/newOrdersCount/);
    expect(svcContent).toMatch(/readyToShipCount/);
    expect(svcContent).toMatch(/readyForPickupCount/);
    expect(svcContent).toMatch(/codCollectionCount/);
    expect(svcContent).toMatch(/lowStockProductsCount/);
    expect(svcContent).toMatch(/outOfStockProductsCount/);
  });

  it('dashboard.ts must preserve the readiness sub-keys', () => {
    const svcContent = read(dashboardServiceFile);
    expect(svcContent).toMatch(/score/);
    expect(svcContent).toMatch(/totalChecks/);
    expect(svcContent).toMatch(/passedChecks/);
    expect(svcContent).toMatch(/issues/);
  });

  it('dashboard.ts must not touch orders / products / walletAccounts / etc. tables directly', () => {
    const content = read(dashboardRouteFile);
    expect(content).not.toMatch(/s\.orders\)/);
    expect(content).not.toMatch(/s\.products\)/);
    expect(content).not.toMatch(/s\.walletAccounts/);
    expect(content).not.toMatch(/s\.shippingMethods\)/);
    expect(content).not.toMatch(/s\.pickupLocations\)/);
    expect(content).not.toMatch(/s\.merchantPaymentProviderSettings/);
    expect(content).not.toMatch(/s\.productImages/);
    expect(content).not.toMatch(/s\.storePolicies/);
    expect(content).not.toMatch(/s\.kycProfiles/);
  });

  it('DashboardService must exist in @haa/commerce-core', () => {
    expect(existsSync(dashboardServiceFile)).toBe(true);
    const content = read(dashboardServiceFile);
    expect(content).toMatch(/export\s+class\s+DashboardService/);
  });

  it('DashboardService must own the getSummary method', () => {
    const content = read(dashboardServiceFile);
    expect(content).toMatch(/async\s+getSummary\b/);
  });

  it('DashboardService must preserve the urgency case ordering for actionable orders', () => {
    // CRITICAL: the urgency order is business logic. The test
    // pins the exact CASE values to ensure no regressions.
    const content = read(dashboardServiceFile);
    expect(content).toMatch(/WHEN.*delivered.*cash_on_delivery.*pending.*THEN 1/);
    expect(content).toMatch(/WHEN.*picked_up.*cash_on_delivery.*pending.*THEN 2/);
    expect(content).toMatch(/WHEN.*ready_to_ship.*local_pickup.*THEN 3/);
    expect(content).toMatch(/WHEN.*ready_for_pickup.*local_pickup.*THEN 4/);
    expect(content).toMatch(/WHEN.*pending_payment.*THEN 5/);
    expect(content).toMatch(/WHEN.*confirmed.*THEN 6/);
    expect(content).toMatch(/WHEN.*processing.*THEN 7/);
    expect(content).toMatch(/WHEN.*shipped.*THEN 8/);
    expect(content).toMatch(/ELSE 99/);
  });

  it('DashboardService must preserve the external-orders filter (no salla/zid/noon/amazon)', () => {
    const content = read(dashboardServiceFile);
    // The action center + recentActionableOrders exclude
    // marketplace-sourced orders. This is the filter.
    expect(content).toMatch(/salla/);
    expect(content).toMatch(/zid/);
    expect(content).toMatch(/noon/);
    expect(content).toMatch(/amazon/);
  });

  it('DashboardService must preserve the readiness constants (12 total checks, 6 max issues)', () => {
    const content = read(dashboardServiceFile);
    // 12 readiness categories (either as a const or inline literal)
    expect(content).toMatch(/12/);
    expect(content).toMatch(/6/);
    // 6 max issues displayed (truncation)
    expect(content).toMatch(/slice\(0,\s*(?:READINESS_MAX_ISSUES|maxIssues|6)/);
  });

  it('DashboardService must preserve the score formula (round(passedChecks / 12 * 100))', () => {
    const content = read(dashboardServiceFile);
    // The score is computed as: passedChecks = 12 - issues.length
    // score = round(passedChecks / 12 * 100). Match the key
    // components (Math.round, passedChecks, the constant for
    // 12, and the * 100 multiplier) anywhere in the file.
    expect(content).toMatch(/Math\.round\(/);
    // passedChecks must be divided by something representing 12
    expect(content).toMatch(/passedChecks\s*\/\s*(?:READINESS_TOTAL_CHECKS|totalChecks|12)/);
    // The result is multiplied by 100 (to get a percentage)
    expect(content).toMatch(/\*\s*100/);
  });

  it('DashboardService must preserve the COALESCE(SUM(orders.total), 0) for totalSales', () => {
    const content = read(dashboardServiceFile);
    expect(content).toMatch(/COALESCE/);
    expect(content).toMatch(/SUM\(/);
  });

  it('DashboardService must preserve all 4 wallet field defaults (balance, availableBalance, pendingBalance, totalFees)', () => {
    const content = read(dashboardServiceFile);
    // The route uses `account?.balance ?? '0'` etc. — the
    // service should preserve these defaults.
    expect(content).toMatch(/balance.*\?\?.*'0'/);
    expect(content).toMatch(/availableBalance.*\?\?.*'0'/);
    expect(content).toMatch(/pendingBalance.*\?\?.*'0'/);
    expect(content).toMatch(/totalFees.*\?\?.*'0'/);
  });

  it('DashboardService must NOT depend on auth, admin, or employee services', () => {
    const content = read(dashboardServiceFile);
    const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/AuthFlowService/);
    expect(code).not.toMatch(/AdminAuthService/);
    expect(code).not.toMatch(/EmployeeService/);
    expect(code).not.toMatch(/PermissionService/);
  });

  it('DashboardService must be exported from @haa/commerce-core', () => {
    const indexContent = read(commerceCoreIndex);
    expect(indexContent).toMatch(/dashboard-service/);
  });
});

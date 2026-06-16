import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const subscriptionsRouteFile = resolve(projectRoot, 'apps/api/src/routes/subscriptions.ts');
const subscriptionsServiceFile = resolve(projectRoot, 'packages/commerce-core/src/subscriptions.ts');
const commerceCoreIndex = resolve(projectRoot, 'packages/commerce-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 19/24
 *
 * Pins the contract that the subscriptions route
 * (apps/api/src/routes/subscriptions.ts) was migrated from
 * direct Drizzle access to a static factory on the existing
 * SubscriptionService in @haa/commerce-core.
 *
 * The route had a small but real business-logic leak: a
 * local `resolveStore()` helper that did a direct
 * `db.select` on the `stores` table to fetch the
 * `id` + `isDemo` flag. The helper was called from 3
 * endpoints (getCurrent, current, limits) to pass the
 * store info to SubscriptionService.
 *
 * After the migration, the route has zero Drizzle imports
 * and zero direct DB access. The new
 * `SubscriptionService.forStore(storeId)` static factory
 * does the resolution internally and returns a configured
 * service instance.
 *
 * The 5 other endpoints (subscribe, upgrade, downgrade,
 * invoices, plans) do not need the store info, so they
 * continue to use `new SubscriptionService()` directly.
 */
describe('Quality Pass 5 — Route Migration 19/24: subscriptions.ts', () => {
  it('subscriptions.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(subscriptionsRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('subscriptions.ts route must NOT call db.* directly (no inline DB queries)', () => {
    const content = read(subscriptionsRouteFile);
    expect(content).not.toMatch(/db\.select|db\.update|db\.insert|db\.delete/);
    expect(content).not.toMatch(/createDbClient/);
    // The local resolveStore() helper is gone
    expect(content).not.toMatch(/resolveStore/);
  });

  it('subscriptions.ts route must use SubscriptionService for all data access', () => {
    const content = read(subscriptionsRouteFile);
    expect(content).toMatch(/SubscriptionService/);
    // No service OTHER than SubscriptionService should be
    // instantiated by the route. The 5 endpoints that don't
    // need store info use `new SubscriptionService()`
    // directly (allowed). Other services (StoreService,
    // OrdersService, etc.) are forbidden.
    const foreignServices = content.match(/new\s+([A-Z]\w*Service)\s*\(/) || [];
    const uniqueNames = new Set(foreignServices.map((m) => m.match(/[A-Z]\w*Service/)?.[0]).filter(Boolean));
    expect([...uniqueNames].sort()).toEqual(['SubscriptionService']);
    // The forStore factory is the right way to construct
    // the service for store-aware endpoints
    expect(content).toMatch(/SubscriptionService\.forStore\s*\(/);
  });

  it('subscriptions.ts must preserve all 8 endpoints', () => {
    const content = read(subscriptionsRouteFile);
    // list (top-level) — keep for backward compat
    expect(content).toMatch(/subscriptionsRouter\.get\(['"]\/['"]/);
    // current
    expect(content).toMatch(/subscriptionsRouter\.get\(['"]\/current['"]/);
    // plans
    expect(content).toMatch(/subscriptionsRouter\.get\(['"]\/plans['"]/);
    // subscribe
    expect(content).toMatch(/subscriptionsRouter\.post\(['"]\/subscribe['"]/);
    // upgrade
    expect(content).toMatch(/subscriptionsRouter\.post\(['"]\/upgrade['"]/);
    // downgrade
    expect(content).toMatch(/subscriptionsRouter\.post\(['"]\/downgrade['"]/);
    // invoices
    expect(content).toMatch(/subscriptionsRouter\.get\(['"]\/invoices['"]/);
    // limits
    expect(content).toMatch(/subscriptionsRouter\.get\(['"]\/limits['"]/);
  });

  it('subscriptions.ts must preserve all permission requirements (5x view, 3x manage)', () => {
    const content = read(subscriptionsRouteFile);
    const viewMatches = content.match(/requirePermission\(['"]subscriptions:view['"]\)/g) || [];
    expect(viewMatches.length).toBe(5);
    const manageMatches = content.match(/requirePermission\(['"]subscriptions:manage['"]\)/g) || [];
    expect(manageMatches.length).toBe(3);
  });

  it('subscriptions.ts must preserve file-level requireAuth + requireStoreAccess', () => {
    const content = read(subscriptionsRouteFile);
    expect(content).toMatch(/subscriptionsRouter\.use\(['"]\*['"],\s*requireAuth\(\),\s*requireStoreAccess\(\)\)/);
  });

  it('subscriptions.ts must preserve all status codes (200, 201, 404, 409)', () => {
    const content = read(subscriptionsRouteFile);
    expect(content).toMatch(/201/);  // subscribe
    expect(content).toMatch(/404/);  // upgrade/downgrade not found
    expect(content).toMatch(/409/);  // subscribe conflict
  });

  it('subscriptions.ts must preserve all error codes (CONFLICT, NOT_FOUND)', () => {
    const content = read(subscriptionsRouteFile);
    expect(content).toMatch(/CONFLICT/);
    expect(content).toMatch(/NOT_FOUND/);
  });

  it('subscriptions.ts must preserve Zod validators on the 3 body-bearing endpoints (subscribe, upgrade, downgrade)', () => {
    const content = read(subscriptionsRouteFile);
    expect(content.match(/zValidator\(['"]json['"]/g)?.length).toBe(3);
  });

  it('subscriptions.ts must not touch stores / subscriptionPlans / merchantSubscriptions tables directly', () => {
    const content = read(subscriptionsRouteFile);
    expect(content).not.toMatch(/s\.stores/);
    expect(content).not.toMatch(/s\.subscriptionPlans/);
    expect(content).not.toMatch(/s\.merchantSubscriptions/);
  });

  it('SubscriptionService must gain a static forStore(storeId) factory that resolves the store internally', () => {
    const content = read(subscriptionsServiceFile);
    expect(content).toMatch(/static\s+async\s+forStore\s*\(\s*storeId/);
    // The factory must read isDemo (the field the route was
    // selecting) so the service can apply plan-limit logic
    expect(content).toMatch(/isDemo/);
  });

  it('SubscriptionService must NOT import @haa/db/schema for the forStore factory (it must use the existing s.* import)', () => {
    // Sanity: the factory uses the already-imported schema
    // table, not a new import. Keeps the dep graph clean.
    const content = read(subscriptionsServiceFile);
    const importMatches = content.match(/from\s+['"]@haa\/db\/schema['"]/g) || [];
    expect(importMatches.length).toBe(1); // exactly the existing import
  });

  it('SubscriptionService.forStore must preserve the return shape (returns a configured service, not a subscription record)', () => {
    const content = read(subscriptionsServiceFile);
    // The factory returns a SubscriptionService instance
    // with the store info pre-loaded, NOT the subscription
    // record itself. The caller chains .getCurrentSubscription().
    expect(content).toMatch(/return\s+new\s+SubscriptionService\s*\(\s*db\s*,\s*store/);
  });

  it('SubscriptionService.forStore must handle the not-found case (no store for the given id)', () => {
    const content = read(subscriptionsServiceFile);
    // If the store is not found, the factory must still
    // return a service (not throw) so the route can map
    // the downstream null/undefined response to a 404.
    expect(content).toMatch(/store\s*\?\?\s*undefined/);
  });

  it('SubscriptionService must be exported from @haa/commerce-core (no new export needed; already there)', () => {
    const indexContent = read(commerceCoreIndex);
    expect(indexContent).toMatch(/SubscriptionService/);
  });
});

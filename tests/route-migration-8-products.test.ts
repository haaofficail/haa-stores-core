import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const productsRouteFile = resolve(projectRoot, 'apps/api/src/routes/products.ts');
const productsServiceFile = resolve(projectRoot, 'packages/commerce-core/src/products.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 8/24
 *
 * Pins the contract that the products route
 * (apps/api/src/routes/products.ts) was migrated from direct
 * Drizzle access to the existing ProductsService in
 * @haa/commerce-core.
 *
 * Important: ProductsService ALREADY existed and ALREADY handled
 * 8 of the 9 concerns. The route was mostly service-based. The
 * migration is mostly cleanup of the 2 direct DB calls in the
 * `autoPublishProduct` helper (marketplace auto-publish after
 * create/update).
 *
 * The autoPublish behavior is moved into ProductsService as a
 * new method `autoPublishToMarketplaces`. The audit + webhook
 * outbox side effects also move with it.
 */
describe('Quality Pass 5 — Route Migration 8/24: products.ts', () => {
  it('products.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(productsRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('products.ts route must use ProductsService for all 8 endpoints', () => {
    const content = read(productsRouteFile);
    expect(content).toMatch(/ProductsService/);
    // No inline db.select / db.update / db.insert / db.delete
    expect(content).not.toMatch(/db\.select|db\.update|db\.insert|db\.delete/);
  });

  it('products.ts must preserve all 8 endpoints', () => {
    const content = read(productsRouteFile);
    expect(content).toMatch(/productsRouter\.get\(['"]\/['"]/);
    expect(content).toMatch(/productsRouter\.get\(['"]\/:productId['"]/);
    expect(content).toMatch(/productsRouter\.post\(['"]\/['"]/);
    expect(content).toMatch(/productsRouter\.patch\(['"]\/:productId['"]/);
    expect(content).toMatch(/productsRouter\.post\(['"]\/bulk['"]/);
    expect(content).toMatch(/productsRouter\.delete\(['"]\/:productId['"]/);
    expect(content).toMatch(/productsRouter\.post\(['"]\/:productId\/images['"]/);
    expect(content).toMatch(/productsRouter\.delete\(['"]\/:productId\/images\/:imageId['"]/);
  });

  it('products.ts must preserve all 4 permission requirements', () => {
    const content = read(productsRouteFile);
    const readMatches = content.match(/requirePermission\(['"]products:read['"]\)/g) || [];
    expect(readMatches.length).toBe(2);
    const createMatches = content.match(/requirePermission\(['"]products:create['"]\)/g) || [];
    expect(createMatches.length).toBe(2);  // create + batch-create (PR #105)
    const updateMatches = content.match(/requirePermission\(['"]products:update['"]\)/g) || [];
    expect(updateMatches.length).toBe(4);
    const deleteMatches = content.match(/requirePermission\(['"]products:delete['"]\)/g) || [];
    expect(deleteMatches.length).toBe(1);
  });

  it('products.ts must preserve file-level requireAuth + requireStoreAccess', () => {
    const content = read(productsRouteFile);
    expect(content).toMatch(/productsRouter\.use\(['"]\*['"],\s*requireAuth\(\),\s*requireStoreAccess\(\)\)/);
  });

  it('products.ts must preserve 201 on create + addImage', () => {
    const content = read(productsRouteFile);
    const matches = content.match(/201/g) || [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  it('products.ts must preserve 404 on missing product/image', () => {
    const content = read(productsRouteFile);
    expect(content).toMatch(/404/);
    expect(content).toMatch(/NOT_FOUND/);
    expect(content).toMatch(/Product not found/);
    expect(content).toMatch(/Image not found/);
  });

  it('products.ts must preserve 400 for validation errors', () => {
    const content = read(productsRouteFile);
    expect(content).toMatch(/400/);
    expect(content).toMatch(/VALIDATION_ERROR/);
  });

  it('products.ts must not touch marketplaceConnections / marketplaceProviders / products tables directly', () => {
    const content = read(productsRouteFile);
    expect(content).not.toMatch(/s\.marketplaceConnections/);
    expect(content).not.toMatch(/s\.marketplaceProviders/);
    expect(content).not.toMatch(/s\.products\)/);
    expect(content).not.toMatch(/s\.stores\)/);
  });

  it('products.ts must not call AuditLogService / WebhookOutboxService directly (service owns them now)', () => {
    const content = read(productsRouteFile);
    // Per Rule 12 equivalent: audit + outbox are part of the
    // product business logic, not a transport concern.
    expect(content).not.toMatch(/new AuditLogService/);
    expect(content).not.toMatch(/new WebhookOutboxService/);
    expect(content).not.toMatch(/AuditLogService\(\)\.record/);
    expect(content).not.toMatch(/WebhookOutboxService\(\)\.recordEvent/);
  });

  it('ProductsService must exist in @haa/commerce-core', () => {
    expect(existsSync(productsServiceFile)).toBe(true);
    const content = read(productsServiceFile);
    expect(content).toMatch(/export\s+class\s+ProductsService/);
  });

  it('MarketplaceSyncService must own the autoPublishToMarketplaces method (new in this migration)', () => {
    // The auto-publish logic moved into a dedicated
    // MarketplaceSyncService (separate from ProductsService)
    // because the orchestration involves marketplace provider
    // resolvers + audit + outbox — a wider concern than just
    // products.
    const marketplaceSyncFile = resolve(projectRoot, 'packages/commerce-core/src/marketplace-sync.ts');
    expect(existsSync(marketplaceSyncFile)).toBe(true);
    const content = read(marketplaceSyncFile);
    expect(content).toMatch(/export\s+class\s+MarketplaceSyncService/);
    expect(content).toMatch(/async\s+autoPublishToMarketplaces/);
  });

  it('ProductsService must own all 8 catalog operations the route uses', () => {
    const content = read(productsServiceFile);
    expect(content).toMatch(/async\s+list/);
    expect(content).toMatch(/async\s+getById/);
    expect(content).toMatch(/async\s+create/);
    expect(content).toMatch(/async\s+update/);
    expect(content).toMatch(/async\s+bulkAction/);
    expect(content).toMatch(/async\s+archive/);
    expect(content).toMatch(/async\s+addImage/);
    expect(content).toMatch(/async\s+deleteImage/);
  });

  it('MarketplaceSyncService must reuse the existing AuditLogService + WebhookOutboxService for the auto-publish audit', () => {
    // Per Rule 12: don't reimplement audit/outbox — reuse.
    const marketplaceSyncFile = resolve(projectRoot, 'packages/commerce-core/src/marketplace-sync.ts');
    const content = read(marketplaceSyncFile);
    expect(content).toMatch(/AuditLogService/);
    expect(content).toMatch(/WebhookOutboxService/);
  });

  it('ProductsService must NOT depend on auth or admin services', () => {
    const content = read(productsServiceFile);
    const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/AuthFlowService/);
    expect(code).not.toMatch(/AdminAuthService/);
    expect(code).not.toMatch(/EmployeeService/);
    expect(code).not.toMatch(/PermissionService/);
  });
});

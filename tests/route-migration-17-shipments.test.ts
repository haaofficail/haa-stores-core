import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const shipmentsRouteFile = resolve(projectRoot, 'apps/api/src/routes/shipments.ts');
const shipmentsServiceFile = resolve(projectRoot, 'packages/commerce-core/src/shipments-service.ts');
const commerceCoreIndex = resolve(projectRoot, 'packages/commerce-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 17/24
 *
 * Pins the contract that the shipments route
 * (apps/api/src/routes/shipments.ts) was migrated from
 * direct Drizzle + service-mixing access to a new
 * ShipmentsService in @haa/commerce-core.
 *
 * The route has 9 endpoints (list, get, returns/list,
 * create, label create, label get, status patch, events,
 * return, cancel) plus the provider-status GET. The
 * migration consolidates 5 inlined business concerns into
 * the service:
 *   1. Order lookup + status/phone pre-validation
 *   2. try/catch around createShipment carrier errors
 *   3. Direct DB ownership check for return creation
 *   4. try/catch around return/label/cancel errors
 *   5. The toResponse helper centralizes the
 *      success/error → HTTP status code mapping
 *
 * The service composes OrdersService (commerce-core) with
 * ShippingService/LabelService/ReturnService
 * (shipping-core) and returns a ShipmentsResult envelope.
 * The route is now pure transport.
 */
describe('Quality Pass 5 — Route Migration 17/24: shipments.ts', () => {
  it('shipments.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(shipmentsRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('shipments.ts route must NOT call db.* directly (no inline DB queries)', () => {
    const content = read(shipmentsRouteFile);
    expect(content).not.toMatch(/db\.select|db\.update|db\.insert|db\.delete/);
    // createDbClient is gone too — the service owns DB access
    expect(content).not.toMatch(/createDbClient/);
  });

  it('shipments.ts route must use ShipmentsService for all data access', () => {
    const content = read(shipmentsRouteFile);
    expect(content).toMatch(/ShipmentsService/);
    // The route should NOT directly instantiate the
    // lower-level shipping-core services anymore.
    expect(content).not.toMatch(/new\s+ShippingService\s*\(/);
    expect(content).not.toMatch(/new\s+LabelService\s*\(/);
    expect(content).not.toMatch(/new\s+ReturnService\s*\(/);
    expect(content).not.toMatch(/new\s+OrdersService\s*\(/);
    // createShippingProvider is a low-level factory used by
    // providers, not by the route anymore.
    expect(content).not.toMatch(/createShippingProvider\s*\(/);
    // getShippingProviderStatus is exposed via the service.
    expect(content).not.toMatch(/getShippingProviderStatus\s*\(/);
  });

  it('shipments.ts must preserve all 10 endpoints', () => {
    const content = read(shipmentsRouteFile);
    // provider status (read-only, no permission)
    expect(content).toMatch(/shipmentsRouter\.get\(['"]\/provider-status['"]/);
    // list + returns/list (must come before /:id) + get
    expect(content).toMatch(/shipmentsRouter\.get\(['"]\/['"]/);
    expect(content).toMatch(/shipmentsRouter\.get\(['"]\/returns\/list['"]/);
    expect(content).toMatch(/shipmentsRouter\.get\(['"]\/:id['"]/);
    // create shipment
    expect(content).toMatch(/shipmentsRouter\.post\(['"]\/orders\/:orderId\/shipments['"]/);
    // label create + get
    expect(content).toMatch(/shipmentsRouter\.post\(['"]\/:shipmentId\/label['"]/);
    expect(content).toMatch(/shipmentsRouter\.get\(['"]\/:shipmentId\/label['"]/);
    // status + events
    expect(content).toMatch(/shipmentsRouter\.patch\(['"]\/:shipmentId\/status['"]/);
    expect(content).toMatch(/shipmentsRouter\.post\(['"]\/:shipmentId\/events['"]/);
    // return + cancel
    expect(content).toMatch(/shipmentsRouter\.post\(['"]\/:shipmentId\/return['"]/);
    expect(content).toMatch(/shipmentsRouter\.post\(['"]\/:shipmentId\/cancel['"]/);
  });

  it('shipments.ts must preserve all permission requirements (shipping:manage on every endpoint except provider-status)', () => {
    const content = read(shipmentsRouteFile);
    const matches = content.match(/requirePermission\(['"]shipping:manage['"]\)/g) || [];
    // 10 protected endpoints; provider-status is the 11th (no perm required).
    expect(matches.length).toBe(10);
  });

  it('shipments.ts must preserve file-level requireAuth + requireStoreAccess', () => {
    const content = read(shipmentsRouteFile);
    expect(content).toMatch(/shipmentsRouter\.use\(['"]\*['"],\s*requireAuth\(\),\s*requireStoreAccess\(\)\)/);
  });

  it('shipments.ts must preserve all status codes (200, 201, 400, 404)', () => {
    const content = read(shipmentsRouteFile);
    expect(content).toMatch(/201/);  // create endpoints
    expect(content).toMatch(/404/);  // not found
    expect(content).toMatch(/400/);  // validation + business errors
  });

  it('shipments.ts must not touch shipments / orders / shipmentTrackingEvents / shipmentErrors tables directly', () => {
    const content = read(shipmentsRouteFile);
    expect(content).not.toMatch(/s\.shipments/);
    expect(content).not.toMatch(/s\.orders/);
    expect(content).not.toMatch(/s\.shipmentTrackingEvents/);
    expect(content).not.toMatch(/s\.shipmentErrors/);
  });

  it('shipments.ts must still preserve Zod validators for body payloads (4 endpoints have bodies)', () => {
    const content = read(shipmentsRouteFile);
    // create shipment, status update, events, return
    expect(content.match(/zValidator\(['"]json['"]/g)?.length).toBe(4);
  });

  it('shipments.ts must preserve the success/error response envelope (success: true|false, data|error)', () => {
    const content = read(shipmentsRouteFile);
    expect(content).toMatch(/success:\s*true,\s*data:/);
    expect(content).toMatch(/success:\s*false,\s*error:/);
  });

  it('ShipmentsService must exist in @haa/commerce-core', () => {
    expect(existsSync(shipmentsServiceFile)).toBe(true);
    const content = read(shipmentsServiceFile);
    expect(content).toMatch(/export\s+class\s+ShipmentsService/);
    expect(content).toMatch(/export\s+type\s+ShipmentsResult/);
  });

  it('ShipmentsService must own the route-facing operations (list, get, create, label, status, events, return, cancel, listReturns, getProviderStatus)', () => {
    const content = read(shipmentsServiceFile);
    expect(content).toMatch(/async\s+listShipments\b/);
    expect(content).toMatch(/async\s+getShipment\b/);
    expect(content).toMatch(/async\s+createShipment\b/);
    expect(content).toMatch(/async\s+createLabel\b/);
    expect(content).toMatch(/async\s+getLabel\b/);
    expect(content).toMatch(/async\s+updateStatus\b/);
    expect(content).toMatch(/async\s+addTrackingEvent\b/);
    expect(content).toMatch(/async\s+createReturn\b/);
    expect(content).toMatch(/async\s+cancel\b/);
    expect(content).toMatch(/async\s+listReturns\b/);
    expect(content).toMatch(/getProviderStatus\b/);
  });

  it('ShipmentsService must enforce order pre-validation (NOT_FOUND, INVALID_STATUS, MISSING_ADDRESS) before createShipment', () => {
    const content = read(shipmentsServiceFile);
    // Pre-validation messages match the route's old error codes
    expect(content).toMatch(/'NOT_FOUND'/);
    expect(content).toMatch(/'INVALID_STATUS'/);
    expect(content).toMatch(/'MISSING_ADDRESS'/);
    // Status check covers cancelled + returned
    expect(content).toMatch(/order\.status\s*===\s*['"]cancelled['"]/);
    expect(content).toMatch(/order\.status\s*===\s*['"]returned['"]/);
  });

  it('ShipmentsService must perform ownership check for return creation (no cross-store returns)', () => {
    const content = read(shipmentsServiceFile);
    // The createReturn method does an inline ownership check
    // (this used to be a direct db.select in the route).
    expect(content).toMatch(/async\s+createReturn\b/);
    expect(content).toMatch(/eq\(s\.shipments\.id,\s*shipmentId\)/);
    expect(content).toMatch(/eq\(s\.shipments\.storeId,\s*storeId\)/);
  });

  it('ShipmentsService must NOT re-implement carrier/provider logic (it composes shipping-core services)', () => {
    const content = read(shipmentsServiceFile);
    // Should NOT define a class that looks like a provider
    expect(content).not.toMatch(/implements\s+ShippingProvider/);
    // Should NOT contain a method whose body actually
    // builds a carrier call itself (e.g., calling
    // provider.createShipment with a full input object).
    // We delegate by calling ShippingService.createShipment.
    expect(content).not.toMatch(/provider\.createShipment\s*\(/);
    // Should delegate to existing services
    expect(content).toMatch(/new\s+ShippingService\s*\(/);
    expect(content).toMatch(/new\s+LabelService\s*\(/);
    expect(content).toMatch(/new\s+ReturnService\s*\(/);
  });

  it('ShipmentsService must depend on OrdersService for the order pre-check (composes commerce-core + shipping-core)', () => {
    const content = read(shipmentsServiceFile);
    expect(content).toMatch(/new\s+OrdersService\s*\(/);
    expect(content).toMatch(/from\s+['"]\.\/orders\.js['"]/);
  });

  it('ShipmentsService must live in @haa/commerce-core (NOT @haa/shipping-core) to avoid a circular dependency', () => {
    // Sanity check: the service file path is commerce-core,
    // not shipping-core. Putting it in shipping-core would
    // create shipping-core → commerce-core → shipping-core.
    expect(shipmentsServiceFile).toMatch(/commerce-core/);
  });

  it('ShipmentsService must be exported from @haa/commerce-core index', () => {
    const indexContent = read(commerceCoreIndex);
    expect(indexContent).toMatch(/ShipmentsService/);
    expect(indexContent).toMatch(/shipments-service/);
    expect(indexContent).toMatch(/ShipmentsResult/);
  });
});

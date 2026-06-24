import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const settingsRouteFile = resolve(projectRoot, 'apps/api/src/routes/settings.ts');
const storeSettingsServiceFile = resolve(projectRoot, 'packages/commerce-core/src/store-settings-service.ts');
const commerceCoreIndex = resolve(projectRoot, 'packages/commerce-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 9/24
 *
 * Pins the contract that the settings route
 * (apps/api/src/routes/settings.ts) was migrated from direct
 * Drizzle access to a new StoreSettingsService in
 * @haa/commerce-core.
 *
 * The settings route is the largest one yet (632 lines, ~30
 * inline DB calls, 27 endpoints). The migration consolidates
 * 5 distinct concerns (store metadata, store config,
 * size-guides, pickup-locations, product-features, theme,
 * gift-options, readiness aggregation) into a single service.
 *
 * Existing services (PublishGateService, AcknowledgementService,
 * KycService) are already service-based and stay in their
 * respective homes.
 */
describe('Quality Pass 5 — Route Migration 9/24: settings.ts', () => {
  it('settings.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(settingsRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('settings.ts route must use StoreSettingsService (no inline DB queries)', () => {
    const content = read(settingsRouteFile);
    expect(content).toMatch(/StoreSettingsService/);
    expect(content).not.toMatch(/db\.select|db\.update|db\.insert|db\.delete/);
  });

  it('settings.ts must preserve all 27 endpoints', () => {
    const content = read(settingsRouteFile);
    // store metadata
    expect(content).toMatch(/settingsRouter\.get\(['"]\/['"]/);
    expect(content).toMatch(/settingsRouter\.put\(['"]\/['"]/);
    // store-config
    expect(content).toMatch(/settingsRouter\.get\(['"]\/store-config['"]/);
    expect(content).toMatch(/settingsRouter\.put\(['"]\/store-config['"]/);
    // size-guides
    expect(content).toMatch(/settingsRouter\.get\(['"]\/size-guides['"]/);
    expect(content).toMatch(/settingsRouter\.post\(['"]\/size-guides['"]/);
    expect(content).toMatch(/settingsRouter\.put\(['"]\/size-guides\/:guideId['"]/);
    expect(content).toMatch(/settingsRouter\.delete\(['"]\/size-guides\/:guideId['"]/);
    // readiness + payment-status
    expect(content).toMatch(/settingsRouter\.get\(['"]\/readiness['"]/);
    expect(content).toMatch(/settingsRouter\.get\(['"]\/payment-status['"]/);
    // product-features
    expect(content).toMatch(/settingsRouter\.get\(['"]\/product-features['"]/);
    expect(content).toMatch(/settingsRouter\.put\(['"]\/product-features['"]/);
    // theme
    expect(content).toMatch(/settingsRouter\.get\(['"]\/theme['"]/);
    expect(content).toMatch(/settingsRouter\.put\(['"]\/theme['"]/);
    expect(content).toMatch(/settingsRouter\.get\(['"]\/theme\/history['"]/);
    // gift-options
    expect(content).toMatch(/settingsRouter\.get\(['"]\/gift-options['"]/);
    expect(content).toMatch(/settingsRouter\.put\(['"]\/gift-options['"]/);
    // pickup-locations
    expect(content).toMatch(/settingsRouter\.get\(['"]\/pickup-locations['"]/);
    expect(content).toMatch(/settingsRouter\.post\(['"]\/pickup-locations['"]/);
    expect(content).toMatch(/settingsRouter\.put\(['"]\/pickup-locations\/:id['"]/);
    expect(content).toMatch(/settingsRouter\.delete\(['"]\/pickup-locations\/:id['"]/);
    // publish + acknowledge (these are delegated to existing
    // PublishGateService + AcknowledgementService — not new
    // store-settings concerns, but the route preserves the
    // endpoint paths)
    expect(content).toMatch(/settingsRouter\.post\(['"]\/publish['"]/);
    expect(content).toMatch(/settingsRouter\.post\(['"]\/unpublish['"]/);
    expect(content).toMatch(/settingsRouter\.get\(['"]\/publish-status['"]/);
    expect(content).toMatch(/settingsRouter\.get\(['"]\/acknowledgement\/status['"]/);
    expect(content).toMatch(/settingsRouter\.get\(['"]\/acknowledgement\/required-items['"]/);
    expect(content).toMatch(/settingsRouter\.post\(['"]\/acknowledge['"]/);
  });

  it('settings.ts must preserve all permission requirements (14× stores:read, 14× settings:update)', () => {
    const content = read(settingsRouteFile);
    const readMatches = content.match(/requirePermission\(['"]stores:read['"]\)/g) || [];
    expect(readMatches.length).toBe(14);
    const updateMatches = content.match(/requirePermission\(['"]settings:update['"]\)/g) || [];
    expect(updateMatches.length).toBe(14);
  });

  it('settings.ts must preserve file-level requireAuth + requireStoreAccess', () => {
    const content = read(settingsRouteFile);
    expect(content).toMatch(/settingsRouter\.use\(['"]\*['"],\s*requireAuth\(\),\s*requireStoreAccess\(\)\)/);
  });

  it('settings.ts must preserve all status codes (200, 201, 400, 404, 422, 500)', () => {
    const content = read(settingsRouteFile);
    expect(content).toMatch(/201/);  // create endpoints
    expect(content).toMatch(/404/);  // not found
    expect(content).toMatch(/400/);  // validation errors
    expect(content).toMatch(/422/);  // publish/unpublish
    expect(content).toMatch(/500/);  // publish/ack errors
  });

  it('settings.ts must not touch stores / storeSettings / sizeGuides / pickupLocations tables directly', () => {
    const content = read(settingsRouteFile);
    expect(content).not.toMatch(/s\.stores\)/);
    expect(content).not.toMatch(/s\.storeSettings\)/);
    expect(content).not.toMatch(/s\.sizeGuides\)/);
    expect(content).not.toMatch(/s\.pickupLocations\)/);
    expect(content).not.toMatch(/s\.categories\)/);
    expect(content).not.toMatch(/s\.products\)/);
    expect(content).not.toMatch(/s\.productImages\)/);
    expect(content).not.toMatch(/s\.shippingMethods\)/);
    expect(content).not.toMatch(/s\.shippingZones\)/);
    expect(content).not.toMatch(/s\.shippingRates\)/);
    expect(content).not.toMatch(/s\.orders\)/);
  });

  it('settings.ts must still use the existing external services (Kyc, PublishGate, Acknowledgement, payment)', () => {
    // Per Rule 12 equivalent: don't reimplement, reuse.
    const content = read(settingsRouteFile);
    expect(content).toMatch(/KycService/);
    expect(content).toMatch(/PublishGateService/);
    expect(content).toMatch(/AcknowledgementService/);
    expect(content).toMatch(/getPaymentProviderStatus/);
  });

  it('StoreSettingsService must exist in @haa/commerce-core', () => {
    expect(existsSync(storeSettingsServiceFile)).toBe(true);
    const content = read(storeSettingsServiceFile);
    expect(content).toMatch(/export\s+class\s+StoreSettingsService/);
  });

  it('StoreSettingsService must own all the store-settings operations (NOT publish/ack — those are separate)', () => {
    const content = read(storeSettingsServiceFile);
    expect(content).toMatch(/async\s+getStore\b/);
    expect(content).toMatch(/async\s+updateStore\b/);
    expect(content).toMatch(/async\s+getStoreConfig\b/);
    expect(content).toMatch(/async\s+updateStoreConfig\b/);
    expect(content).toMatch(/async\s+listSizeGuides\b/);
    expect(content).toMatch(/async\s+createSizeGuide\b/);
    expect(content).toMatch(/async\s+updateSizeGuide\b/);
    expect(content).toMatch(/async\s+deleteSizeGuide\b/);
    expect(content).toMatch(/async\s+getReadiness\b/);
    expect(content).toMatch(/async\s+getProductFeatures\b/);
    expect(content).toMatch(/async\s+updateProductFeatures\b/);
    expect(content).toMatch(/async\s+getTheme\b/);
    expect(content).toMatch(/async\s+updateTheme\b/);
    expect(content).toMatch(/async\s+getThemeHistory\b/);
    expect(content).toMatch(/async\s+getGiftOptions\b/);
    expect(content).toMatch(/async\s+updateGiftOptions\b/);
    expect(content).toMatch(/async\s+listPickupLocations\b/);
    expect(content).toMatch(/async\s+createPickupLocation\b/);
    expect(content).toMatch(/async\s+updatePickupLocation\b/);
    expect(content).toMatch(/async\s+deletePickupLocation\b/);
  });

  it('StoreSettingsService must NOT include PublishGate or Acknowledgement logic (those are separate services)', () => {
    const content = read(storeSettingsServiceFile);
    // The service is for store configuration only — publish/ack
    // are owned by PublishGateService + AcknowledgementService.
    expect(content).not.toMatch(/publish\(/);
    expect(content).not.toMatch(/unpublish\(/);
    expect(content).not.toMatch(/acknowledge\(/);
  });

  it('StoreSettingsService must NOT depend on auth, admin, or employee services', () => {
    const content = read(storeSettingsServiceFile);
    const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/AuthFlowService/);
    expect(code).not.toMatch(/AdminAuthService/);
    expect(code).not.toMatch(/EmployeeService/);
    expect(code).not.toMatch(/PermissionService/);
  });

  it('StoreSettingsService must be exported from @haa/commerce-core', () => {
    const indexContent = read(commerceCoreIndex);
    expect(indexContent).toMatch(/store-settings-service/);
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const providerStatusRouteFile = resolve(projectRoot, 'apps/api/src/routes/provider-status.ts');
const providerStatusServiceFile = resolve(projectRoot, 'packages/commerce-core/src/provider-status-service.ts');
const commerceCoreIndex = resolve(projectRoot, 'packages/commerce-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 7/24
 *
 * Pins the contract that the provider-status route
 * (apps/api/src/routes/provider-status.ts) was migrated from
 * direct Drizzle access to a ProviderStatusService in
 * @haa/commerce-core.
 *
 * Important architectural decision: this is an AGGREGATION
 * service — it composes data from payment, shipping, wallet,
 * and notification subsystems. The natural home is
 * @haa/commerce-core because:
 *   - It already depends on @haa/integration-core, @haa/shipping-core,
 *     @haa/wallet-core, and @haa/payment-providers.
 *   - Putting it in @haa/integration-core would create a circular
 *     dependency (integration-core → commerce-core → integration-core).
 *
 * The route is a pure HTTP shell. The service returns the full
 * aggregation shape.
 */
describe('Quality Pass 5 — Route Migration 7/24: provider-status.ts', () => {
  it('provider-status.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(providerStatusRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('provider-status.ts route must use ProviderStatusService', () => {
    const content = read(providerStatusRouteFile);
    expect(content).toMatch(/ProviderStatusService/);
    // No inline db.select / db.update / db.insert / db.delete
    expect(content).not.toMatch(/db\.select|db\.update|db\.insert|db\.delete/);
  });

  it('provider-status.ts must preserve the GET / endpoint', () => {
    const content = read(providerStatusRouteFile);
    expect(content).toMatch(/providerStatusRouter\.get\(['"]\/['"]/);
  });

  it('provider-status.ts must preserve the requirePermission(\'settings:read\') guard', () => {
    const content = read(providerStatusRouteFile);
    expect(content).toMatch(/requirePermission\(['"]settings:read['"]\)/);
  });

  it('provider-status.ts must preserve the file-level requireAuth + requireStoreAccess', () => {
    const content = read(providerStatusRouteFile);
    expect(content).toMatch(/providerStatusRouter\.use\(['"]\*['"],\s*requireAuth\(\),\s*requireStoreAccess\(\)\)/);
  });

  it('provider-status.ts must preserve the full response shape (payment, shipping, shippingLabel, whatsapp, email)', () => {
    // The route returns the service result directly, so the
    // response shape lives in the service.
    const svcContent = read(providerStatusServiceFile);
    // Each section appears as a key in the returned object
    expect(svcContent).toMatch(/payment/);
    expect(svcContent).toMatch(/shipping/);
    expect(svcContent).toMatch(/shippingLabel/);
    expect(svcContent).toMatch(/whatsapp/);
    expect(svcContent).toMatch(/email/);
    // The route just passes the result through:
    const routeContent = read(providerStatusRouteFile);
    expect(routeContent).toMatch(/c\.json\(\{\s*success:\s*true,\s*data\s*\}\)/);
  });

  it('provider-status.ts must NOT expose any secrets (only booleans and statuses)', () => {
    const content = read(providerStatusRouteFile);
    // The route should not log or return any env-var VALUE — only
    // existence checks. The service does the existence check; the
    // route just passes through the boolean.
    expect(content).not.toMatch(/process\.env\.GEIDEA_(MERCHANT_PUBLIC_KEY|API_PASSWORD|.*SECRET)/);
    expect(content).not.toMatch(/process\.env\.SMTP_PASSWORD/);
    expect(content).not.toMatch(/process\.env\.[A-Z_]*SECRET/);
  });

  it('provider-status.ts must not touch the notificationPreferences table directly', () => {
    const content = read(providerStatusRouteFile);
    expect(content).not.toMatch(/notificationPreferences/);
  });

  it('ProviderStatusService must exist in @haa/commerce-core', () => {
    expect(existsSync(providerStatusServiceFile)).toBe(true);
    const content = read(providerStatusServiceFile);
    expect(content).toMatch(/export\s+class\s+ProviderStatusService/);
  });

  it('ProviderStatusService must own the getStatus() business logic', () => {
    const content = read(providerStatusServiceFile);
    expect(content).toMatch(/async\s+getStatus/);
  });

  it('ProviderStatusService must return all 5 sections (payment, shipping, shippingLabel, whatsapp, email)', () => {
    const content = read(providerStatusServiceFile);
    expect(content).toMatch(/payment/);
    expect(content).toMatch(/shipping/);
    expect(content).toMatch(/shippingLabel/);
    expect(content).toMatch(/whatsapp/);
    expect(content).toMatch(/email/);
  });

  it('ProviderStatusService must NOT expose secrets (only existence booleans)', () => {
    // The service must use env vars ONLY for existence checks
    // (`!!(process.env.X && process.env.Y)`), never returning the
    // VALUE of any secret env var.
    const content = read(providerStatusServiceFile);
    // No env-var VALUE returned (no `process.env.X` without !! or
    // string interpolation that would leak the value).
    expect(content).toMatch(/!!/); // at least one existence check
    // No console.log/error/warn of any env var value
    expect(content).not.toMatch(/console\.(log|error|warn).*process\.env\./);
  });

  it('ProviderStatusService must reuse the existing OtoMarketplaceService + WalletLedger helpers', () => {
    // Per Rule 12-equivalent: don't reimplement shipping/wallet
    // status — delegate to the existing services.
    const content = read(providerStatusServiceFile);
    expect(content).toMatch(/OtoMarketplaceService/);
    expect(content).toMatch(/WalletLedger/);
  });

  it('ProviderStatusService must reuse the existing getPaymentProviderStatus helper', () => {
    // Already re-exported from @haa/payment-providers via
    // @haa/commerce-core. Reuse it instead of inlining env checks.
    const content = read(providerStatusServiceFile);
    expect(content).toMatch(/getPaymentProviderStatus/);
  });

  it('ProviderStatusService must NOT depend on auth (no auth mixing)', () => {
    const content = read(providerStatusServiceFile);
    const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/AuthFlowService/);
    expect(code).not.toMatch(/AdminAuthService/);
    expect(code).not.toMatch(/EmployeeService/);
    expect(code).not.toMatch(/PermissionService/);
  });

  it('ProviderStatusService must be exported from @haa/commerce-core', () => {
    const indexContent = read(commerceCoreIndex);
    expect(indexContent).toMatch(/provider-status-service/);
  });
});

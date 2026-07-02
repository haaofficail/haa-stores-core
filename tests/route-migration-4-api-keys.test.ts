import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const apiKeysRouteFile = resolve(projectRoot, 'apps/api/src/routes/api-keys.ts');
const apiKeyServiceFile = resolve(projectRoot, 'packages/integration-core/src/api-keys.ts');
const integrationCoreIndex = resolve(projectRoot, 'packages/integration-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 4/24
 *
 * Pins the contract that the api-keys route
 * (apps/api/src/routes/api-keys.ts) was migrated from direct
 * Drizzle access to the existing ApiKeyService in
 * @haa/integration-core.
 *
 * Note: this migration is mostly a CLEANUP. 4 of the 5 endpoints
 * already use ApiKeyService. Only the /logs endpoint was bypassing
 * the service layer. The test asserts the cleanup is complete and
 * the existing service is extended (not replaced) to absorb the
 * /logs query.
 */
describe('Quality Pass 5 — Route Migration 4/24: api-keys.ts', () => {
  it('api-keys.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(apiKeysRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('api-keys.ts route must use ApiKeyService (not inline DB queries)', () => {
    const content = read(apiKeysRouteFile);
    expect(content).toMatch(/ApiKeyService/);
    // No inline db.select, db.update, db.insert, db.execute
    expect(content).not.toMatch(/db\.select|db\.update|db\.insert|db\.execute/);
  });

  it('api-keys.ts must preserve all 5 endpoints', () => {
    const content = read(apiKeysRouteFile);
    expect(content).toMatch(/apiKeysRouter\.get\(['"]\/['"]/);
    expect(content).toMatch(/apiKeysRouter\.post\(['"]\/['"]/);
    expect(content).toMatch(/apiKeysRouter\.delete\(['"]\/:keyId['"]/);
    expect(content).toMatch(/apiKeysRouter\.get\(['"]\/scopes['"]/);
    expect(content).toMatch(/apiKeysRouter\.get\(['"]\/logs['"]/);
  });

  it('api-keys.ts must use the dedicated api_keys:* permissions (P1-10 audit fix)', () => {
    // Was settings:read/settings:update — the merchant-dashboard UI has
    // always gated /api-keys on the catalog's dedicated api_keys:view/
    // create/revoke (packages/shared/src/permissions.ts), so an employee
    // granted only api_keys:* (no settings:*) saw the page load then got
    // 403 on every call. Routes now match the UI's permission keys.
    const content = read(apiKeysRouteFile);
    // api_keys:view (3 uses: GET /, GET /scopes, GET /logs)
    const viewMatches = content.match(/requirePermission\(['"]api_keys:view['"]\)/g) || [];
    expect(viewMatches.length).toBe(3);
    // api_keys:create (1 use: POST /)
    const createMatches = content.match(/requirePermission\(['"]api_keys:create['"]\)/g) || [];
    expect(createMatches.length).toBe(1);
    // api_keys:revoke (1 use: DELETE /:keyId)
    const revokeMatches = content.match(/requirePermission\(['"]api_keys:revoke['"]\)/g) || [];
    expect(revokeMatches.length).toBe(1);
  });

  it('api-keys.ts must preserve the file-level requireAuth + requireStoreAccess', () => {
    const content = read(apiKeysRouteFile);
    expect(content).toMatch(/apiKeysRouter\.use\(['"]\*['"],\s*requireAuth\(\),\s*requireStoreAccess\(\)\)/);
  });

  it('api-keys.ts must preserve the response shape for /logs (array of log entries)', () => {
    const content = read(apiKeysRouteFile);
    // The /logs endpoint returns `{ success: true, data: logs }`
    expect(content).toMatch(/logs/);
    // The route should call a service method to get the logs
    expect(content).toMatch(/listLogs|getLogs/);
  });

  it('api-keys.ts must NOT touch the integrationLogs table directly', () => {
    const content = read(apiKeysRouteFile);
    expect(content).not.toMatch(/integrationLogs/);
  });

  it('ApiKeyService must exist in @haa/integration-core', () => {
    expect(existsSync(apiKeyServiceFile)).toBe(true);
    const content = read(apiKeyServiceFile);
    expect(content).toMatch(/export\s+class\s+ApiKeyService/);
  });

  it('ApiKeyService must own the /logs query (listLogs method)', () => {
    const content = read(apiKeyServiceFile);
    expect(content).toMatch(/async\s+listLogs/);
  });

  it('ApiKeyService must own all 5 operations the route uses', () => {
    const content = read(apiKeyServiceFile);
    expect(content).toMatch(/async\s+listKeys/);
    expect(content).toMatch(/async\s+createKey/);
    expect(content).toMatch(/async\s+revokeKey/);
    expect(content).toMatch(/async\s+getScopes/);
    expect(content).toMatch(/async\s+listLogs/);
  });

  it('ApiKeyService must still be exported from @haa/integration-core', () => {
    const indexContent = read(integrationCoreIndex);
    expect(indexContent).toMatch(/ApiKeyService/);
  });

  it('api-keys.ts must NOT depend on admin or merchant auth (no auth mixing)', () => {
    const content = read(apiKeysRouteFile);
    // Strip comments first
    const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/AuthFlowService/);
    expect(code).not.toMatch(/AdminAuthService/);
    expect(code).not.toMatch(/@haa\/commerce-core/);
  });
});

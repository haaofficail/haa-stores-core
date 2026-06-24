import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const authRouteFile = resolve(projectRoot, 'apps/api/src/routes/auth.ts');
const authFlowServiceFile = resolve(projectRoot, 'packages/commerce-core/src/auth-flow.ts');
const commerceCoreIndex = resolve(projectRoot, 'packages/commerce-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 1/24
 *
 * Pins the contract that the auth route (apps/api/src/routes/auth.ts)
 * was migrated from direct Drizzle access to the AuthFlowService in
 * commerce-core. If anyone re-introduces Drizzle in the route OR
 * moves the service out of commerce-core, this test fails.
 */
describe('Quality Pass 5 — Route Migration 1/24: auth.ts', () => {
  it('auth.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(authRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('auth.ts route must use AuthFlowService from @haa/commerce-core', () => {
    const content = read(authRouteFile);
    expect(content).toMatch(/AuthFlowService/);
    expect(content).toMatch(/@haa\/commerce-core/);
  });

  it('auth.ts must preserve all 4 endpoints (no breaking change)', () => {
    const content = read(authRouteFile);
    // The route literal may be on the same line as the .post( call,
    // or on the next line if the handler is split across lines for
    // middleware chaining (e.g. rateLimiter + zValidator). Accept
    // optional whitespace/newline between `(` and the path literal.
    expect(content).toMatch(/authRouter\.post\(\s*['"]\/register['"]/);
    expect(content).toMatch(/authRouter\.post\(\s*['"]\/login['"]/);
    expect(content).toMatch(/authRouter\.get\(\s*['"]\/me['"]/);
    expect(content).toMatch(/authRouter\.post\(\s*['"]\/logout['"]/);
  });

  it('auth.ts must preserve the same response shape for each endpoint', () => {
    const content = read(authRouteFile);
    // register: returns { token, user: {id,name,email}, store: {id,name,slug} } 201
    expect(content).toMatch(/success:\s*true/);
    expect(content).toMatch(/token/);
    expect(content).toMatch(/201/);
    // login: returns 200 with token + user + store
    expect(content).toMatch(/INVALID_CREDENTIALS/);
    expect(content).toMatch(/FORBIDDEN/);
    // logout: returns success: true
    expect(content).toMatch(/Logged out successfully/);
  });

  it('auth.ts must preserve 401/403/404/409 error codes', () => {
    const content = read(authRouteFile);
    expect(content).toMatch(/INVALID_CREDENTIALS/);
    expect(content).toMatch(/FORBIDDEN/);
    expect(content).toMatch(/NOT_FOUND/);
    expect(content).toMatch(/CONFLICT/);
  });

  it('auth.ts must preserve requireAuth on /me and /logout', () => {
    const content = read(authRouteFile);
    expect(content).toMatch(/authRouter\.get\(['"]\/me['"],\s*requireAuth\(\)/);
    expect(content).toMatch(/authRouter\.post\(['"]\/logout['"],\s*requireAuth\(\)/);
  });

  it('AuthFlowService must exist in commerce-core', () => {
    expect(existsSync(authFlowServiceFile)).toBe(true);
    const content = read(authFlowServiceFile);
    expect(content).toMatch(/export\s+class\s+AuthFlowService/);
  });

  it('AuthFlowService must own all 4 business operations', () => {
    const content = read(authFlowServiceFile);
    expect(content).toMatch(/async\s+register/);
    expect(content).toMatch(/async\s+login/);
    expect(content).toMatch(/async\s+getMe/);
    expect(content).toMatch(/async\s+logout/);
  });

  it('AuthFlowService must be the only place that touches the auth tables', () => {
    // The service is the single source of truth for users + tenants
    // + tenantUsers + stores (auth-touching) + userStoreRoles. The
    // route must not import these tables directly.
    const routeContent = read(authRouteFile);
    expect(routeContent).not.toMatch(/s\.users/);
    expect(routeContent).not.toMatch(/s\.tenants/);
    expect(routeContent).not.toMatch(/s\.tenantUsers/);
    expect(routeContent).not.toMatch(/s\.userStoreRoles/);
  });

  it('AuthFlowService must be exported from @haa/commerce-core', () => {
    const indexContent = read(commerceCoreIndex);
    expect(indexContent).toMatch(/AuthFlowService/);
  });
});

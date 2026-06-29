import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const adminAuthRouteFile = resolve(projectRoot, 'apps/api/src/routes/admin/auth.ts');
const adminAuthServiceFile = resolve(projectRoot, 'packages/auth-core/src/admin-auth-service.ts');
const authCoreIndex = resolve(projectRoot, 'packages/auth-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 2/24
 *
 * Pins the contract that the admin auth route
 * (apps/api/src/routes/admin/auth.ts) was migrated from direct
 * Drizzle access to a dedicated AdminAuthService in @haa/auth-core.
 *
 * Critical: this is ADMIN auth. It must NOT be conflated with the
 * merchant AuthFlowService. The test asserts that the service name
 * is admin-specific and that the route does not import
 * AuthFlowService or anything merchant-related.
 */
describe('Quality Pass 5 — Route Migration 2/24: admin/auth.ts', () => {
  it('admin/auth.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(adminAuthRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('admin/auth.ts route must use AdminAuthService (NOT AuthFlowService — no auth mixing)', () => {
    const content = read(adminAuthRouteFile);
    expect(content).toMatch(/AdminAuthService/);
    // Hard guard: merchant auth must NEVER appear in the admin route
    expect(content).not.toMatch(/AuthFlowService/);
    expect(content).not.toMatch(/@haa\/commerce-core/);
  });

  it('admin/auth.ts must preserve the loginRoute export shape', () => {
    const content = read(adminAuthRouteFile);
    expect(content).toMatch(/export\s+async\s+function\s+loginRoute/);
  });

  it('admin/auth.ts must preserve the request shape (email + password from c.req.valid)', () => {
    const content = read(adminAuthRouteFile);
    // The route reads the validated body — email + password must flow through
    expect(content).toMatch(/function validJson<[\s\S]*?c\.req\.valid\(['"]json['"] as never\)/);
    expect(content).toMatch(/validJson<AdminLoginBody>\(c\)/);
    expect(content).toMatch(/email/);
    expect(content).toMatch(/password/);
  });

  it('admin/auth.ts must preserve the success response shape (token + user {id,name,email})', () => {
    // The route returns the service's result directly, so the user
    // shape comes from AdminLoginResult type — the test asserts the
    // type exists, not the literal in the route.
    const svcContent = read(adminAuthServiceFile);
    expect(svcContent).toMatch(/user:\s*{\s*id:\s*number;\s*name:\s*string;\s*email:\s*string\s*}/);
  });

  it('admin/auth.ts must preserve 401 + UNAUTHORIZED on failure', () => {
    // The route returns 401 + UNAUTHORIZED; the actual error message
    // lives in the service (so different failure paths share one string
    // to avoid leaking which condition failed).
    const routeContent = read(adminAuthRouteFile);
    const svcContent = read(adminAuthServiceFile);
    expect(routeContent).toMatch(/401/);
    expect(routeContent).toMatch(/UNAUTHORIZED/);
    expect(svcContent).toMatch(/Invalid admin credentials/);
  });

  it('admin/auth.ts must delegate audit logging to the service', () => {
    // Audit calls live in the service, not the route. The test asserts
    // the service contains them and the route does NOT call audit
    // directly (no AuditLogService import).
    const routeContent = read(adminAuthRouteFile);
    const svcContent = read(adminAuthServiceFile);
    expect(svcContent).toMatch(/admin_login/);
    expect(svcContent).toMatch(/admin_login_failed/);
    expect(routeContent).not.toMatch(/AuditLogService/);
    expect(routeContent).not.toMatch(/audit\.record/);
  });

  it('AdminAuthService must exist in @haa/auth-core', () => {
    expect(existsSync(adminAuthServiceFile)).toBe(true);
    const content = read(adminAuthServiceFile);
    expect(content).toMatch(/export\s+class\s+AdminAuthService/);
  });

  it('AdminAuthService must own the admin login business logic', () => {
    const content = read(adminAuthServiceFile);
    expect(content).toMatch(/async\s+login/);
    // Must verify isAdmin + isActive
    expect(content).toMatch(/isAdmin/);
    expect(content).toMatch(/isActive/);
    // Must use verifyPassword + signAdminToken
    expect(content).toMatch(/verifyPassword/);
    expect(content).toMatch(/signAdminToken/);
  });

  it('AdminAuthService must return a discriminated result (success vs error)', () => {
    const content = read(adminAuthServiceFile);
    expect(content).toMatch(/kind:\s*['"]unauthorized['"]|Unauthorized|unauthorized/i);
  });

  it('AdminAuthService must be exported from @haa/auth-core', () => {
    const indexContent = read(authCoreIndex);
    expect(indexContent).toMatch(/admin-auth-service/);
  });

  it('AdminAuthService must NOT depend on merchant auth (AuthFlowService)', () => {
    const content = read(adminAuthServiceFile);
    // Strip JSDoc comments so the assertion doesn't match text in
    // documentation. (We DO want to keep a hard ban on the import.)
    const code = content.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[\s]*\*.*$/gm, '');
    expect(code).not.toMatch(/AuthFlowService/);
    expect(code).not.toMatch(/@haa\/commerce-core/);
  });

  it('admin/auth.ts must not touch the users table directly', () => {
    const content = read(adminAuthRouteFile);
    expect(content).not.toMatch(/s\.users/);
  });
});

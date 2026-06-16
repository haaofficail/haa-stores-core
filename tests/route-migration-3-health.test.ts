import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const healthRouteFile = resolve(projectRoot, 'apps/api/src/routes/health.ts');
const healthServiceFile = resolve(projectRoot, 'packages/integration-core/src/basic-health-service.ts');
const integrationCoreIndex = resolve(projectRoot, 'packages/integration-core/src/index.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

/**
 * Quality Pass 5 — Route Migration 3/24
 *
 * Pins the contract that the health route
 * (apps/api/src/routes/health.ts) was migrated from direct
 * Drizzle access to a BasicHealthService in @haa/integration-core.
 *
 * Critical: the existing `HealthCheckService` in @haa/integration-core
 * returns a k8s-style readiness shape. The basic health route returns
 * a DIFFERENT, simpler liveness shape (api/db/environment/timestamp/uptime).
 * These are NOT the same service — the test asserts that the basic
 * route uses a dedicated BasicHealthService, NOT the existing
 * HealthCheckService, to avoid changing the response shape.
 */
describe('Quality Pass 5 — Route Migration 3/24: health.ts', () => {
  it('health.ts route must NOT import drizzle-orm directly (Principle 5)', () => {
    const content = read(healthRouteFile);
    expect(content).not.toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db['"]/);
    expect(content).not.toMatch(/from\s+['"]@haa\/db\/schema['"]/);
  });

  it('health.ts route must use BasicHealthService (NOT the existing HealthCheckService)', () => {
    const content = read(healthRouteFile);
    expect(content).toMatch(/BasicHealthService/);
    // Hard guard: must NOT use the k8s-style HealthCheckService
    // because the basic route returns a DIFFERENT, simpler shape.
    expect(content).not.toMatch(/HealthCheckService/);
  });

  it('health.ts must preserve the GET / endpoint', () => {
    const content = read(healthRouteFile);
    expect(content).toMatch(/healthRouter\.get\(['"]\/['"]/);
  });

  it('health.ts must preserve the EXACT response shape (api, db, environment, timestamp, uptime)', () => {
    const content = read(healthRouteFile);
    // Each key must be in the response
    expect(content).toMatch(/api:\s*['"]ok['"]/);
    expect(content).toMatch(/db:/);
    expect(content).toMatch(/environment:/);
    expect(content).toMatch(/timestamp:/);
    expect(content).toMatch(/uptime:/);
  });

  it('health.ts must preserve the db "connected" / "disconnected" string values', () => {
    const content = read(healthRouteFile);
    expect(content).toMatch(/['"]connected['"]/);
    expect(content).toMatch(/['"]disconnected['"]/);
  });

  it('health.ts must not touch the db directly', () => {
    const content = read(healthRouteFile);
    expect(content).not.toMatch(/createDbClient/);
    expect(content).not.toMatch(/db\.execute/);
    expect(content).not.toMatch(/sql`/);
  });

  it('BasicHealthService must exist in @haa/integration-core', () => {
    expect(existsSync(healthServiceFile)).toBe(true);
    const content = read(healthServiceFile);
    expect(content).toMatch(/export\s+class\s+BasicHealthService/);
  });

  it('BasicHealthService must own the DB ping business logic', () => {
    const content = read(healthServiceFile);
    expect(content).toMatch(/async\s+ping/);
    // The service still uses drizzle-orm internally — that is correct
    // (services are the ONLY place that may use Drizzle).
    expect(content).toMatch(/from\s+['"]drizzle-orm['"]/);
    expect(content).toMatch(/from\s+['"]@haa\/db['"]/);
  });

  it('BasicHealthService must return a boolean-ish result (true if db is reachable)', () => {
    const content = read(healthServiceFile);
    // The service returns a structured result the route maps to the
    // existing "connected" / "disconnected" string.
    expect(content).toMatch(/connected:\s*boolean|isConnected/);
  });

  it('BasicHealthService must be exported from @haa/integration-core', () => {
    const indexContent = read(integrationCoreIndex);
    expect(indexContent).toMatch(/basic-health-service/);
  });

  it('BasicHealthService must NOT use the k8s-style HealthCheckService internally', () => {
    const content = read(healthServiceFile);
    // Strip JSDoc + line comments so the assertion doesn't match
    // text in documentation. (We DO want to keep a hard ban on the
    // import.)
    const code = content
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(code).not.toMatch(/HealthCheckService/);
  });
});

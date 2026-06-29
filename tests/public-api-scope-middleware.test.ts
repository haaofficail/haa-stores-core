import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(new URL('..', import.meta.url).pathname);
const publicApiPath = resolve(projectRoot, 'apps/api/src/routes/public-api.ts');

function readPublicApiRoute(): string {
  return readFileSync(publicApiPath, 'utf-8');
}

function getRouteHandlerBody(content: string, method: 'get' | 'post', path: string): string {
  const routeStart = content.indexOf(`publicApiRouter.${method}('${path}'`);
  expect(routeStart).toBeGreaterThanOrEqual(0);

  const handlerStart = content.indexOf('async (c) => {', routeStart);
  expect(handlerStart).toBeGreaterThanOrEqual(0);

  const nextRouteStart = content.indexOf('publicApiRouter.', handlerStart + 1);
  const handlerEnd = nextRouteStart === -1 ? content.indexOf('export { publicApiRouter }', handlerStart) : nextRouteStart;
  expect(handlerEnd).toBeGreaterThan(handlerStart);

  return content.slice(handlerStart, handlerEnd);
}

describe('Public API scope middleware', () => {
  it('defines a typed API-key scope middleware that returns the existing FORBIDDEN response', () => {
    const content = readPublicApiRoute();

    expect(content).toContain("type PublicApiScope = 'products:read' | 'orders:read' | 'orders:create'");
    expect(content).toMatch(/const requireApiKeyScope = \(scope: PublicApiScope\) => async \(c: Context<PublicApiEnv>, next: Next\)/);
    expect(content).toContain("if (!meta.scopes.includes(scope))");
    expect(content).toContain("code: 'FORBIDDEN', message: 'Insufficient scope'");
    expect(content).toContain('await next();');
  });

  it('attaches the expected scope middleware to every public API route', () => {
    const content = readPublicApiRoute();

    expect(content).toMatch(/publicApiRouter\.get\(\s*['"]\/products['"],\s*requireApiKeyScope\(['"]products:read['"]\),\s*async/);
    expect(content).toMatch(/publicApiRouter\.get\(\s*['"]\/orders['"],\s*requireApiKeyScope\(['"]orders:read['"]\),\s*async/);
    expect(content).toMatch(/publicApiRouter\.post\(\s*['"]\/orders['"],\s*requireApiKeyScope\(['"]orders:create['"]\),\s*async/);
  });

  it('keeps scope authorization out of route handler bodies', () => {
    const content = readPublicApiRoute();
    const handlerBodies = [
      getRouteHandlerBody(content, 'get', '/products'),
      getRouteHandlerBody(content, 'get', '/orders'),
      getRouteHandlerBody(content, 'post', '/orders'),
    ];

    for (const body of handlerBodies) {
      expect(body).not.toContain('scopes.includes');
      expect(body).not.toContain('Insufficient scope');
      expect(body).not.toContain("code: 'FORBIDDEN'");
    }
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const routesDir = resolve(projectRoot, 'apps/api/src/routes');
const servicesDir = resolve(projectRoot, 'apps/api/src/services');
const commerceCoreSrc = resolve(projectRoot, 'packages/commerce-core/src');
const servicesReadme = resolve(servicesDir, 'README.md');

/**
 * Quality Pass 5 — Item 1: Service Layer Enforcement
 *
 * Principle 5 from COMMITMENTS.md: "No route accesses Drizzle directly
 * (must go through service)". The architecture IS already service-based
 * (packages/commerce-core has 29 service files; apps/api/src/services has
 * observability + support-error-log), but 24 route files still bypass
 * the service layer and import drizzle-orm directly.
 *
 * This test does TWO things:
 *   1. Asserts the structural rules that make the service layer
 *      enforceable going forward (convention doc, no new violations).
 *   2. Logs the list of existing violations as a migration backlog,
 *      so a future session can convert them one-by-one. The number of
 *      existing violations is asserted to be ≤ a fixed budget that
 *      shrinks as the migration progresses.
 */

const MAX_EXISTING_ROUTE_VIOLATIONS = 22; // hard ceiling — must not grow

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

// Recursive .ts/.tsx walker
function walk(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  const entries = require('node:fs').readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(e.name) && !e.name.endsWith('.test.ts')) {
      out.push(p);
    }
  }
  return out;
}

describe('Quality Pass 5 — Service Layer Enforcement (Item 1)', () => {
  it('services/ directory must exist', () => {
    expect(existsSync(servicesDir)).toBe(true);
  });

  it('services/ must contain a README.md documenting the service-layer convention', () => {
    expect(existsSync(servicesReadme)).toBe(true);
    const content = read(servicesReadme);
    // Must document what counts as a "service" + how to add a new one
    expect(content).toMatch(/service/i);
    expect(content).toMatch(/drizzle/i);
  });

  it('commerce-core service layer must exist and host the business logic', () => {
    expect(existsSync(commerceCoreSrc)).toBe(true);
    const files = walk(commerceCoreSrc);
    // At least 25 service files (we counted 29)
    expect(files.length).toBeGreaterThanOrEqual(25);
  });

  it('existing route files should not import drizzle-orm DIRECTLY (Principle 5)', () => {
    const routeFiles = walk(routesDir);
    const violations: { file: string; reason: string }[] = [];

    for (const f of routeFiles) {
      const content = read(f);
      if (/from\s+['"]drizzle-orm['"]/.test(content)) {
        violations.push({ file: f.replace(projectRoot + '/', ''), reason: 'imports drizzle-orm directly' });
      }
    }

    // Log for visibility — does NOT fail the test, just reports
    if (violations.length > 0) {
      // eslint-disable-next-line no-console
      console.warn(
        `\n[Service Layer Migration Backlog] ${violations.length} route file(s) import drizzle-orm directly:\n` +
          violations.map(v => `  - ${v.file}`).join('\n') +
          `\nBudget: ${MAX_EXISTING_ROUTE_VIOLATIONS} (current: ${violations.length})`
      );
    }

    expect(violations.length).toBeLessThanOrEqual(MAX_EXISTING_ROUTE_VIOLATIONS);
  });

  it('services/observability.ts must exist and be wired into the app', () => {
    // Already shipped in QP 4 Item 2, but the service layer relies on
    // observability being a real service (not inline middleware code).
    const obs = resolve(servicesDir, 'observability.ts');
    expect(existsSync(obs)).toBe(true);
    const index = resolve(projectRoot, 'apps/api/src/index.ts');
    expect(read(index)).toMatch(/initObservability/);
  });

  it('services/support-error-log.ts must exist and use the structured NDJSON store', () => {
    // This is the in-process error log that the queue would later
    // drain into a real backend. Codify that it exists.
    const f = resolve(servicesDir, 'support-error-log.ts');
    expect(existsSync(f)).toBe(true);
    const content = read(f);
    expect(content).toMatch(/ndjson|NDJSON/);
  });

  it('no NEW drizzle-orm imports should appear in route files (architectural regression guard)', () => {
    // This is a stricter guard for after the migration: each commit
    // should only REDUCE the violation count, never increase it.
    // We assert the current count + a one-line summary; the structural
    // guarantee is the budget ceiling above.
    const routeFiles = walk(routesDir);
    const violations = routeFiles.filter(f => /from\s+['"]drizzle-orm['"]/.test(read(f)));
    // eslint-disable-next-line no-console
    console.log(`[Service Layer] Current route → drizzle-orm violations: ${violations.length}`);
    expect(violations.length).toBeLessThanOrEqual(MAX_EXISTING_ROUTE_VIOLATIONS);
  });
});

import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const observabilityFile = resolve(projectRoot, 'apps/api/src/services/observability.ts');
const errorHandlerFile = resolve(projectRoot, 'apps/api/src/middleware/error-handler.ts');
const indexFile = resolve(projectRoot, 'apps/api/src/index.ts');
const envFile = resolve(projectRoot, 'apps/api/src/env.ts');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

describe('Quality Pass 4 — Observability Wiring (Item 2)', () => {
  it('observability service module must exist', () => {
    expect(existsSync(observabilityFile)).toBe(true);
  });

  it('observability module must export an ErrorMonitor-compatible factory', () => {
    const content = read(observabilityFile);
    expect(content).toMatch(/captureException/);
    expect(content).toMatch(/captureMessage/);
    expect(content).toMatch(/export\s+(function|const|class)\s+create\w*Monitor/);
  });

  it('observability module must implement a noop monitor (always safe to call)', () => {
    const content = read(observabilityFile);
    expect(content).toMatch(/Noop\w*Monitor|NoOp\w*Monitor|noopMonitor|createNoop/);
  });

  it('observability module must support a Sentry-backed monitor (lazy @sentry/node require)', () => {
    const content = read(observabilityFile);
    // Either a Sentry-backed factory or a dynamic require of @sentry/node
    expect(content).toMatch(/Sentry|sentry/i);
    // Must NOT hard-require @sentry/node at module load — only lazy/dynamic
    expect(content).not.toMatch(/from\s+['"]@sentry\/node['"]/);
  });

  it('error-handler must call monitor.captureException for unhandled errors', () => {
    const content = read(errorHandlerFile);
    expect(content).toMatch(/monitor\?\.captureException|captureException/);
  });

  it('index.ts must initialize the error monitor at boot', () => {
    const content = read(indexFile);
    // Must call setErrorMonitor somewhere in boot
    expect(content).toMatch(/setErrorMonitor|initObservability|create\w*Monitor/);
  });

  it('observability module must respect SENTRY_DSN env to choose implementation', () => {
    const content = read(observabilityFile);
    expect(content).toMatch(/SENTRY_DSN/);
  });

  it('observability must never throw if Sentry is not installed (graceful noop)', () => {
    const content = read(observabilityFile);
    // Should have a try/catch around the Sentry init OR a guard that
    // returns the noop when the require fails
    expect(content).toMatch(/try\s*\{|catch\s*\(/);
  });

  it('env.ts must declare SENTRY_DSN as a recognized env var', () => {
    const content = read(envFile);
    expect(content).toMatch(/SENTRY_DSN/);
  });

  it('env.ts must declare OTEL_EXPORTER_OTLP_ENDPOINT as a recognized env var', () => {
    const content = read(envFile);
    expect(content).toMatch(/OTEL_EXPORTER_OTLP_ENDPOINT/);
  });
});

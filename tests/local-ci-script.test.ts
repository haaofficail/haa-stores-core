import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const scriptPath = resolve(projectRoot, 'scripts/local-ci.mjs');

describe('Quality Pass 1 — Local CI Script (Item 4)', () => {
  it('scripts/local-ci.mjs must exist', () => {
    expect(existsSync(scriptPath)).toBe(true);
  });

  it('local-ci.mjs must be a Node script (mjs)', () => {
    expect(scriptPath.endsWith('.mjs')).toBe(true);
  });

  it('local-ci.mjs must run pnpm preflight', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/pnpm preflight|pnpm\s+run\s+preflight/);
  });

  it('local-ci.mjs must run pnpm typecheck', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/pnpm typecheck|pnpm\s+run\s+typecheck/);
  });

  it('local-ci.mjs must run pnpm lint', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/pnpm lint|pnpm\s+run\s+lint/);
  });

  it('local-ci.mjs must run pnpm test', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/pnpm test|pnpm\s+run\s+test/);
  });

  it('local-ci.mjs must exit with non-zero on failure', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/process\.exit\(1\)/);
  });

  it('local-ci.mjs must print clear pass/fail output for each step', () => {
    const content = readFileSync(scriptPath, 'utf-8');
    expect(content).toMatch(/✅|✓|PASS/);
    expect(content).toMatch(/❌|✗|FAIL/);
  });
});

describe('Quality Pass 1 — local-ci npm script', () => {
  it('package.json must include ci:local script', () => {
    const pkg = JSON.parse(readFileSync(resolve(projectRoot, 'package.json'), 'utf-8'));
    expect(pkg.scripts['ci:local']).toBeDefined();
    expect(pkg.scripts['ci:local']).toMatch(/local-ci/);
  });
});

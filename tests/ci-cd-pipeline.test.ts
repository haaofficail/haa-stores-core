import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');
const workflowsDir = resolve(projectRoot, '.github/workflows');
const migrationHashScript = resolve(projectRoot, 'scripts/record-migration-hashes.mjs');

describe('Quality Pass 1 — CI/CD Pipeline (Item 4)', () => {
  it('.github/workflows directory must exist', () => {
    expect(existsSync(workflowsDir)).toBe(true);
  });

  it('ci.yml workflow file must exist', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    expect(existsSync(ciFile)).toBe(true);
  });

  it('ci.yml must trigger on push and pull_request', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    const content = readFileSync(ciFile, 'utf-8');
    expect(content).toMatch(/on:\s*\n[\s\S]*push:/m);
    expect(content).toMatch(/pull_request:/);
  });

  it('ci.yml must run pnpm install', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    const content = readFileSync(ciFile, 'utf-8');
    expect(content).toMatch(/pnpm install/);
  });

  it('ci.yml must run pnpm typecheck', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    const content = readFileSync(ciFile, 'utf-8');
    expect(content).toMatch(/pnpm typecheck/);
  });

  it('ci.yml must run pnpm lint', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    const content = readFileSync(ciFile, 'utf-8');
    expect(content).toMatch(/pnpm lint/);
  });

  it('ci.yml must run pnpm test', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    const content = readFileSync(ciFile, 'utf-8');
    expect(content).toMatch(/pnpm test/);
  });

  it('test job must provide and prepare PostgreSQL for DB-backed tests', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    const content = readFileSync(ciFile, 'utf-8');
    expect(content).toMatch(/test:[\s\S]*services:[\s\S]*postgres:16-alpine/);
    expect(content).toMatch(/test:[\s\S]*DATABASE_URL:/);
    expect(content).toMatch(
      /Prepare test database[\s\S]*pnpm db:bootstrap[\s\S]*pnpm db:seed/,
    );
  });

  it('build jobs must compile workspace packages before individual apps', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    const content = readFileSync(ciFile, 'utf-8');
    const sharedBuildIndex = content.lastIndexOf(
      "pnpm -r --filter './packages/**' --workspace-concurrency=1 build",
    );
    const appBuildIndex = content.indexOf('pnpm --filter @haa/${{ matrix.app }} build');
    expect(sharedBuildIndex).toBeGreaterThan(-1);
    expect(appBuildIndex).toBeGreaterThan(sharedBuildIndex);
  });

  it('fresh database bootstrap helper must not contain machine-specific paths', () => {
    const content = readFileSync(migrationHashScript, 'utf-8');
    expect(content).toMatch(/from 'postgres'/);
    expect(content).toMatch(/fileURLToPath\(import\.meta\.url\)/);
    expect(content).not.toMatch(/\/Users\//);
  });

  it('ci.yml must run pnpm preflight', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    const content = readFileSync(ciFile, 'utf-8');
    expect(content).toMatch(/pnpm preflight/);
  });

  it('ci.yml must set up Node 20+', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    const content = readFileSync(ciFile, 'utf-8');
    expect(content).toMatch(/setup-node@v\d+/);
    expect(content).toMatch(/node-version:\s*['"]?2[0-9]/);
  });

  it('ci.yml must set up pnpm', () => {
    const ciFile = resolve(workflowsDir, 'ci.yml');
    const content = readFileSync(ciFile, 'utf-8');
    expect(content).toMatch(/pnpm\/action-setup/);
  });
});

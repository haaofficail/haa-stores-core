import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

describe('Quality Pass 1 — ADMIN_JWT_SECRET Validation', () => {
  it('.env.example must document ADMIN_JWT_SECRET', () => {
    const envExample = readFileSync(resolve(projectRoot, '.env.example'), 'utf-8');
    expect(envExample).toMatch(/^ADMIN_JWT_SECRET=/m);
  });

  it('.env.example must document dev default for ADMIN_JWT_SECRET', () => {
    const envExample = readFileSync(resolve(projectRoot, '.env.example'), 'utf-8');
    const match = envExample.match(/^ADMIN_JWT_SECRET=(.+)$/m);
    expect(match).toBeDefined();
    expect(match![1]).toContain('dev');
  });

  it('env.ts must require ADMIN_JWT_SECRET', () => {
    const envTs = readFileSync(resolve(projectRoot, 'apps/api/src/env.ts'), 'utf-8');
    // Should be in the required array
    expect(envTs).toMatch(/'ADMIN_JWT_SECRET'/);
  });

  it('env.ts must validate dev default for ADMIN_JWT_SECRET', () => {
    const envTs = readFileSync(resolve(projectRoot, 'apps/api/src/env.ts'), 'utf-8');
    expect(envTs).toMatch(/ADMIN_JWT_SECRET.*dev-admin-jwt-secret-change-in-production/);
  });

  it('EnvConfig interface must include ADMIN_JWT_SECRET', () => {
    const envTs = readFileSync(resolve(projectRoot, 'apps/api/src/env.ts'), 'utf-8');
    expect(envTs).toMatch(/ADMIN_JWT_SECRET:\s*string/);
  });
});

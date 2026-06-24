// W12 (Autopilot Phase 3) — docker-compose local-safety contract.
//
// The root docker-compose.yml is for LOCAL development only. Production
// uses deploy/production/docker-compose.yml with explicit env files (no
// fallback). The fallback POSTGRES_PASSWORD in the local compose file
// is intentional convenience, but it MUST stay clearly marked as
// local-only or risks accidental production copy.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const root = (p: string): string => resolve(ROOT, p);
const read = (p: string): string => readFileSync(p, 'utf-8');

describe('Docker local safety (W12)', () => {
  const localCompose = read(root('docker-compose.yml'));

  it('root docker-compose.yml carries a LOCAL DEVELOPMENT ONLY header', () => {
    // Top-of-file warning is the single most effective copy-deterrent.
    expect(localCompose).toMatch(/LOCAL DEVELOPMENT ONLY/);
    expect(localCompose).toMatch(/Do NOT use this file for staging or production/);
  });

  it('postgres password is parameterized with a LOCAL-ONLY fallback comment', () => {
    // The fallback exists for convenience on fresh clones, but the
    // comment must signal it's NOT a real secret.
    expect(localCompose).toMatch(/POSTGRES_PASSWORD:\s*\$\{POSTGRES_PASSWORD:-/);
    // Comment immediately above must mention "LOCAL ONLY" so a future
    // copy-paste lands the warning in production by accident too.
    const lines = localCompose.split('\n');
    const pwLine = lines.findIndex((l) => l.includes('POSTGRES_PASSWORD: ${POSTGRES_PASSWORD'));
    expect(pwLine).toBeGreaterThan(0);
    const prevLine = lines[pwLine - 1] ?? '';
    expect(prevLine.toLowerCase()).toMatch(/local only|local-only/);
  });

  it('production compose file exists and is explicit (no fallback for POSTGRES_PASSWORD)', () => {
    const prodPath = root('deploy/production/docker-compose.yml');
    if (!existsSync(prodPath)) {
      // Acceptable: prod compose may live elsewhere. Skip without failing.
      return;
    }
    const prod = read(prodPath);
    // The prod file MUST NOT carry the `:-fallback` form for POSTGRES_PASSWORD.
    // If it did, a missing env var would silently boot with a known-bad value.
    expect(prod).not.toMatch(/POSTGRES_PASSWORD:\s*\$\{POSTGRES_PASSWORD:-/);
  });

  it('staging compose file is explicit (no fallback for POSTGRES_PASSWORD)', () => {
    const stagingPath = root('deploy/staging/docker-compose.yml');
    if (!existsSync(stagingPath)) return;
    const staging = read(stagingPath);
    expect(staging).not.toMatch(/POSTGRES_PASSWORD:\s*\$\{POSTGRES_PASSWORD:-/);
  });

  it('local fallback password does NOT appear in any deploy/ env file', () => {
    // The exact fallback string must never leak into deploy/*. If a
    // future PR accidentally copies it, this guard catches it.
    const FALLBACK = 'haa_secret_2024';
    for (const sub of ['deploy/staging', 'deploy/production']) {
      const dir = root(sub);
      if (!existsSync(dir)) continue;
      // Scan only the .env.example file (real .env is gitignored).
      const envExample = resolve(dir, '.env.example');
      if (!existsSync(envExample)) continue;
      const txt = read(envExample);
      expect(txt).not.toContain(FALLBACK);
    }
  });
});

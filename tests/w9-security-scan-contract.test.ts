// W9 (Autopilot Phase 3) — security scan workflow contract lock.
//
// DECISION-OS-017: security-scan workflow uses Node 22 + runs on every
// PR (in addition to weekly schedule + lockfile-touching push).
// Semgrep is Phase 2, not a launch blocker.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SEC = readFileSync(
  resolve(__dirname, '../.github/workflows/security-scan.yml'),
  'utf-8',
);

describe('Security Scan workflow contract (DECISION-OS-017)', () => {
  it('uses Node 22', () => {
    // Old workflow was on Node 20 — incompatible with packages requiring 22+.
    expect(SEC).toMatch(/node-version:\s*["']?22/);
  });

  it('runs on pull_request (catches vulns before merge)', () => {
    expect(SEC).toMatch(/pull_request:/);
  });

  it('runs on weekly schedule (cron)', () => {
    expect(SEC).toMatch(/schedule:/);
    expect(SEC).toMatch(/cron:/);
  });

  it('runs on push that touches package.json / lockfile', () => {
    expect(SEC).toMatch(/push:/);
    expect(SEC).toMatch(/package\.json/);
    expect(SEC).toMatch(/pnpm-lock\.yaml/);
  });

  it('docs-only PRs skip the scan (paths-ignore)', () => {
    // Consistent with deploy.yml + ci.yml W190 rule.
    expect(SEC).toMatch(/paths-ignore:/);
    expect(SEC).toMatch(/docs\/\*\*/);
  });

  it('supports manual workflow_dispatch', () => {
    expect(SEC).toMatch(/workflow_dispatch/);
  });

  it('runs pnpm audit as one of the jobs', () => {
    expect(SEC.toLowerCase()).toMatch(/pnpm\s+audit|audit-ci|npm\s+audit/);
  });
});

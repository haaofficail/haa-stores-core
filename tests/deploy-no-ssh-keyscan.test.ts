// Deploy workflow must never use `ssh-keyscan` against staging/production.
//
// Background: staging's fail2ban (sshd jail) treats repeated probes from
// GitHub runner IPs as brute-force attempts and bans the runner IP for
// 15+ minutes. Multiple consecutive deploys (e.g. when several PRs land
// in a row) keep hitting the ban and the deploy fails on the very first
// step — before any image work happens. The fix is to either pre-bake
// the known_hosts secret or use `StrictHostKeyChecking accept-new` on
// the first real SSH call.
//
// This test locks the workflow so a future "just add ssh-keyscan back"
// regression cannot ship.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const DEPLOY = readFileSync(resolve(ROOT, '.github/workflows/deploy.yml'), 'utf-8');

describe('Deploy workflow — no ssh-keyscan probing', () => {
  it('never invokes `ssh-keyscan` against a real host', () => {
    // Comments may still reference the term (we explain why we removed it),
    // but no actual shell invocation should remain. We assert there's no
    // line that starts with `ssh-keyscan` after stripping leading whitespace
    // and ignoring lines that are part of a YAML comment or a heredoc echo.
    const offenders: string[] = [];
    DEPLOY.split(/\n/).forEach((line, i) => {
      const trimmed = line.replace(/^\s+/, '');
      if (trimmed.startsWith('#')) return; // YAML comment
      if (/^echo\b/.test(trimmed)) return; // echo "...ssh-keyscan..." is allowed (help text)
      if (/^ssh-keyscan\b/.test(trimmed)) {
        offenders.push(`line ${i + 1}: ${trimmed.slice(0, 100)}`);
      }
    });
    expect(offenders).toEqual([]);
  });

  describe.each([
    ['staging', 'STAGING_KNOWN_HOSTS', 'STAGING_HOST'],
    ['production', 'PRODUCTION_KNOWN_HOSTS', 'PRODUCTION_HOST'],
  ])('%s job', (_env, knownHostsSecret, hostSecret) => {
    it(`reads ${knownHostsSecret} when present`, () => {
      expect(DEPLOY).toMatch(new RegExp(`secrets\\.${knownHostsSecret}`));
    });

    it('falls back to StrictHostKeyChecking accept-new when the secret is absent', () => {
      // The fallback block must reference the host variable + accept-new.
      expect(DEPLOY).toMatch(/StrictHostKeyChecking accept-new/);
      expect(DEPLOY).toMatch(new RegExp(`secrets\\.${hostSecret}`));
    });
  });

  it('configures a sensible ConnectTimeout to avoid hanging on a banned IP', () => {
    expect(DEPLOY).toMatch(/ConnectTimeout 30/);
  });
});

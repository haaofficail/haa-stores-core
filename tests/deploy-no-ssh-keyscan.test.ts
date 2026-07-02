// Deploy workflow must never use `ssh-keyscan` against production, and
// staging must not use inbound SSH at all.
//
// Background: GitHub-hosted runners reached staging SSH inconsistently
// because some rotating runner IPs timed out on TCP 22 before SSH auth.
// Staging deploys now run on the VPS via the dedicated self-hosted runner
// labels, eliminating GitHub-hosted inbound SSH. Production still uses SSH,
// so it keeps the no-keyscan guard.
//
// This test locks the workflow so a future "just add ssh-keyscan back"
// regression cannot ship.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(new URL('..', import.meta.url).pathname);
const DEPLOY = readFileSync(resolve(ROOT, '.github/workflows/deploy.yml'), 'utf-8');

function jobBlock(jobName: string): string {
  const marker = `  ${jobName}:`;
  const start = DEPLOY.indexOf(marker);
  expect(start, `${jobName} job exists`).toBeGreaterThanOrEqual(0);
  const rest = DEPLOY.slice(start + marker.length);
  const next = rest.search(/\n  [a-zA-Z0-9_-]+:\n/);
  return DEPLOY.slice(start, next === -1 ? DEPLOY.length : start + marker.length + next);
}

describe('Deploy workflow — staging self-hosted runner and no ssh-keyscan probing', () => {
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

  describe('staging job', () => {
    const staging = jobBlock('deploy-staging');

    it('runs only on the dedicated staging self-hosted runner labels', () => {
      expect(staging).toMatch(/runs-on:\s*\[self-hosted,\s*linux,\s*x64,\s*haa-staging\]/);
    });

    it('has its own staging deploy concurrency group', () => {
      expect(staging).toMatch(/concurrency:\s*\n\s*group:\s*staging-deploy\s*\n\s*cancel-in-progress:\s*false/);
    });

    it('does not require staging SSH secrets or inbound SSH commands', () => {
      expect(staging).not.toMatch(/STAGING_SSH_KEY/);
      expect(staging).not.toMatch(/STAGING_HOST/);
      expect(staging).not.toMatch(/STAGING_USER/);
      expect(staging).not.toMatch(/STAGING_SSH_PORT/);
      expect(staging).not.toMatch(/webfactory\/ssh-agent/);
      expect(staging).not.toMatch(/\bssh\s+-p\b/);
      expect(staging).not.toMatch(/\bscp\s+-P\b/);
      expect(staging).not.toMatch(/StrictHostKeyChecking/);
      expect(staging).not.toMatch(/ssh-keygen/);
    });

    it('authenticates GHCR locally on the self-hosted runner', () => {
      expect(staging).toMatch(/docker login ghcr\.io -u "\$\{\{ github\.actor \}\}" --password-stdin/);
    });

    it('copies staging deploy config locally instead of scp-ing it over SSH', () => {
      expect(staging).toMatch(/cp deploy\/staging\/Caddyfile "\$DEPLOY_PATH\/Caddyfile"/);
      expect(staging).toMatch(/cp deploy\/staging\/docker-compose\.yml "\$DEPLOY_PATH\/docker-compose\.yml"/);
    });
  });

  describe('production job', () => {
    const production = jobBlock('deploy-production');

    it('reads PRODUCTION_KNOWN_HOSTS when present', () => {
      expect(production).toMatch(/secrets\.PRODUCTION_KNOWN_HOSTS/);
    });

    it('falls back to StrictHostKeyChecking accept-new when the secret is absent', () => {
      // The fallback block must reference the host variable + accept-new.
      expect(production).toMatch(/StrictHostKeyChecking accept-new/);
      expect(production).toMatch(/secrets\.PRODUCTION_HOST/);
    });

    it('configures a sensible ConnectTimeout to avoid hanging on a banned IP', () => {
      expect(production).toMatch(/ConnectTimeout 30/);
    });
  });

  describe('Caddyfile + docker-compose.yml sync (PR #60 follow-up)', () => {
    it('production deploy scps deploy/production/Caddyfile + docker-compose.yml', () => {
      expect(DEPLOY).toMatch(/scp\s+-o\s+BatchMode=yes\s+deploy\/production\/Caddyfile/);
      expect(DEPLOY).toMatch(/scp\s+-o\s+BatchMode=yes\s+deploy\/production\/docker-compose\.yml/);
    });

    it('validates Caddyfile before reload (so a bad config does not break Caddy)', () => {
      expect(DEPLOY).toMatch(/caddy validate --config \/etc\/caddy\/Caddyfile/);
    });

    it('reloads Caddy after deploy so the new Caddyfile is picked up', () => {
      expect(DEPLOY).toMatch(/caddy reload --config \/etc\/caddy\/Caddyfile/);
    });
  });
});

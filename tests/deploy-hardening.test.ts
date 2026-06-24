import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, '..');

function read(p: string): string {
  return existsSync(p) ? readFileSync(p, 'utf-8') : '';
}

describe('Deploy hardening — fail2ban + watchdog + scheduler test gate', () => {
  describe('SSH warmup window', () => {
    const deployYml = read(resolve(projectRoot, '.github/workflows/deploy.yml'));

    it('has at least 6 retry attempts in staging warmup', () => {
      // The old 3-attempt schedule capped at ~3 min — below the 15-min
      // fail2ban window. We now expect 6 attempts covering ~24 min.
      // Match: `backoffs=(30 60 120 240 480 480)` or similar 6-item form.
      expect(deployYml).toMatch(/backoffs=\(\s*30\s+60\s+120\s+240\s+480\s+480\s*\)/);
    });

    it('staging warmup uses ConnectTimeout=20 (not 30)', () => {
      // 20s per attempt × 6 attempts gives more room for the 24-min budget
      // without burning the runner's 6-hour job quota on hung TCPs.
      expect(deployYml).toMatch(/ssh -o ConnectTimeout=20 -o BatchMode=yes/);
    });

    it('staging warmup includes a manual-unban hint in the failure message', () => {
      // Operator should never have to dig through a playbook to find the
      // unban command on the first failure surface.
      expect(deployYml).toMatch(/fail2ban-client unban/);
    });

    it('does NOT silently downgrade retry count', () => {
      // Guard against a well-meaning future commit shortening the loop.
      // The old 3-attempt schedule is what caused PR #182's Deploy #205
      // to fail. The new schedule MUST stay >= 6 attempts.
      expect(deployYml).not.toMatch(/for attempt in 1 2 3; do/);
    });
  });

  describe('Watchdog workflow', () => {
    const watchdogYml = read(resolve(projectRoot, '.github/workflows/deploy-watchdog.yml'));

    it('exists', () => {
      expect(existsSync(resolve(projectRoot, '.github/workflows/deploy-watchdog.yml'))).toBe(true);
    });

    it('triggers on completed Deploy runs', () => {
      expect(watchdogYml).toMatch(/workflow_run/);
      expect(watchdogYml).toMatch(/workflows:\s*\['Deploy'\]/);
      expect(watchdogYml).toMatch(/types:\s*\[completed\]/);
    });

    it('classifies failures (ssh-fail2ban / code-failure / unknown)', () => {
      expect(watchdogYml).toMatch(/fail_kind=.ssh-fail2ban./);
      expect(watchdogYml).toMatch(/fail_kind=.code-failure./);
    });

    it('only auto-retries ssh-fail2ban failures', () => {
      // Code failures must NOT be auto-retried — they need code fixes.
      expect(watchdogYml).toMatch(/if: steps\.inspect\.outputs\.fail_kind == 'ssh-fail2ban'/);
    });

    it('waits past the 15-min ban window before retry (sleep >= 1080)', () => {
      // 1080 s = 18 min, which is the 15-min ban + a 3-min safety margin.
      expect(watchdogYml).toMatch(/sleep 1080/);
    });

    it('limits to one rerun per failure (checks runAttempt)', () => {
      expect(watchdogYml).toMatch(/runAttempt/);
    });

    it('opens a tracking issue when not auto-recoverable', () => {
      expect(watchdogYml).toMatch(/gh issue create/);
      expect(watchdogYml).toMatch(/--label deploy-failure/);
    });

    it('auto-closes deploy-failure issues on successful deploy', () => {
      expect(watchdogYml).toMatch(/close_on_success/);
      expect(watchdogYml).toMatch(/gh issue close/);
    });
  });

  describe('Scheduler test gate (root-cause for vitest teardown flake)', () => {
    const workerSrc = read(resolve(projectRoot, 'apps/api/src/worker.ts'));

    it('startScheduler short-circuits when NODE_ENV=test', () => {
      expect(workerSrc).toMatch(/if \(process\.env\.NODE_ENV === 'test'\) \{\s*return;/);
    });

    it('startBullMQWorker short-circuits when NODE_ENV=test', () => {
      // Same guard for the BullMQ consumer side.
      const bullSection = workerSrc.slice(workerSrc.indexOf('async function startBullMQWorker'));
      expect(bullSection.slice(0, 500)).toMatch(/NODE_ENV === 'test'/);
    });

    it('PROBLEM-012 explanation is documented inline', () => {
      // Future contributors must see WHY the test gate exists, otherwise
      // someone "cleans it up" and the CI flake returns.
      expect(workerSrc).toMatch(/PROBLEM-012/);
    });
  });

  describe('Deploy failure playbook', () => {
    const playbook = read(resolve(projectRoot, 'docs/ops/DEPLOY_FAILURE_PLAYBOOK.md'));

    it('exists', () => {
      expect(existsSync(resolve(projectRoot, 'docs/ops/DEPLOY_FAILURE_PLAYBOOK.md'))).toBe(true);
    });

    it('documents the failure classes', () => {
      expect(playbook).toMatch(/ssh-fail2ban/);
      expect(playbook).toMatch(/code-failure/);
    });

    it('documents anti-patterns', () => {
      // Future operators must know what NOT to do.
      expect(playbook.toLowerCase()).toMatch(/anti-pattern/);
      expect(playbook).toMatch(/Do NOT/);
    });
  });
});

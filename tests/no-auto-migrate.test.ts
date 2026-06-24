// No auto-migrate in deploy automation — DECISION-OS-016.
//
// Locks the rule that no deploy automation runs `pnpm db:migrate` (or
// equivalent) implicitly. Migrations are an explicit, manual step.
//
// This test fails if `db:migrate` is invoked without the kill-confirm
// gate inside any deploy script or GitHub Actions deploy workflow.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');

const FILES_TO_CHECK = [
  '.github/workflows/deploy.yml',
  '.github/workflows/ci.yml',
  'scripts/deploy-bundle.sh',
  'scripts/server/bootstrap-staging-server.sh',
  'scripts/server/install-staging-stack.sh',
  'scripts/server/smoke-staging.sh',
];

describe('No auto-migrate in deploy automation (DECISION-OS-016)', () => {
  for (const rel of FILES_TO_CHECK) {
    it(`${rel} does not run pnpm db:migrate without acknowledgement gate`, () => {
      let text: string;
      try {
        text = readFileSync(resolve(ROOT, rel), 'utf-8');
      } catch {
        // File missing is OK — the rule is "do not call it"; absence is compliant.
        return;
      }

      // Find every occurrence of `pnpm db:migrate` (or `pnpm db:reset`).
      const lines = text.split('\n');
      const offenders: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!/pnpm\s+db:(migrate|reset)/.test(line)) continue;

        // Allow if it's inside a guarded block — we look for the explicit env-var
        // gate token in the surrounding 10 lines above the match.
        const start = Math.max(0, i - 10);
        const context = lines.slice(start, i + 1).join('\n');
        if (/HAA_DEPLOY_BUNDLE_MIGRATE_ACK/.test(context)) continue;

        // Allow commented-out lines.
        const trimmed = line.trim();
        if (trimmed.startsWith('#')) continue;
        if (trimmed.startsWith('//')) continue;

        offenders.push(`${rel}:${i + 1} — ${trimmed}`);
      }

      if (offenders.length > 0) {
        throw new Error(
          'Unguarded `pnpm db:migrate` in deploy automation (DECISION-OS-016):\n' +
            offenders.join('\n'),
        );
      }
      expect(offenders).toEqual([]);
    });
  }

  // W8 (Autopilot Phase 3): the spec ALSO requires that the manual
  // operator path is documented + reachable. The canonical path is:
  //   gh workflow run "Ops — Staging DB Migrate"
  // backed by .github/workflows/ops-staging-migrate.yml. That workflow
  // is explicit (workflow_dispatch only) and is NOT "auto" — it
  // requires owner click.
  it('ops-staging-migrate workflow exists + is workflow_dispatch ONLY (no push trigger)', () => {
    const opsYml = readFileSync(
      resolve(ROOT, '.github/workflows/ops-staging-migrate.yml'),
      'utf-8',
    );
    expect(opsYml).toMatch(/workflow_dispatch/);
    // It must NOT have a `push:` trigger — that would be auto-migrate.
    // Allow `push:` only inside comments (lines starting with `#`).
    const lines = opsYml.split('\n');
    const pushTriggers = lines.filter((l) => /^\s*push:/.test(l));
    expect(pushTriggers).toEqual([]);
  });

  it('deploy-bundle.sh requires HAA_DEPLOY_BUNDLE_MIGRATE_ACK to run migrate', () => {
    const bundle = readFileSync(
      resolve(ROOT, 'scripts/deploy-bundle.sh'),
      'utf-8',
    );
    // The gate token is documented + checked before invoking migrate.
    expect(bundle).toMatch(/HAA_DEPLOY_BUNDLE_MIGRATE_ACK/);
    expect(bundle).toMatch(/I-have-reviewed-the-migrations/);
    expect(bundle).toMatch(/DECISION-OS-016/);
  });

  it('agent memory / docs document the no-auto-migrate rule', () => {
    // The rule must be discoverable from at least one OWNER_DECISIONS
    // entry so any future agent finds it before touching deploy paths.
    const ownerDecisions = readFileSync(
      resolve(ROOT, 'docs/agent-os/OWNER_DECISIONS.md'),
      'utf-8',
    );
    expect(ownerDecisions).toMatch(/DECISION-OS-016/);
    expect(ownerDecisions.toLowerCase()).toMatch(/no auto-migrate|auto-migrate.*forbid|migrations.*separate/);
  });
});

# Final Skill Compliance Report — TASK-0145

## Task

- **Title:** Staging deploy SSH diagnostics and configurable port
- **Task type:** ci/deploy
- **Risk level:** medium
- **Branch:** `codex/deploy-staging-ssh-diagnostics`
- **PR:** pending

## Mandatory Skill Gate (recap)

- **Skills selected:**
  - `environment-safety-gate` — deploy workflow changes must stay staging-only and avoid production, secrets, and migrations.
  - `evidence-led-reporting` — the failure must be tied to actual GitHub Actions job evidence.
  - `regression-safety-gate` — staging SSH changes must keep existing deploy behavior and avoid production workflow drift.
  - `verification-before-completion` — YAML/diff/skill/preflight checks are required before commit or PR.
  - `github:gh-fix-ci` — the task is a GitHub Actions failure investigation and narrow CI fix.
- **Why these skills:** The task changes `.github/workflows/deploy.yml` after a staging deploy failure. It must diagnose the GitHub-hosted runner SSH path without changing product code, production deployment, secrets, or database state.
- **Files expected to change:** `.github/workflows/deploy.yml`, `tests/deploy-no-ssh-keyscan.test.ts`, `docs/ops/TASK_TRACKER.md`, `docs/ops/CURRENT_STATE.md`, `docs/ops/ISSUE_KNOWLEDGE_BASE.md`, `docs/ops/REGRESSION_CHECKLIST.md`, `docs/ops/CHANGELOG_INTERNAL.md`, `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0145.md`
- **Verification planned:** `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/deploy.yml'); puts 'yaml ok'"`; `pnpm vitest run tests/deploy-no-ssh-keyscan.test.ts`; `pnpm check:skills`; `git diff --check`; `CI=true pnpm preflight`; PR checks after push.

## Execution Evidence

- **Files actually changed:**
  - `.github/workflows/deploy.yml`
  - `tests/deploy-no-ssh-keyscan.test.ts`
  - `docs/ops/CHANGELOG_INTERNAL.md`
  - `docs/ops/CURRENT_STATE.md`
  - `docs/ops/ISSUE_KNOWLEDGE_BASE.md`
  - `docs/ops/REGRESSION_CHECKLIST.md`
  - `docs/ops/TASK_TRACKER.md`
  - `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0145.md`
- **Files added / removed:** Added `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0145.md`; no files removed.
- **Key decisions taken during execution:**
  - Kept the change isolated in a clean worktree at `/Users/thwany/Desktop/haa-stores-core-deploy-ssh-diagnostics` to avoid the dirty main worktree and concurrent-agent changes.
  - Treated the failure as runner-to-staging SSH reachability because PR #353 code/build jobs succeeded and the deploy failed before remote commands ran.
  - Added runner public IPv4 logging and optional `STAGING_SSH_PORT` with legacy `STAGING_PORT` fallback, defaulting to `22`, rather than changing secrets or touching Hostinger/firewall state.
  - Updated the deploy source guard to match port-aware staging `scp` commands and guard the new configurable-port behavior.
  - Left production deploy behavior untouched.
- **Safety constraints respected (per AGENTS.md §14.7):**
  - [x] No `db:migrate` execution
  - [x] No production deploy
  - [x] No SSH to production
  - [x] No secrets printed or `.env` echoed
  - [x] No live payment-provider calls
  - [x] No live shipping-provider calls
  - [x] No direct edit to `main` or force-push
  - [x] No use of forbidden server `187.124.41.239`

## Verification

- **`gh run view 28539710740 --job 84615337444 --log | rg "ssh: connect|SSH warmup|fail2ban|Process completed|Preflight|Setup SSH|known hosts"`:**

  ```text
  ✓ All required staging secrets and variables are present.
  Identity added: (stdin) (github-actions-staging-haastores)
  ⚠ STAGING_KNOWN_HOSTS secret not set — falling back to accept-new on first connect.
  ssh: connect to host *** port 22: Connection timed out
  ⚠ SSH warmup attempt 1/6 failed; sleeping 30s before retry
  ssh: connect to host *** port 22: Connection timed out
  ⚠ SSH warmup attempt 2/6 failed; sleeping 60s before retry
  ssh: connect to host *** port 22: Connection timed out
  ⚠ SSH warmup attempt 3/6 failed; sleeping 120s before retry
  ssh: connect to host *** port 22: Connection timed out
  ⚠ SSH warmup attempt 4/6 failed; sleeping 240s before retry
  ssh: connect to host *** port 22: Connection timed out
  ⚠ SSH warmup attempt 5/6 failed; sleeping 480s before retry
  ssh: connect to host *** port 22: Connection timed out
  ##[error]SSH warmup failed after 6 attempts (~24 min total) — likely persistent fail2ban ban or host down. Manual unban required.
  ##[error]Process completed with exit code 1.
  ```

- **`ruby -e "require 'yaml'; YAML.load_file('.github/workflows/deploy.yml'); puts 'yaml ok'"`:**

  ```text
  yaml ok
  ```

- **`git diff --check`:**

  ```text
  clean
  ```

- **`pnpm vitest run tests/deploy-no-ssh-keyscan.test.ts`:**

  ```text
  Test Files  1 passed (1)
       Tests  12 passed (12)
  ```

- **`pnpm check:skills`:**

  ```text
  All 43 checks passed.
  ```

- **`CI=true pnpm preflight`:**

  ```text
  === Preflight Root Guard ===
    ✅ Root guard skipped (CI environment)
  === Project Structure Checks ===
    ✅ .haa-project-root exists
    ✅ package.json exists
    ✅ pnpm-workspace.yaml exists
    ✅ apps/ directory exists
    ✅ packages/ directory exists
    ✅ AGENTS.md exists
    ✅ docs/ops/ directory exists
  === Environment Checks ===
    ✅ Node.js v26.3.1 (>=20 required)
    ✅ pnpm 10.32.1 (>=9 required)
  ✅ Preflight PASSED — project is healthy
  ```

- **Plain `pnpm preflight`:**

  ```text
  Expected root guard failure in isolated worktree:
  Wrong project root. Expected: /Users/thwany/Desktop/haa-stores-core
  Actual: /Users/thwany/Desktop/haa-stores-core-deploy-ssh-diagnostics
  ```

## Deviations

- **Deviations from selected skills:** none.
- **Reason:** not applicable.
- **Follow-up:** PR checks should run after push; merge requires explicit owner approval because merging to `main` triggers staging deploy.

## Completion

- **Did the task follow the selected skills end-to-end?** yes
- **Is further owner approval required before merge/deploy?** yes
- **Owner approvals received (cite source):** owner approved executing the fix; no owner approval received to merge this new PR.
- **Safety confirmations (re-affirmed at done):**
  - [x] No `db:migrate` was run during this task
  - [x] No production action was performed
  - [x] No secrets were printed
  - [x] No live payment / shipping calls were made

## Next step

Open a PR to `main`, watch CI, and merge only after explicit owner approval. After merge, the next staging deploy should reveal the GitHub runner public IPv4 and respect `STAGING_SSH_PORT` (preferred) or `STAGING_PORT`; the owner can then allowlist that runner path or configure an alternate staging SSH port.

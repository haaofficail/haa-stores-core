# Final Skill Compliance Report — TASK-0146

## Task

- **Title:** Staging deploy self-hosted runner cutover
- **Task type:** ci/deploy
- **Risk level:** high
- **Branch:** `codex/staging-self-hosted-runner`
- **PR:** Pending

## Mandatory Skill Gate (recap)

- **Skills selected:**
  - `environment-safety-gate` — staging deploy changes must not touch production, migrations, secrets, or app runtime behavior.
  - `evidence-led-reporting` — runner reachability and smoke results must be reported with run/job evidence.
  - `verification-before-completion` — workflow syntax, focused deploy tests, diff checks, and remote run state must be verified before done.
  - `haa-stores-ci-release-checks` — repo-specific CI/deploy status boundaries are required for Haa Stores.
  - `github:gh-fix-ci` — GitHub Actions deploy behavior and logs are the primary diagnostic surface.
- **Why these skills:** The task changes `.github/workflows/deploy.yml` after repeated staging deploy failures caused by GitHub-hosted runner SSH reachability. It must keep the change isolated to staging deploy mechanics and avoid application code, migrations, production action, and secret exposure.
- **Files expected to change:** `.github/workflows/deploy.yml`, focused deploy workflow tests, ops docs.
- **Verification planned:** `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/deploy.yml'); puts 'yaml ok'"`; focused deploy workflow tests; `pnpm check:skills`; `git diff --check`; `pnpm preflight`; GitHub run monitoring; staging smoke URLs.

## Execution Evidence

- **Files actually changed:**
  - `.github/workflows/deploy.yml`
  - `tests/deploy-no-ssh-keyscan.test.ts`
  - `tests/deploy-hardening.test.ts`
  - `docs/ops/TASK_TRACKER.md`
  - `docs/ops/CURRENT_STATE.md`
  - `docs/ops/ISSUE_KNOWLEDGE_BASE.md`
  - `docs/ops/REGRESSION_CHECKLIST.md`
  - `docs/ops/CHANGELOG_INTERNAL.md`
  - `docs/ops/SKILL_COMPLIANCE_REPORT_TASK_0146.md`
- **Files added / removed:** Added this compliance report. No files removed.
- **Key decisions taken during execution:**
  - `deploy-staging` now uses `[self-hosted, linux, x64, haa-staging]`.
  - Staging deploy now runs GHCR login, config sync, compose deploy, diagnostics, and rollback locally on the staging runner.
  - Staging no longer references `STAGING_SSH_KEY`, `STAGING_HOST`, `STAGING_USER`, `STAGING_SSH_PORT`, `ssh`, or `scp`.
  - Production deploy SSH behavior was not changed.
  - GitHub currently has no registered self-hosted runners for this repo, so merge/live deploy must wait until the VPS runner is online.
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

- `ruby -e "require 'yaml'; YAML.load_file('.github/workflows/deploy.yml'); puts 'yaml ok'"`

  ```text
  yaml ok
  ```

- `pnpm vitest run tests/deploy-no-ssh-keyscan.test.ts tests/deploy-hardening.test.ts tests/deploy-port-contract.test.ts`

  ```text
  Test Files  3 passed (3)
       Tests  47 passed (47)
  ```

- GitHub runner inventory:

  ```text
  {"runners":[],"total_count":0}
  ```

- Server access probe:

  ```text
  deploy@72.61.108.208: Permission denied (publickey,password).
  ```

- `git diff --check`:

  ```text
  clean
  ```

- `pnpm check:skills`:

  ```text
  All 43 checks passed.
  ```

- `CI=true pnpm preflight`:

  ```text
  Root guard skipped (CI environment)
  Preflight PASSED — project is healthy
  ```

- Plain `pnpm preflight` from this isolated worktree:

  ```text
  Wrong project root. Expected: /Users/thwany/Desktop/haa-stores-core
  Actual: /Users/thwany/Desktop/haa-stores-core-staging-runner
  ```

  This is expected for an isolated worktree because the repo root guard is hard-coded to the canonical workspace path.

- Staging smoke after merge: blocked until the `haa-staging` self-hosted runner is registered and online.

## Deviations

- **Deviations from selected skills:** The live self-hosted runner could not be installed from this session.
- **Reason:** GitHub reports zero repository self-hosted runners, and the session does not have SSH access to `deploy@72.61.108.208`.
- **Follow-up:** Register a self-hosted runner on VPS `72.61.108.208` with labels `self-hosted`, `linux`, `x64`, `haa-staging`, then merge/run the workflow and verify staging smoke.

## Completion

- **Did the task follow the selected skills end-to-end?** yes for the workflow cutover; live runner installation is externally blocked.
- **Is further owner approval required before merge/deploy?** yes, because merge to `main` triggers staging deploy and the runner is not yet registered.
- **Owner approvals received:** Owner approved converting staging deploy to self-hosted runner and forbade production deploy, migrations, production config, secrets, and application-code changes.
- **Safety confirmations (re-affirmed at done):**
  - [x] No `db:migrate` was run during this task
  - [x] No production action was performed
  - [x] No secrets were printed
  - [x] No live payment / shipping calls were made

## Next step

Register the VPS runner with labels `self-hosted`, `linux`, `x64`, `haa-staging`, then merge this workflow cutover and verify `Deploy to Staging` plus the five smoke URLs.

# CI / Actions Troubleshooting

Comprehensive guide to every observed Actions failure class + the root-cause
fix that ships in PRs #183 and this PR. If a new failure mode shows up,
diagnose it here BEFORE re-running anything.

---

## Decision tree — first check the conclusion

| Conclusion                | Meaning                                                                                                                                                      | Action                                                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `success` ✅              | Everything green.                                                                                                                                            | Nothing.                                                                                                                                |
| `cancelled` ⚠️            | A newer push arrived on the same branch; the older run was cancelled by `concurrency.cancel-in-progress: true`. **This is correct behavior**, not a failure. | Nothing — the newer run is what matters.                                                                                                |
| `skipped`                 | Paths-ignore matched (docs-only change).                                                                                                                     | Nothing — Deploy/CI was intentionally skipped to save runner minutes.                                                                   |
| `failure` 🔴              | Real failure.                                                                                                                                                | Continue to the class table below.                                                                                                      |
| `in_progress` / `pending` | Still running.                                                                                                                                               | Wait. If multiple deploys are queued, `concurrency.cancel-in-progress: false` on Deploy is preserving them — the queue drains in order. |

---

## Failure classes (all root-cause fixed)

### 1. `ssh-fail2ban` — Deploy SSH warmup failed

**Symptom:** Deploy job step `Warm up SSH` exits 1 with `Connection timed out` or `SSH warmup failed after N attempts`.

**Root cause:** Staging server runs `fail2ban` with default sshd jail = 15-min ban for repeated SSH attempts from one IP. Old warmup had 3 retries × 30/60/90 s = ~3 min, under the ban window.

**Fix (PR #183):**

- Warmup now retries **6 times** with backoff `30/60/120/240/480/480` s = **~24 min total budget**. Covers the 15-min ban + 9-min safety margin.
- `ConnectTimeout=20` per attempt (was 30) prevents hung TCPs from burning the job quota.
- Applied to BOTH staging and production warmup blocks.

**Auto-recovery (PR #183):** The `deploy-watchdog.yml` workflow detects `ssh-fail2ban` failures, sleeps 18 min past the ban window, then `gh run rerun --failed` ONCE. If the rerun also fails, opens a `deploy-failure` GitHub Issue.

**Operator action:** Watch for the watchdog to act. Manual intervention only if the issue is opened. See `DEPLOY_FAILURE_PLAYBOOK.md` for unban commands.

---

### 2. `code-failure` — Lint / typecheck / unit test failed

**Symptom:** CI fails with `ESLint found too many warnings`, `TypeError`, `FAIL tests/`, etc.

**Root cause:** A code bug landed.

**Fix:** **Always fix on a new PR. Never re-run a broken commit.** main is broken until the fix PR lands.

**Common sub-classes:**

- **`Unhandled Rejection: EnvironmentTeardownError: Closing rpc while onUserConsoleLog was pending`** in `tests/live-presence.test.ts`. Root cause: `worker.ts` `startScheduler()` fired `console.log` after vitest closed the worker. Fixed in PR #183 — scheduler now early-returns when `NODE_ENV === 'test'`.

- **Pre-existing tests assertion drift** when changing a workflow / config file. Example: PR #183 changed `deploy.yml` warmup; `tests/merchant-dashboard-full-sweep.test.ts:33` still pinned the OLD `for attempt in 1 2 3; do` regex. Fixed in PR #187. **Prevention rule:** before changing a workflow / config file, `grep -rn "<file-name>" tests/` to find pre-existing assertions on that file.

- **Prettier YAML quote reformatting.** Prettier reformats YAML scalars to double quotes during pre-commit. If your test uses `/workflows:\s*\['Deploy'\]/` (single quotes), it will break after the formatter runs. **Prevention rule:** always use `["']` character class in regexes that target YAML strings.

---

### 3. `unknown` — Anything else

**Symptom:** A failure that doesn't match the classifier patterns in `deploy-watchdog.yml`.

**Action:**

1. `gh run view <run-id> --log-failed | less` — read the logs.
2. Identify the failing step + line.
3. If it's a new failure class, add it to:
   - The classifier in `.github/workflows/deploy-watchdog.yml` (`grep -qE` line).
   - This troubleshooting doc.

---

## Noise reduction (PRs you might think are failures but aren't)

### `cancelled` on rapid PR merges

When 3 PRs merge in quick succession, the CI on the first commit gets `cancelled` by the second commit's CI, which gets `cancelled` by the third commit's. This is `cancel-in-progress: true` doing its job. Only the LATEST run matters. **Do not retry cancelled runs.**

### `skipped` on docs-only PRs

This PR adds `paths-ignore` to both `deploy.yml` and `ci.yml`. Docs-only changes (`**/*.md`, `docs/**`, `AGENTS.md`, `CLAUDE.md`, etc.) no longer trigger CI or Deploy. **This is intentional** — saves ~5 min of runner time per docs PR.

To FORCE a deploy after a docs-only merge (rare):

```bash
gh workflow run "Deploy" --ref main
```

---

## Commit message rejections

The repo enforces Conventional Commits via `commitlint.config.js`:

```
type(scope): subject

# rules:
# - type: one of [feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert]
# - subject: lowercase, no period, ≤ 72 chars
# - no em-dashes inside the subject (use plain `-`)
```

**Rejection patterns I've hit:**

1. `arch(theme): ...` → `arch` is NOT in the type-enum. Use `refactor` for architectural cleanup, or `chore` for non-functional changes.
2. `feat(legal): Phase 2 done` → `Phase` is capitalized → `subject-case` violation. Lowercase the subject: `feat(legal): wire platform cr into email`.
3. `feat(orders): xyz — and more` → em-dash sometimes survives commitlint, sometimes doesn't. Use plain `-` for the subject; reserve em-dashes for the body.

---

## Pre-push verification rule (mandatory)

**Before pushing any PR that touches a workflow / config / yaml file**:

```bash
pnpm test
```

NOT `pnpm vitest run tests/<one-file>.test.ts`. The full suite catches:

- pre-existing tests that pin the OLD content of the file you just changed
- prettier-induced regex mismatches (the YAML quote-style trap)
- cross-file contract guards in `tests/<feature>-contract.test.ts` lock files
- the snapshot integrity test if a migration changed

If `pnpm test` reports a local failure due to env vars (e.g.
`production-guardrails.test.ts` needs `DATABASE_URL`), confirm the SAME
test passes in CI before declaring it noise — the CI image has the
required env vars set. Otherwise it's a real regression.

This rule emerged from PR #190 (paths-ignore for docs) — I shipped
single-quote regex on YAML strings, prettier double-quoted the YAML,
six PRs in a row broke CI before the hotfix landed.

---

## Related files

- `.github/workflows/deploy.yml` — Deploy + hardened SSH warmup.
- `.github/workflows/deploy-watchdog.yml` — Auto-recovery (PR #183).
- `.github/workflows/ci.yml` — CI + docs paths-ignore (this PR).
- `docs/ops/DEPLOY_FAILURE_PLAYBOOK.md` — manual-recovery playbook.
- `tests/deploy-hardening.test.ts` — source-grep guards on all of the above.
- `commitlint.config.js` — commit message rules.

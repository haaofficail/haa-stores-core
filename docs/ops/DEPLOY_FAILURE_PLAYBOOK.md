# Deploy Failure Playbook

Canonical response sequence when a Deploy run on `main` fails. Read this
before manually re-running anything.

## Failure classes

| Class          | Signature in logs                                         | Auto-handled by watchdog?       | Operator action                                            |
| -------------- | --------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------- |
| `ssh-fail2ban` | `SSH warmup failed` / `Connection timed out` / `fail2ban` | ✅ Yes (one retry after 18 min) | Verify auto-retry success; if it also fails → manual unban |
| `code-failure` | `ESLint`, `TypeError`, `FAIL tests/`                      | ❌ No                           | Fix the code on a new PR; don't retry                      |
| `unknown`      | Everything else                                           | ❌ No                           | Read logs, classify, then act                              |

## Root cause: SSH `ssh-fail2ban`

**Why it happens.** The staging server runs `fail2ban` with the default
`sshd` jail. Repeated SSH-keyscan probes or rapid reconnects from GitHub
runner IPs get banned for **15 min**. The old deploy workflow's warmup
loop maxed out at ~3 min before failing → every deploy that landed inside
the ban window failed.

**Fix shipped in PR #183.** The warmup now retries 6× with backoffs
`30 / 60 / 120 / 240 / 480 / 480` s = **~24 min total**, fully covering
the default 15-min ban + a 9-min safety margin.

**Second line of defense: the watchdog.** `deploy-watchdog.yml` reacts
to a failed Deploy by:

1. Reading the failed logs.
2. Classifying the failure (`ssh-fail2ban` / `code-failure` / `unknown`).
3. For `ssh-fail2ban`: sleeping 18 min (past the ban window), then
   `gh run rerun --failed` exactly once.
4. If the rerun also fails, OR if the class is not `ssh-fail2ban`:
   opens a GitHub Issue with label `deploy-failure`.
5. When the next Deploy succeeds on main, all open `deploy-failure`
   issues are auto-closed.

## Operator steps when watchdog gives up

The watchdog auto-retries only **once**. If you see an open
`deploy-failure` issue:

1. **Read the issue body.** It carries the run URL + commit SHA +
   failure class.
2. **If `ssh-fail2ban`** AND the warmup still failed after the 18-min
   wait → the ban is persistent. Manually unban from the staging host:
   ```bash
   ssh deploy@72.61.108.208 'sudo fail2ban-client unban <runner-ip>'
   # Or, if you don't know the runner IP:
   ssh deploy@72.61.108.208 'sudo fail2ban-client status sshd'
   ssh deploy@72.61.108.208 'sudo fail2ban-client set sshd unbanip <ip-shown-above>'
   ```
   Then trigger a fresh deploy:
   ```bash
   gh workflow run "Deploy" --ref main
   ```
3. **If `code-failure`** → fix the underlying code on a new PR. **Do NOT
   re-run the broken commit** — main is broken until the next PR lands.
4. **If `unknown`** → read the logs:
   ```bash
   gh run view <run-id> --log-failed | less
   ```

## Permanent hardening already in place

- **`deploy.yml`** uses a **pre-baked** `STAGING_KNOWN_HOSTS` secret to
  eliminate the `ssh-keyscan` probe entirely. If the secret is missing,
  the fallback is `StrictHostKeyChecking accept-new` (one connection,
  no probe). Either way, we never run `ssh-keyscan` against the host.
- **`deploy.yml` `concurrency: cancel-in-progress: false`** prevents a
  later commit from cancelling a running deploy. A queued deploy waits
  for the in-flight one to finish.
- **`Warm up SSH`** step retries 6× with exponential backoff
  (~24 min budget — see PR #183).
- **`deploy-watchdog.yml`** monitors completed Deploy runs and triggers
  recovery automatically.
- **GitHub Issue** with label `deploy-failure` is the canonical signal
  that operator attention is required.

## Anti-patterns

- ❌ Do NOT rapid-fire `gh run rerun` on a failing deploy — every rerun
  attempts more SSH connections, which can extend the ban.
- ❌ Do NOT `ssh-keyscan` the staging host from a local terminal during
  a deploy — same IP-pool issue can leak to the runner if you share a
  Cloudflare WARP / VPN.
- ❌ Do NOT lower the SSH warmup retry count "to fail fast" — that was
  the original bug.
- ❌ Do NOT change `cancel-in-progress` for Deploy to `true` — that would
  cause active deploys to die mid-`docker pull`, leaving the container
  half-updated.

## Related files

- `.github/workflows/deploy.yml` — the deploy itself.
- `.github/workflows/deploy-watchdog.yml` — auto-recovery (PR #183).
- `docs/HAA_TASK_LEDGER.md` — Master Checklist row §M (Security/Ops).
- Memory `staging-deploy-fail2ban` — terse operator note.

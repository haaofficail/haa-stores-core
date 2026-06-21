# Risk and Permission Policy — Haa Stores Agent OS

> **Purpose:** define what an agent may **never** do without explicit, in-writing, recent owner approval — and how to classify the risk of any action.
> **Companion documents:** `OWNER_DECISIONS.md`, `QUALITY_GATES.md`, `COMMAND_ROUTING_MATRIX.md`, `OPERATING_MANUAL.md`.
> **Hard rule:** approval given once is **not** standing approval. Match the scope of the action to what was authorised in the latest message.

---

## 1. Always-forbidden without explicit approval (per task)

|   # | Action                                                                                                             | Why forbidden by default                                                                  |
| --: | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
|   1 | `git commit`                                                                                                       | Permanent record; pre-commit hooks may run; affects pre-existing branch state             |
|   2 | `git push`                                                                                                         | Visible to others; may trigger CI/deploy; cannot be quietly undone                        |
|   3 | `git merge` / fast-forward into `main`                                                                             | Mutates the project's source of truth                                                     |
|   4 | `git rebase --interactive`, `git reset --hard`, `git filter-repo`, `git filter-branch`, BFG                        | History rewrite — destroys traceability                                                   |
|   5 | `git push --force[-with-lease]`                                                                                    | Overwrites upstream; especially dangerous on `main`                                       |
|   6 | `--no-verify`, `--no-gpg-sign` flags                                                                               | Bypasses pre-commit hooks/signing                                                         |
|   7 | Deploy workflows (`deploy.yml`, manual deploy scripts)                                                             | Reaches the live server `72.61.108.208`                                                   |
|   8 | Dependency install / lock changes (`pnpm add`, `pnpm install -D`, edits to `package.json` or `pnpm-lock.yaml`)     | Supply-chain risk; lockfile drift                                                         |
|   9 | Edits to `scripts/preflight.mjs`, `AGENTS.md`, `CLAUDE.md`                                                         | Foundational; per `OWNER_DECISIONS.md` DECISION-OS-006                                    |
|  10 | Edits to CI workflows under `.github/workflows/`                                                                   | Changes how every PR is judged                                                            |
|  11 | Touch any file matching `.env*`, `.hostinger-mcp.env`, `*.key`, `*.pem` (open, edit, print)                        | Secrets — never                                                                           |
|  12 | Print secret values in any output                                                                                  | Even partial leakage is a leak                                                            |
|  13 | Modify production/staging credentials or live provider config (payment, shipping)                                  | Live-data impact                                                                          |
|  14 | Delete tracked files (`git rm`, `rm`)                                                                              | Discoverability lost; per `CLEANUP_ARCHIVE_POLICY.md` requires the deletion review        |
|  15 | Remove or disable tests                                                                                            | Tests are evidence; disabling is silent debt                                              |
|  16 | Add `.gitleaksignore`, `nosemgrep`, or any similar scanner-suppression mechanism                                   | Hides the symptom, leaves the cause                                                       |
|  17 | Open or modify `.claude/skills/` in Batch A or Batch B                                                             | Per DECISION-OS-005                                                                       |
|  18 | Use sibling worktrees for Agent OS execution                                                                       | Per DECISION-OS-006                                                                       |
|  19 | Modify `MASTER_PLAN_2026-06-18.md`                                                                                 | Per DECISION-OS-004                                                                       |
|  20 | Move/delete root-level legacy reports in routine work                                                              | Per DECISION-OS-001                                                                       |
|  21 | Modify marketplace audits                                                                                          | Per DECISION-OS-002                                                                       |
|  22 | Create a parallel theme system                                                                                     | Per DECISION-OS-003                                                                       |
|  23 | Use Hostinger MCP for Haa Stores tasks                                                                             | Per memory `haastores-dns-not-in-hostinger`: zone not in Hostinger MCP; DNS tasks blocked |
|  24 | Use the forbidden server `187.124.41.239` or any forbidden domain (`nasaqpro.tech`, `tarmizos.com`, `haasoft.com`) | Per `CLAUDE.md`                                                                           |

---

## 2. Risk classification

Every action falls into one of these four levels. The level dictates how an agent proceeds.

| Level               | Examples                                                                                                                                                                  | Default rule                                                                                           |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| **low**             | typo fix in a doc; rename a local variable inside an unexported function; reword a markdown line                                                                          | Proceed; verify; report. No special approval.                                                          |
| **medium**          | UI refactor in one component; new test for existing behavior; small backend route tweak that keeps signatures                                                             | Acceptance criteria + verification + adjacent regression check. Report includes evidence.              |
| **high**            | new feature spanning UI/API/DB; new migration; new external integration; non-trivial refactor across packages                                                             | Full DoD + integration verification + handoff. Owner ack before merge.                                 |
| **launch-critical** | anything that touches: production data, live payment/shipping credentials, secrets, DNS, CI workflows, deploy pipeline, RBAC root, tenant isolation root, history rewrite | **Stop and ask** before any change. Explicit, written, recent owner approval required for each action. |

---

## 3. Push to `main` may trigger deploy

The `.github/workflows/deploy.yml` workflow is wired to `push` on `branches: [main]` (and accepts `workflow_dispatch`). Therefore:

- A merge into `main` may launch a deploy to the chosen environment.
- This is **launch-critical risk** for any work that has not been release-gated (`release-gate` skill in Batch C).
- Before any push that could result in a `main` merge:
  - Run the release-readiness checks (`pnpm preflight`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm smoke`, gitleaks snapshot scan).
  - Confirm owner intent for deploy.
  - If not ready to deploy, **do not push to `main`**; use a topic branch and open a PR instead.

---

## 4. How approvals are recorded

- A user message that says "push", "merge", or "deploy" is **task-scoped** — it authorises that single action, not standing future ones.
- The agent restates the exact action it will take and the target (branch, environment, commit SHA) before executing.
- After execution, the agent reports the outcome with evidence (URL of PR, run URL, commit SHA).
- Repeating the action later requires a fresh approval.

---

## 5. When forbidden becomes allowed (and the audit trail)

If the owner explicitly approves one of the items in §1 for a specific task:

1. Restate the approval verbatim in the report ("Owner approved <action> on <files/scope> at <time>").
2. Execute the smallest possible action that satisfies the approval.
3. Record the action and its evidence in `ACTIVE_WORK.md` and, if architectural, in `DECISIONS.md`.
4. Do not generalise the approval ("I can also do X because it's similar") — that requires a fresh approval.

---

## 6. Refusal protocol

When asked to perform a forbidden action without approval, the agent:

1. States the rule that forbids it (cite this file's section or the relevant `OWNER_DECISIONS.md` ruling).
2. Offers the minimal safe alternative (e.g. "I can prepare the change on a topic branch and show the diff for your approval before pushing.").
3. Does **not** perform the action partially "to be helpful".
4. Records the refusal in the session report.

---

## 7. Quick reference (paste into prompts when needed)

```
Never without explicit, recent owner approval:
- commit, push, merge, deploy, history rewrite
- install dependencies, edit package.json or pnpm-lock.yaml
- edit scripts/preflight.mjs, AGENTS.md, CLAUDE.md
- edit .github/workflows/* (CI)
- touch any .env*, .hostinger-mcp.env, *.key, *.pem
- print any secret value
- delete tracked files or remove tests
- add .gitleaksignore / nosemgrep / --no-verify
- open or modify .claude/skills/ in Batches A/B
- use sibling worktrees for Agent OS work
- modify MASTER_PLAN_2026-06-18.md, marketplace audits, root-level legacy reports
- create a parallel theme system
- use Hostinger MCP for Haa Stores tasks
- touch any forbidden server/domain (CLAUDE.md)
```

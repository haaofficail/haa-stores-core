# Cleanup & Archive Policy — Haa Stores Agent OS

> **Purpose:** decide what happens to old files, duplicate systems, and legacy reports — without breaking history or losing knowledge.
> **Companion documents:** `OWNER_DECISIONS.md` (binding rulings), `ISSUE_REGISTER.md` (open items with classifications), `RISK_AND_PERMISSION_POLICY.md` (deletion requires explicit approval).

---

## 1. Four distinct verbs

| Verb          | Meaning                                                                                                                   | Reversible?                                          | Default owner approval?                                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- |
| **cleanup**   | small in-file improvements (unused imports, dead code branches, typo, dead comment)                                       | yes (via git revert)                                 | optional for one-line; required for ≥10 lines or multi-file |
| **archive**   | keep the file but mark it as historical and move it to a clearly archival location (`docs/archive/…`)                     | yes                                                  | required (low risk)                                         |
| **deprecate** | keep the file in place, but add a `@deprecated` notice and a pointer to its successor; deprecated code remains importable | yes                                                  | required (medium risk — affects consumers)                  |
| **delete**    | remove the file from the working tree (history remains in Git)                                                            | partially (via `git revert` or `git checkout <sha>`) | required (high risk — discoverability lost)                 |

Never use one verb when another fits better. "I cleaned up the duplicate file by deleting it" is **not** cleanup; it's deletion and needs the deletion review.

---

## 2. Seven classifications (use in `ISSUE_REGISTER.md` "Recommended action" column)

| Tag                           | Meaning                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------ |
| **KEEP**                      | The file/code is current and authoritative. No action.                                     |
| **FIX**                       | The file/code is broken or stale; fix in place.                                            |
| **MERGE**                     | Two artefacts duplicate truth; combine into one canonical, redirect the other.             |
| **ARCHIVE**                   | Historical value; move to an archive location with a date prefix.                          |
| **DEPRECATE**                 | Still imported by some consumers; mark deprecated, plan a migration window, do not remove. |
| **DELETE_AFTER_VERIFICATION** | Safe to delete only after the verification listed in the issue.                            |
| **OWNER_DECISION_NEEDED**     | Engineering cannot decide; owner must rule.                                                |

Every issue in `ISSUE_REGISTER.md` carries one of these. None is "TBD".

---

## 3. Binding overlays from `OWNER_DECISIONS.md`

These rulings override generic policy until superseded:

### 3.1 Root-level legacy reports — `ARCHIVE_CANDIDATE`

- All 11 markdown reports at the repo root (per `ISSUE_REGISTER.md` ISSUE-0004) are classified `ARCHIVE_CANDIDATE` per [DECISION-OS-001](./OWNER_DECISIONS.md).
- **No agent moves or deletes** these files in Batches A, B, C, or in any general task.
- Cleanup happens in a **dedicated** PR (suggested branch `docs/archive-cleanup`) — and that PR does only that.
- Until cleanup, citations include the prefix `(historical, ARCHIVE_CANDIDATE per DECISION-OS-001)`.

### 3.2 Marketplace audits — `STALE` / `PARTIALLY_SUPERSEDED`

- `MARKETPLACE_AUDIT_REPORT.md` (root) and `docs/ops/PUBLIC_MARKETPLACE_AUDIT.md` are both classified `STALE` per [DECISION-OS-002](./OWNER_DECISIONS.md).
- Neither is authoritative as current state.
- Marketplace remediation is **out of Agent OS scope**. A future marketplace audit opens as a separate task.

### 3.3 MASTER_PLAN — `STALE` (not source of truth)

- `docs/ops/MASTER_PLAN_2026-06-18.md` references a stale branch context.
- Per [DECISION-OS-004](./OWNER_DECISIONS.md): keep in place; do not cite as current state; refresh deferred to a future docs truth-sync task.

### 3.4 `.claude/skills/` from prior session

- Untracked legacy input per [DECISION-OS-005](./OWNER_DECISIONS.md).
- Batch A and Batch B: read-only and out of scope.
- Batch C: evaluate each file as `KEEP / MERGE / REWRITE / DISCARD`.

### 3.5 Theme packages

- `@haa/theme-system` is `DEPRECATE`d per [DECISION-OS-003](./OWNER_DECISIONS.md).
- No removal of theme packages in routine work.
- Full reclassification of the 6 theme packages awaits an independent theme rationalization task.

### 3.6 Worktrees

- The parked `../haa-stores-agent-os` worktree per [DECISION-OS-006](./OWNER_DECISIONS.md) is **kept**, not deleted.
- `git worktree prune` may run only for entries marked `prunable` by Git itself, and only with owner approval as a small dedicated task.

---

## 4. Workflow for each verb

### 4.1 cleanup (in-file)

1. Confirm `KEEP` or `FIX` classification.
2. Make the change in the smallest possible diff.
3. Run the area's tests.
4. Commit on a topic branch named `chore/<area>-cleanup` or under the existing task branch when scope allows.

### 4.2 archive

1. Owner approval required.
2. Create `docs/archive/<YYYY-MM-DD>-<original-name>/` or similar location agreed in advance.
3. Move the file (`git mv`), preserving history.
4. Add a one-line redirect at the original location only if other docs still link to it.
5. Update any inbound links.

### 4.3 deprecate

1. Owner approval required.
2. Add `@deprecated` JSDoc/comment with a pointer to the successor.
3. Add a line to the affected package's `README.md` (or `docs/agent-os/PROJECT_MEMORY.md` for cross-cutting decisions).
4. Open or update a tracking issue with the **migration window** (date + scope).
5. Do not remove until the migration window closes.

### 4.4 delete (high bar)

1. Owner approval required, in writing, for the exact paths.
2. Confirm the file is not imported anywhere (`grep -r <basename>`).
3. Confirm no doc references it (`grep -r '<path>'` in `docs/`).
4. Confirm the work it represents is preserved (in Git history at minimum).
5. `git rm <path>` (not `rm`) so the deletion is staged correctly.
6. Commit message states **why** the deletion is safe, with evidence.

---

## 5. What is **never** cleanup

- Removing a "stub" or `@deprecated` symbol that still has importers is **deprecation**, not cleanup.
- Resolving a duplicate by deleting one file is **delete** (with all its approvals), not cleanup.
- Moving a file across directories is **archive** or **refactor**, not cleanup.
- Disabling a failing test is **never** acceptable; the test stays and the bug is fixed or filed.

---

## 6. Anti-patterns

- "While I was there, I also…" — out of scope; route to `ISSUE_REGISTER.md`.
- "I deleted the duplicate to avoid confusion." — without owner approval, undo it.
- "I added `.gitleaksignore` to silence the finding." — never. See `OWNER_DECISIONS.md` defaults and security skill (Batch C).
- "I moved the report to `docs/`." — owner approval required; for ROOT_REPORTS, defer per DECISION-OS-001.

---

## 7. Audit trail

Every archive / deprecate / delete operation is recorded in:

- `docs/ops/DECISIONS.md` (architectural record) **and**
- the PR description (operational record).

`docs/agent-os/DECISIONS.md` records the _meta_-decision (the policy change) when the policy itself changes.

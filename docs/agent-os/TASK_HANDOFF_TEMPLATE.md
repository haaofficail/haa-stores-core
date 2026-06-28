# Task Handoff Template

> **Use:** copy this template into the user-facing handoff message (or a temporary file shared with the next agent). Fill every field. Empty fields mean "I didn't check" — that confuses the receiver.
> **Companion documents:** `ACTIVE_WORK.md` (current state), `OPERATING_MANUAL.md` (the sequence), `PROVIDER_HANDOFF.md` (cross-provider transition: Claude → MiniMax, etc.).

---

## Handoff fields

```
ACTIVE_WORK packet updated?:
Repo path used:
Path guard status:

Current agent:
Next agent:
Date/time of handoff (Asia/Riyadh):

Current task:
Original user brief (short, verbatim if possible):
Smart Execution Brief (link or pasted):

Current branch:
Last commit on this branch (sha + subject):
HEAD vs origin/<base-branch> (ahead/behind):
Does branch/status match ACTIVE_WORK packet?:

Git status summary (output of `git status --short`):
Changed files (staged + unstaged, by path):
Untracked files (relevant only — exclude noise):

What was completed (with evidence — file:line, command output, link):
What remains incomplete (with the smallest next step):
Decisions made during the session (link to DECISIONS.md / OWNER_DECISIONS.md if any):

Commands run (only those with side effects or whose output the next agent needs):
Tests run (which suites; pass/fail; how many; how long):
Failures observed (which, pre-existing vs new, link to log if saved):

Risks (current session — what could trip up the next agent):
Out-of-scope items discovered (must be added to ISSUE_REGISTER.md, not fixed inline):

Parking method:
  - PAUSED_CLEAN (no changes; safe to start anywhere)
  - PAUSED_DIRTY (uncommitted local changes; describe them)
  - BLOCKED (waiting on owner / external — say what)
  - PARKED_PATCH (changes saved as a patch file; cite path)
  - PARKED_BRANCH (changes on a branch; cite branch name)
  - READY_TO_RESUME (next agent can pick up immediately)
  - ABANDON_CANDIDATE (recommend dropping; explain why)

Resume prompt for next agent (paste-ready, in the user's preferred language):

First safe command for the next agent (single line; non-destructive):
```

---

## Quality bar

- **Verbatim is better than paraphrase** for the original user brief.
- **Evidence is non-negotiable.** Every "completed" claim has a file:line, a command output, or a link.
- **Pre-existing failures stay flagged.** Do not silently inherit them.
- **No secrets.** Redact tokens; reference filenames, not values.
- **One handoff per task.** Do not bundle multiple tasks.
- **Always update `ACTIVE_WORK.md` first.** The handoff must match the current packet, not the other way around.

---

## Example (minimal)

```
ACTIVE_WORK packet updated?: yes
Repo path used: /Users/thwany/Desktop/haa-stores-core
Path guard status: pass

Current agent:        Claude Code (session 2026-06-21 evening)
Next agent:           MiniMax
Date/time of handoff: 2026-06-21 22:40 Asia/Riyadh

Current task:         Agent OS bootstrap — Batch B in progress
Original user brief:  "نفّذ Batch B فقط: Haa Stores Agent OS — Batch B: Core Agent OS Documentation"
Smart Execution Brief: see latest user message; scope = 12 docs under docs/agent-os/

Current branch:       chore/agent-os-skills-v2
Last commit on this branch: c90761be chore(security): clean current gitleaks snapshot findings (#36)
                            (no commits made in Batch B per constraint)
HEAD vs origin/main:  0 ahead / 0 behind (this branch); local main 2 behind origin/main (PRs #32, #35)
Does branch/status match ACTIVE_WORK packet?: yes

Git status summary:
  ?? .claude/skills/
  ?? docs/agent-os/

Changed files:        none staged; new files only inside docs/agent-os/
Untracked files:      docs/agent-os/* (12 new files this batch);
                      .claude/skills/ (5 legacy SKILL.md, DECISION-OS-005, NOT TOUCHED)

What was completed:
  - 12 Batch-B docs written under docs/agent-os/ (see ACTIVE_WORK.md Changed files)
What remains incomplete:
  - Batch C (28 Skills) — owner-driven; not started
Decisions made:
  - none new; mirrors OWNER_DECISIONS.md DECISION-OS-001 … OS-006

Commands run:
  - find docs/agent-os -maxdepth 2 -type f | sort
  - git diff --check  (clean)
  - git status --short
Tests run:            none (constraint)
Failures observed:    none

Risks:
  - Pre-commit hook (max-warnings 0) will refuse to commit if any staged file triggers a warning.
  - DECISION-OS-006 still in force — do not run pnpm preflight from a sibling worktree.

Out-of-scope items discovered: none new beyond ISSUE_REGISTER.

Parking method:       READY_TO_RESUME

Resume prompt for next agent:
  "تابع Batch C: قراءة وتقييم .claude/skills/ القديمة وفق DECISION-OS-005، ثم توليد 28 skill جديدة."

First safe command:   cd /Users/thwany/Desktop/haa-stores-core && git branch --show-current
```

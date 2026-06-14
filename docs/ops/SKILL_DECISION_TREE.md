# Skill Decision Tree

> **Purpose:** Quickly determine which skill(s) to load for a given task.
> **Use with:** `docs/ops/SKILL_USAGE_RULE.md` (the 4-step gate)

---

## Start Here: What Kind of Task Is This?

```
Q1: Is this a creative / design / requirements task?
├── YES → brainstorming-2
└── NO ↓

Q2: Is this a complex multi-step task (>3 steps)?
├── YES → plan-mode
└── NO ↓

Q3: Does this task touch more than 1 file or has high error cost?
├── YES → mavis-team (consider parallel agents)
└── NO ↓

Q4: Are you about to modify code or tests?
├── YES → test-driven-development
└── NO ↓

Q5: Are you debugging an unexpected behavior?
├── YES → systematic-debugging
└── NO ↓

Q6: Are you about to claim work is "done"?
├── YES → verification-before-completion
└── NO ↓

Q7: Are you about to commit or push?
├── YES → requesting-code-review
└── NO ↓
```

---

## Detailed Triggers

### `plan-mode`
**Load when:**
- Starting a new feature or major refactor
- Multi-step task (3+ steps)
- Task has multiple valid approaches
- User explicitly says "plan", "discuss", "how to approach"

**Skip when:**
- Single-line fix
- Read-only investigation
- Pure conversation

---

### `systematic-debugging`
**Load when:**
- Investigating a bug
- Test is failing unexpectedly
- Error appears without clear cause
- Performance regression without obvious cause
- Behavior differs from expectation

**Skip when:**
- Implementing a known-correct change
- Just running tests for verification

---

### `test-driven-development`
**Load when:**
- Writing any new code (feature, fix, refactor)
- Adding new test file
- Modifying existing behavior

**Skip when:**
- Pure docs change
- Pure config change (no logic)

---

### `verification-before-completion`
**Load when:**
- About to say "done", "complete", "finished"
- About to mark task as Done in tracker
- About to commit or push
- About to close a PR

**Skip when:**
- Task is intermediate (not final delivery)

---

### `requesting-code-review`
**Load when:**
- About to commit significant changes
- High-blast-radius refactor
- Security-sensitive change
- Cross-layer change (e.g., schema + API + UI)
- After completing a major task

**Skip when:**
- Trivial changes (typo, single config)
- Local-only edits (not committed)

---

### `brainstorming-2`
**Load when:**
- New feature idea
- Design decision
- Multiple valid approaches
- Need to explore user intent
- Creative / UX work

**Skip when:**
- Clear, well-specified task
- Implementation-only

---

### `mavis-doctor`
**Load when:**
- Stuck and don't know why
- Behavior differs from what model expects
- Investigating environment issues
- After failed retries

**Skip when:**
- Task is progressing normally

---

### `mavis-team`
**Load when:**
- Genuine parallel value (3+ independent tracks)
- Multi-source investigation
- High error cost needing independent verification
- Spans multiple tools/sources

**Skip when:**
- Sequential dependency between parts
- Can be done in single session

---

### `code-review`
**Load when:**
- Reviewing existing code (read-only)
- Pre-merge audit
- Security audit

**Skip when:**
- About to write new code (use `test-driven-development`)

---

## Combinations (Most Common)

| Scenario | Skills to load |
|----------|----------------|
| New feature implementation | `plan-mode` + `test-driven-development` + `verification-before-completion` |
| Bug fix | `systematic-debugging` + `test-driven-development` + `verification-before-completion` |
| Major refactor | `plan-mode` + `test-driven-development` + `requesting-code-review` + `verification-before-completion` |
| Quality Pass item (like Pass 1) | `plan-mode` + `systematic-debugging` + `verification-before-completion` |
| Performance optimization | `plan-mode` + `systematic-debugging` + `verification-before-completion` |
| Security fix | `systematic-debugging` + `test-driven-development` + `requesting-code-review` |
| Migration work | `plan-mode` + `test-driven-development` + `verification-before-completion` |
| Documentation | `plan-mode` (if large) — usually not needed for small docs |
| Stuck on something | `mavis-doctor` |
| Investigating unknown root cause | `systematic-debugging` + `mavis-doctor` |

---

## Anti-Patterns (What NOT to Do)

| Anti-pattern | Why wrong | Correct pattern |
|--------------|-----------|------------------|
| Loading 5+ skills at once | Dilutes focus, increases cognitive load | Load only the 2-3 most relevant |
| Loading no skills ("I know what to do") | Skips methodology, leads to gaps | Apply the 4-step gate, even if 1 skill |
| Loading `plan-mode` for a single-line fix | Overhead, slows down trivial work | Use `test-driven-development` only |
| Skipping `verification-before-completion` | Risk claiming "done" prematurely | Always load before "done" |
| Skipping `systematic-debugging` for bugs | Risk fixing symptom, not cause | Always load for bugs |

---

## Self-Check Questions

Before every action, ask:

1. **"Am I about to modify a file?"** → Yes → Apply the gate
2. **"Is this a bug or unexpected behavior?"** → Yes → `systematic-debugging`
3. **"Am I writing new code?"** → Yes → `test-driven-development`
4. **"Am I about to claim done?"** → Yes → `verification-before-completion`
5. **"Is this a multi-step task?"** → Yes → `plan-mode`
6. **"Am I stuck?"** → Yes → `mavis-doctor`

If any answer is "yes" and you have not loaded the corresponding skill: **STOP. Load it. Then proceed.**

---

**Last Updated:** 2026-06-14 16:50 Asia/Riyadh

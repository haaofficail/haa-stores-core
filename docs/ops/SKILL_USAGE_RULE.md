# Skill Usage Rule — Mandatory Methodology

> **Reference:** AGENTS.md §14 (Mandatory Skill Selection Rule)
> **Effective:** 2026-06-14
> **Status:** Binding, non-negotiable

---

## Purpose

LLM-based agents forget skills between turns. The system prompt lists skill triggers but does not enforce them. This document provides the **operational rule** that turns skill usage from "optional helpful nudge" into "mandatory gate."

---

## The 4-Step Pre-Action Skill Gate

Before EVERY action that:
- Modifies a file
- Runs a build / test / lint
- Makes an architectural, security, or data decision
- Creates a commit, push, or merge
- Claims "done" or "complete"

...complete these 4 steps **in order, in writing**:

### Step 1: STATE the task

One sentence. What are you about to do?

```
Task: [one-sentence description]
```

### Step 2: SELECT the skill(s)

List each skill by name. Use the decision tree in `SKILL_DECISION_TREE.md`.

### Step 3: STATE WHY each skill fits

One sentence per skill. Be specific to THIS task.

### Step 4: LOAD the skill(s)

Use the `skill` tool to load each. Do not proceed until loaded.

---

## Output Template (use this exact format)

```markdown
## Pre-Action Skill Gate

**Task:** [one sentence]

**Skills selected:**
- `[skill-name-1]` — [why it fits this task]
- `[skill-name-2]` — [why it fits this task]

**Loading now...**
[then: skill tool calls]
```

---

## When This Rule Does NOT Apply

- Pure conversational answers (questions, explanations, greetings)
- Reading files for context (no modification)
- Format conversions (markdown → JSON, etc.)
- Quick lookups (grep, glob, single reads for context)
- Tool calls that are pure inspection (e.g., `pwd`, `ls`)

---

## When This Rule APPLIES (default behavior)

- Any code change in any file
- Any new task created in `TASK_TRACKER.md`
- Any new file created
- Any commit, push, or merge
- Any decision that affects architecture, security, or data
- Any test run considered "verification"
- Any time the agent is about to say "done" or "complete"

---

## Examples

### Example 1: Quality Pass 1, Item 1 — Schema merge

```markdown
## Pre-Action Skill Gate

**Task:** Delete duplicate `marketing-actions.ts` schema file (dead code).

**Skills selected:**
- `plan-mode` — this is a data-integrity change requiring deliberate planning
- `systematic-debugging` — need to confirm root cause of duplication before removal
- `verification-before-completion` — must verify no test breaks after removal

**Loading now...**
```

### Example 2: Adding a new API endpoint

```markdown
## Pre-Action Skill Gate

**Task:** Add `requirePermission` to `dashboard.ts` routes.

**Skills selected:**
- `plan-mode` — multi-step change across multiple endpoints
- `test-driven-development` — need boundary tests before applying changes
- `verification-before-completion` — must verify all tests pass

**Loading now...**
```

### Example 3: Investigating a failing test

```markdown
## Pre-Action Skill Gate

**Task:** Investigate why `compliance-regression-gate.test.ts` fails on local DB.

**Skills selected:**
- `systematic-debugging` — debugging a test failure requires root cause analysis
- `mavis-doctor` — could be environment, migration state, or seed data issue

**Loading now...**
```

### Example 4: Refactoring a large file

```markdown
## Pre-Action Skill Gate

**Task:** Split `payment.ts` (1429 lines) into 5 provider packages.

**Skills selected:**
- `plan-mode` — major refactor with multiple steps
- `test-driven-development` — preserve behavior through tests
- `verification-before-completion` — verify all 5 packages build and tests pass
- `requesting-code-review` — refactor is high-blast-radius, needs review

**Loading now...**
```

---

## Enforcement

### In `TASK_TRACKER.md` Template

Every task now has two fields:

- `**Skills Required:**` — pre-declared at task creation
- `**Skills Used:**` — filled during/after execution per sub-task

### Status Transitions

A task cannot move to `Done` if `**Skills Used:**` is empty.
A task cannot move to `In Progress` if `**Skills Required:**` is empty.

### In the Agent's First Response of Every Task

The very first thing the agent does is the 4-step gate. Even before reading files, the gate is completed.

---

## Common Mistakes to Avoid

| Mistake | Why it's wrong | Correct behavior |
|---------|----------------|------------------|
| "This is too small for a skill" | Even small changes can break things | Apply the gate, even if 1 skill |
| "I already know the answer" | Confidence ≠ correctness | Use `verification-before-completion` |
| "Just one quick edit" | "Quick edits" cause regressions | Apply the gate, even if 1 skill |
| "I'll add skills later" | Skills are not retroactive | Apply the gate BEFORE the action |
| "Skipping the gate this once" | One skip becomes habit | Apply the gate EVERY time |

---

## Quick Reference: Skill Decision Tree

For the full decision tree, see `SKILL_DECISION_TREE.md`. Quick reference:

| Task pattern | Required skill |
|--------------|----------------|
| Any new feature, bug fix, or refactor | `plan-mode` |
| Any bug investigation | `systematic-debugging` |
| Any new code or test | `test-driven-development` |
| Before claiming "done" | `verification-before-completion` |
| After any significant change | `requesting-code-review` |
| Any creative/design work | `brainstorming-2` |
| Any complex multi-step task | `plan-mode` |
| Stuck / unsure why | `mavis-doctor` |
| Multi-step parallel work | `mavis-team` |
| Code review of existing code | `code-review` |

---

## Related Files

- `AGENTS.md` §14 — Constitution-level rule
- `TASK_TRACKER.md` — Task template with Skills fields
- `SKILL_DECISION_TREE.md` — Detailed skill selection logic
- `find-skills` skill — discover relevant skills when unsure
- `~/.mavis/skills/` — Full skill library

---

**Last Updated:** 2026-06-14 16:50 Asia/Riyadh
**Status:** Active, binding, no exceptions without owner authorization

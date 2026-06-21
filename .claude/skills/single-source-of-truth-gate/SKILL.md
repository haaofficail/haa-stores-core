---
name: single-source-of-truth-gate
description: Use this skill when about to add/duplicate a config, schema, doc, theme primitive, or any datum that already exists elsewhere. Refuses second sources of truth.
disable-model-invocation: true
---

# Single Source of Truth Gate

## Purpose

Prevent the worst kind of drift: two files that try to be the same truth. The repo already has examples (marketplace audits, theme packages); do not add more.

## Read First

- `docs/agent-os/OWNER_DECISIONS.md` (existing single-source rulings).
- `docs/agent-os/PROJECT_MEMORY.md` (identity and provider truth).
- `docs/agent-os/DECISIONS.md` (process decisions).

## Rules

1. Before introducing a new doc/config/schema/token, search for an existing one with the same purpose.
2. If found, **extend or fix** it. Do not create a sibling.
3. If two sources already disagree, classify both `STALE` / `PARTIALLY_SUPERSEDED` and route the merge through `cleanup-and-archive-policy`.
4. Cross-package types belong in `packages/shared` (Zod schemas, types, error codes).
5. Brand/design tokens go through `packages/tokens` and `@haa/storefront-themes` (canonical per DECISION-OS-003).
6. Owner-binding rulings live in `docs/agent-os/OWNER_DECISIONS.md` — agents do not author them.

## Steps

1. Name the truth being added (e.g. "tabby credentials shape", "primary brand color hex").
2. Search the repo for an existing source.
3. If found: extend; document the extension in a one-line comment or `DECISIONS.md` entry.
4. If not found: add to the canonical location for its type (per the rules above).
5. If a conflicting source is discovered while extending: stop; file as `MERGE` candidate in `ISSUE_REGISTER.md`; raise owner question.

## Output

```
Truth: <one sentence>
Existing source(s): <paths or "none">
Action: <extended <path> | added at <path> | conflict raised>
Conflicting source (if any): <path> → ISSUE-NNNN
```

---
name: best-practices-research-gate
description: Use this skill when a task involves UX/design patterns, security, payments, shipping, CI/CD, SEO, accessibility, performance, a new external integration, or a new tool. Decides whether to search the web and how to capture the result.
disable-model-invocation: true
---

# Best Practices Research Gate

## Purpose

Force research when a domain demands it; refuse research when the answer is in the repo. Avoid both kinds of failure: shipping with shallow knowledge, and burning context on unnecessary searches.

## Read First

- `docs/agent-os/COMMAND_ROUTING_MATRIX.md` (research column per task type).
- `docs/agent-os/OPERATING_MANUAL.md §2.8` (research rule).
- `docs/agent-os/PROJECT_MEMORY.md` (what the project already knows).

## Rules

1. Research **required** when the task type appears with `yes-when-new-external` or `yes` in the matrix:
   - new external integration (payment, shipping, marketplace, identity provider)
   - new framework/library decision
   - security/compliance question outside the constitution
   - UX pattern with no existing repo precedent
   - CI/CD primitive change
   - new tool with no project history
2. Research **skipped** when the answer is reachable via `grep`/`find` in the repo, or sits in `AGENTS.md` / `docs/agent-os/` / `docs/ops/`.
3. Cite sources. Every external claim records: URL or doc title, retrieval date, the exact claim used.
4. Do not paste large external snippets back; record a one-line summary + the link.
5. Conflicts between external advice and `OWNER_DECISIONS.md` → owner rules.

## Steps

1. Decide the research need using the matrix row.
2. If `no`: proceed; cite repo evidence in the report.
3. If `yes`: state the question, run the search, capture (source, date, claim).
4. Reflect findings into the Smart Execution Brief and (if architectural) propose a new entry for `docs/agent-os/DECISIONS.md`.
5. Do not adopt an external pattern without checking `build-on-existing-system-gate`.

## Output

```
Research need: <yes/no — why>
Question: <single sentence>
Sources used: <list of (URL/title, retrieval date, one-line claim)>
Conflicts with project decisions: <none | list>
Proposed memory/decision update: <none | draft>
```

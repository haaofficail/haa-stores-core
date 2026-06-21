---
name: evidence-led-reporting
description: Use this skill when writing any Final Report. Refuses claims without evidence — paths, line numbers, command outputs, links.
disable-model-invocation: true
---

# Evidence-Led Reporting

## Purpose

A report is only as good as the evidence under each claim. Adjectives ("looks good", "should work") are not evidence.

## Read First

- `docs/agent-os/QUALITY_GATES.md §4` (evidence-led reporting rule).
- `docs/agent-os/TASK_HANDOFF_TEMPLATE.md` (handoff fields with Evidence column).
- `AGENTS.md §8` (Final Report Rule).

## Rules

1. Every "done" claim cites one of:
   - file path + line range (`path/to/file.ts:42-60`),
   - command name + outcome (`pnpm test → 72/72 passed`),
   - link (PR URL, commit SHA, run id),
   - explicit `assumption` or `not checked` label when nothing else applies.
2. Quote tool output for non-trivial results; do not paraphrase outcomes.
3. Do not invent commands that were not run.
4. Do not present a green "looks clean" without the command that proves it.
5. Secrets are never quoted — use `--redact` or summarise count + classification.

## Steps

1. Draft the report.
2. Walk every sentence: tag each as `EVIDENCE` (has one of the four types) or `CLAIM` (does not).
3. Rewrite every `CLAIM` to attach evidence or change to `assumption` / `not checked`.
4. Strip filler and adjectives.
5. Confirm any secret-shaped content is redacted.

## Output

The Final Report itself. Structure (minimum):

```
What changed: <list>
Files modified: <paths>
Verification run:
- <command> → <result, counts, duration>
- <command> → <result>
Residual risks: <list with Evidence>
What was NOT changed: <list>
Suggested next step: <single line>
```

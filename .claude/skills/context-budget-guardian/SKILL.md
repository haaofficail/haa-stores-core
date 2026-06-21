---
name: context-budget-guardian
description: Use this skill when starting any task that involves reading multiple files, running long commands, or planning multi-step research. Prevents context exhaustion by enforcing search-first, targeted-read discipline.
disable-model-invocation: true
---

# Context Budget Guardian

## Purpose

Keep the agent's working context lean. Long sessions die when the context fills with unfocused reads and noisy command output. Spend tokens on the work, not on incidental exploration.

## Read First

- `docs/agent-os/OPERATING_MANUAL.md §2.8` (when to research).
- `docs/agent-os/COMMAND_ROUTING_MATRIX.md` (what verification a task actually needs).

## Rules

1. Search before read. `grep`/`find` first; `Read` only the relevant lines.
2. `Read` with `offset` + `limit` for files > 300 lines. Never read a whole large file when a section will do.
3. Redirect long command output to a file (`> /tmp/out.log`), then `grep` it.
4. Use a fork (`Agent` without `subagent_type`) for research detours so the main thread keeps focus.
5. Do not paste large files back to the user; cite paths + line ranges.
6. Do not re-read a file you just edited unless an edit error indicates otherwise.
7. Do not run `ls -R` on big trees or `find /` from the root.

## Steps

1. Ask: what is the minimum information needed to decide the next action?
2. Choose a tool order: grep → targeted Read → run command → narrow further.
3. If the answer lies outside the canonical project memory, plan a fork for the research.
4. After each tool call, evaluate: did this bring the next action closer? If not, stop and reassess.

## Output

Implicit (the discipline shows up in tool choice). When the user asks "did you check?", reply with the specific grep/find/command used, not "yes I looked".

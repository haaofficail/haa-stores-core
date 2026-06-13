# Development Playbook

> The philosophy, principles, and workflow for developing Haa Stores Core.

---

## Philosophy

1. **We build a platform, not pages.** Every change must respect the architecture and the product.
2. **Quality is not proportional to request length.** A short request deserves the same rigour as a long spec.
3. **The agent is responsible for elevating the request.** Raw user input → professional brief → planned execution.
4. **No execution without scoping.** Scope defines what we do and — equally important — what we DON'T do.
5. **No "Done" without testing and reporting.** Implementation ≠ completion. Verification and documentation complete the task.
6. **Documentation is part of the work, not an afterthought.** If it's not documented, it didn't happen.

---

## Core Principles

### Principle 1: Context Before Action
Before touching any file, understand:
- What does the user actually need?
- What is the current state of the project?
- What decisions led to the current architecture?
- What are the known risks in this area?

### Principle 2: One Task, One Scope
A single task should modify files in at most one layer. If multiple layers are needed, the task plan must explicitly justify the cross-layer change.

### Principle 3: Test the Change, Then Test Again
TypeScript is the first line of defense. Tests are the second. Manual checks (RTL, mobile, visual) are the third. All three must pass or the task is not done.

### Principle 4: Leave the Camp Cleaner Than You Found It
Update docs, logs, and state files after every task. The next session should be able to start without asking "what happened last time?"

---

## Workflow

```
1. INTAKE
   └─ Receive user request
   
2. CLASSIFICATION
   └─ Determine task type (bug, feature, refactor, etc.)
   
3. DISCOVERY
   └─ Read CURRENT_STATE.md, search TASK_TRACKER, ISSUE_KNOWLEDGE_BASE, DECISIONS
   
4. REQUEST EXPANSION
   └─ Convert raw request → Interpreted Task template
   
5. PLANNING
   └─ Define scope, out-of-scope, files, risks, acceptance criteria, test plan
   
6. IMPLEMENTATION
   └─ Execute the change (one scope only)
   
7. VERIFICATION
   └─ Run typecheck, tests, regression checklist, manual checks
   
8. DOCUMENTATION
   └─ Update TASK_TRACKER, CURRENT_STATE, CHANGELOG_INTERNAL, etc.
   
9. CLOSURE
   └─ Write final report, suggest next step
```

---

## Operating Principle

> Any simple user command is raw input, not an execution specification.
> The agent's primary value is transforming raw input into a well-scoped, tested, documented change.

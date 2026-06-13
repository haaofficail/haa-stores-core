# Task Lifecycle

> Defines the state machine that every task passes through.

---

## State Diagram

```
                    ┌─────────────┐
                    │  Requested  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  Expanded   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │   Planned   │
                    └──────┬──────┘
                           │
                    ┌──────▼───────┐
                    │  In Progress │
                    └──────┬───────┘
                           │
                    ┌──────▼────────┐
                    │  Implemented  │
                    └──────┬────────┘
                           │
                    ┌──────▼──────────┐
                    │ In Verification │
                    └──────┬──────────┘
                      ╱    │    ╲
                     ╱     │     ╲
                    ╱      │      ╲
        ┌──────────┐ ┌──────────┐ ┌───────────┐
        │   Done   │ │ Reopened │ │  Blocked  │
        └──────────┘ └─────┬────┘ └─────┬─────┘
                            │            │
                            └─────┬──────┘
                                  │
                           ┌──────▼───────┐
                           │   Cancelled  │
                           └──────────────┘
```

---

## States

### 1. Requested
Task has been received from the user. No analysis has been performed yet.

**Entry criteria:** User submits a request.
**Actions:** Move to Expanded by applying Request Expansion Rule.

### 2. Expanded
Raw request has been converted to a structured Interpreted Task template.

**Entry criteria:** Interpreted Task template is complete.
**Actions:** Move to Planned by defining scope, files, risks, acceptance criteria, and test plan.

### 3. Planned
Scope, plan, and acceptance criteria are defined. Ready for execution.

**Entry criteria:** Scope, out-of-scope, affected areas, files to inspect, risks, acceptance criteria, and test plan are documented.
**Actions:** Move to In Progress.

### 4. In Progress
Implementation is active.

**Entry criteria:** Plan is approved.
**Actions:** Implement changes. Move to Implemented when code changes are complete.

### 5. Implemented
Code changes are complete. Pending verification.

**Entry criteria:** All intended changes have been made.
**Actions:** Run verification checks (typecheck, tests, regression checklist, manual checks). Move to In Verification.

### 6. In Verification
Testing and review in progress.

**Entry criteria:** Code changes are complete.
**Actions:**
- If all checks pass → Move to Done
- If checks fail → Move back to In Progress
- If the problem returns after being Done → Move to Reopened

### 7. Done
Task meets Definition of Done. All criteria satisfied.

**Entry criteria:**
- All acceptance criteria met
- Typecheck passes
- Relevant tests pass or reason documented
- Documentation updated
- Final report written

### 8. Blocked
Task cannot proceed due to external dependency, missing information, or environmental issue.

**Entry criteria:** An obstacle prevents progress.
**Actions:** Document the blocker. Return to Planned when unblocked.

### 9. Reopened
Task was previously Done but the issue has returned or verification failed.

**Entry criteria:** A verified Done task fails in practice.
**Actions:** Return to In Progress with updated context.

### 10. Cancelled
Task is cancelled with a clear, documented reason.

**Entry criteria:** Decision to cancel is made and documented.
**Actions:** Document reason in TASK_TRACKER and DECISIONS.md if applicable.

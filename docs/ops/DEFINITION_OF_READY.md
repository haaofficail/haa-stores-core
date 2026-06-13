# Definition of Ready

> A task is ready for execution ONLY when ALL of these criteria are met.

---

## Readiness Criteria

- [ ] **Task type** is identified (bug, feature, refactor, etc.)
- [ ] **Goal** is clear and unambiguous
- [ ] **Scope** is explicitly defined
- [ ] **Out of scope** is explicitly defined
- [ ] **Assumptions** are documented
- [ ] **Affected areas / files** are identified
- [ ] **Risks** are identified
- [ ] **Acceptance criteria** are written and measurable
- [ ] **Test plan** is written
- [ ] No product decision ambiguity that would block execution

---

## If NOT Ready

- Do NOT execute
- Document the assumptions
- Only ask the user if the decision could cause:
  - Data loss or corruption
  - Architectural change
  - Significant rework if wrong
  - Security vulnerability

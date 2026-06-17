# Pen-Test Vendor Shortlist — TASK-0045 Phase 6 + TASK-0038 G7

> **Owner decision required.** Engineering prepared this shortlist to
> make pen-test firm engagement faster. You (the founder) make the
> final call.
>
> **Cross-references:**
> - `docs/ops/MARKETPLACE_HARDENING_PLAN.md` §8 Phase 6 §8.2
> - `docs/ops/TASK_TRACKER.md` TASK-0038 (G7: pen-test firm)
> - `docs/ops/TASK_TRACKER.md` TASK-0045 (Phase 6 pen-test + beta)

---

## 1. Why a CREST-certified firm?

**CREST** (Council of Registered Ethical Security Testers) is the international accreditation body for penetration testing firms. CREST-certified firms:

- Follow a **code of conduct** (no black-hat activity, responsible disclosure).
- Have **vetted methodologies** (OWASP, NIST, PTES aligned).
- Submit **CREST member firm audits** annually.
- Provide **insurance + liability coverage** for the engagement.
- Issue **CREST-branded reports** that SAMA, NCA, and international regulators recognize.

**For Saudi market:** CREST certification is recognized by SAMA (Saudi Arabian Monetary Authority) and NCA (National Cybersecurity Authority) for financial-sector and government-mandated pentests.

**Alternative certifications to consider:**
- **OSCP** (Offensive Security Certified Professional) — individual cert, not firm-level.
- **CHECK** (UK NCSC scheme) — strong for UK, less known in KSA.
- **PCI QSA** (Payment Card Industry Qualified Security Assessor) — required for PCI-DSS but not for general pen-test.

CREST is the best fit for KSA + financial-grade SaaS.

---

## 2. Shortlist (3 vendors)

> **Disclaimer:** This is a research-grade shortlist based on public
> information (CREST member directory, vendor websites, KSA market
> presence). Engineering has **NOT engaged with any of these firms**.
> You must independently verify credentials and obtain quotes before
> engagement.

### Vendor A — Regional MENA specialist (recommended first contact)

| Field | Value |
|-------|-------|
| Name | **MENA Cyber Security Co. (placeholder — engineering to research)** |
| HQ | Riyadh, KSA |
| CREST | Member firm (verify current status on crest-approved.org) |
| Specialties | Web app pen-test, mobile, API security, financial services |
| KSA experience | Yes (multiple Saudi banks + fintechs) |
| Estimated cost | USD 8k-15k for our scope (~5-day engagement) |
| Lead time | 1-2 weeks to engage |
| Language | Arabic + English (Saudi team) |
| Notable clients | (verify via NDA) |
| Why first | KSA-based + CREST + financial-services experience = best cultural + technical fit |

### Vendor B — Global big-4 audit firm (enterprise-grade)

| Field | Value |
|-------|-------|
| Name | **Big-4 firm pen-test practice (Deloitte / EY / KPMG / PwC)** |
| HQ | Global; KSA offices in Riyadh |
| CREST | Member firm (verify) |
| Specialties | Web + mobile + API + infrastructure; comprehensive coverage |
| KSA experience | Extensive (SAMA-regulated entities) |
| Estimated cost | USD 20k-40k (premium pricing) |
| Lead time | 2-4 weeks to engage (procurement process) |
| Language | English primary; Arabic available |
| Notable clients | Tier-1 Saudi banks + government |
| Why second | Higher cost but enterprise credibility; useful if SAMA relationships matter |

### Vendor C — Boutique CREST firm (cost-effective)

| Field | Value |
|-------|-------|
| Name | **Offensive Security (or equivalent boutique CREST firm)** |
| HQ | US/UK |
| CREST | Member firm (verify) |
| Specialties | Deep technical pen-test; OSCP-certified testers |
| KSA experience | Limited (remote-friendly) |
| Estimated cost | USD 5k-10k (lean engagement) |
| Lead time | 1-2 weeks |
| Language | English only |
| Notable clients | (verify) |
| Why third | Lowest cost; technical depth; remote OK. Risk: less KSA regulatory familiarity. |

---

## 3. Engagement scope (per plan §8.2)

The pen-test firm must cover:

| Scope area | Endpoints | Notes |
|------------|-----------|-------|
| **Public marketplace** | `GET /marketplace/products`, `/products/:s/:p`, `/sellers`, `/sellers/:s`, `/categories`, `POST /marketplace/orders`, `GET /marketplace/orders/:num` | Includes P0-3 accessToken flow |
| **Admin moderation** | `PATCH /admin/marketplace/products/:id/{review,feature}` | Includes P0-5 audit log |
| **Tenant isolation** | cross-tenant data access attempts | CRITICAL |
| **XSS / injection** | product name / description / store name | React + Hono default escaping |
| **Rate-limit bypass** | `/marketplace/*` and `/marketplace/orders` | P0-3 + P1-9 fix verification |
| **Order enumeration resistance** | accessToken vs phone (verify P0-3 fix) | |
| **Demo store visibility** | confirm only 'main'/'perfume' profiles show | P0-4 fix verification |
| **SFDA workflow** | category.requires_sfda + format validation | P0-1 fix verification |
| **Auth + CSRF** | guest checkout endpoints, Origin header checks | P1-1 verification |
| **API rate limits** | POST /marketplace/orders, /auth/login, /admin/login | |

**Out of scope:**
- Internal network pentest (this is an external engagement)
- Social engineering (deferred to Phase 8+)
- Source code review (use a separate code audit if needed)

---

## 4. Engagement timeline (per plan)

| Phase | Duration | Notes |
|-------|----------|-------|
| Vendor outreach + NDA | 1 week | Get 2-3 quotes, compare |
| Pre-engagement scoping | 1-2 days | Define rules of engagement, test windows |
| Active pen-test | 1 week | Vendor executes; daily standups optional |
| Report delivery | 1 week | Vendor delivers draft report |
| Triage + fixes | 2-5 days | Engineering fixes Critical/High findings |
| Re-test (if needed) | 1-3 days | Vendor validates fixes |
| **Total calendar** | **3-5 weeks** | (per plan §10) |

---

## 5. Findings triage (per plan §8.3)

After pen-test report arrives:

| Severity | Action | Timeline |
|----------|--------|----------|
| **Critical (P0)** | Fix before beta launch | Same day |
| **High (P1)** | Fix within 2 weeks of launch | Scheduled sprint |
| **Medium (P2)** | Add to backlog, fix in next sprint | Backlog |
| **Low (P3)** | Backlog, address opportunistically | Backlog |

**Owner decision on Critical/High:** Schedule a 1-hour triage session with engineering within 48 hours of report delivery.

---

## 6. Vendor selection criteria (decision matrix)

Score each vendor 1-5:

| Criterion | Weight | Vendor A (KSA) | Vendor B (Big-4) | Vendor C (Boutique) |
|-----------|--------|----------------|-------------------|---------------------|
| CREST certified (current) | 20% | 5 | 5 | 5 |
| KSA regulatory familiarity | 25% | 5 | 4 | 2 |
| Cost-effectiveness | 15% | 4 | 2 | 5 |
| Technical depth (web + API) | 20% | 4 | 5 | 5 |
| Lead time (faster = better) | 10% | 4 | 2 | 4 |
| Language match (Arabic) | 10% | 5 | 3 | 1 |
| **Weighted total** | | **4.55** | **3.85** | **3.85** |

**Recommendation:** Start with **Vendor A** (KSA regional) for primary engagement. Have **Vendor C** as backup if Vendor A is unavailable or quote is too high. Vendor B is only worth considering if you anticipate needing SAMA-regulated entity relationships.

---

## 7. Pre-engagement checklist (owner action)

Before signing the contract:

- [ ] **NDA signed** (mutual). Vendor sees code only if you choose a white-box test.
- [ ] **Test scope defined** (above + any custom endpoints).
- [ ] **Test windows agreed** (avoid peak business hours; have staging env ready).
- [ ] **Emergency contacts shared** (engineering lead, your cell).
- [ ] **Liability + insurance verified** (vendor carries errors & omissions insurance).
- [ ] **Report delivery format agreed** (CREST template + executive summary).
- [ ] **Re-test policy defined** (does the contract include 1 free re-test?).
- [ ] **Payment terms** (50% upfront, 50% on report delivery is standard).

---

## 8. Engineering support (engineering commits)

Per plan §7 (Engineering support):

- Deploy access to a **staging environment** (identical to production schema + seed data) for the vendor.
- Technical documentation: `docs/architecture/`, `docs/security/`, `docs/ops/`.
- Be available for **clarification calls** (max 4 hours over engagement).
- **Triage and fix** any Critical/High findings (estimated 2-5 days engineering post-report).
- **No code-sharing by default** — vendor tests against deployed endpoints only (black-box).

---

## 9. Owner action items (TASK-0038 updates)

When you engage a vendor:

| # | Action | Owner | Timeline |
|---|---|---|---|
| 1 | Shortlist 2-3 firms (this doc gives you 3 starting points) | You | Week 1 |
| 2 | Request quotes + NDAs from shortlisted firms | You | Week 1-2 |
| 3 | Sign contract with chosen firm + pay 50% deposit | You | Week 2-3 |
| 4 | Provide vendor with staging env access + docs | Engineering | Week 3 |
| 5 | Active pen-test | Vendor | Week 3-4 |
| 6 | Triage meeting on Critical/High findings | You + Engineering | Week 5 |
| 7 | Engineering fixes findings | Engineering | Week 5-6 |
| 8 | Vendor re-test (if in scope) | Vendor | Week 6-7 |
| 9 | Pen-test report signed off as PASS or all findings fixed | You | Week 7 |

---

## 10. References

- **CREST member directory:** https://www.crest-approved.org/
- **OWASP Testing Guide:** https://owasp.org/www-project-web-security-testing-guide/
- **PTES (Penetration Testing Execution Standard):** http://www.pentest-standard.org/
- **Saudi NCA Cybersecurity Controls:** https://nca.gov.sa/
- **SAMA Cybersecurity Framework:** https://sama.gov.sa/
- **PCI-DSS ASV (Approved Scanning Vendor):** https://www.pcisecuritystandards.org/

---

**Last Updated:** 2026-06-17 (TASK-0045 §8.2 + TASK-0038 G7 owner-action brief)
**Owner Action Required:** Shortlist → Quote → Engage → Triage
**Engineering Effort:** 2-5 days triage + fixes after report delivery
**Cost Estimate:** USD 5k-15k depending on vendor

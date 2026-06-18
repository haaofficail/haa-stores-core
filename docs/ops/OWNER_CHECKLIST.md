# Owner Checklist — Live-Deploy Gates G1-G10

> **Audience:** Founder (owner-track). Work with this file directly.
> **Last updated:** 2026-06-18
> **Status:** 0/10 closed
> **Source of truth:** TASK-0038 in `docs/ops/TASK_TRACKER.md`
> **Engineering briefs:** `docs/ops/OWNER_ACTION_G*.md`

---

## Quick status

- **G1 CR**            ⏳ Open
- **G2 VAT**           ⏳ Open
- **G3 E-com License** ⏳ Open
- **G4 DPO**           ⏳ Open
- **G5 Trademark**     ⏳ Open
- **G6 PCI ASV**       ⏳ Open
- **G7 Pen-test**      ⏳ Open
- **G8 KSA Hosting**   ⏳ Open
- **G9 Tabby DPA**     ⏳ Open
- **G10 DR Plan**      ⏳ Open

**Progress:** `░░░░░░░░░░` 0/10

---

## G1 — Commercial Registration (CR) — MoCI

**What:** Register the company with the Saudi Ministry of Commerce.
**Why:** Without CR, you cannot legally operate a business in Saudi Arabia.
**Who:** You (founder) directly via MoCI business portal.
**Brief:** `docs/ops/OWNER_ACTION_G1_CR.md`
**Blocker for:** Phase 5 (TASK-0044)
**Estimated effort:** 1-2 weeks (paperwork + waiting)
**Estimated cost:** SAR 200-2000 (depending on entity type)

### Sub-steps

- [ ] Choose entity type: مؤسسة فردية / شركة ذات مسؤولية محدودة
- [ ] Reserve trade name (trademark clearance via SAIP — see G5)
- [ ] Submit CR application via https://mc.gov.sa/ar/eservices
- [ ] Receive CR certificate (السجل التجاري)
- [ ] Update `docs/SAUDI_COMPLIANCE_CHECKLIST.md` §G1 with CR number

---

## G2 — VAT Registration — ZATCA

**What:** Register with ZATCA for Value Added Tax and obtain VAT certificate.
**Why:** Required for any business with annual revenue > SAR 375,000 (or voluntary if lower).
**Who:** You + accountant (ZATCA agent or tax consultant recommended).
**Brief:** `docs/ops/OWNER_ACTION_G2_VAT.md`
**Blocker for:** Phase 5 + ZATCA Phase 2 (TASK-0036)
**Estimated effort:** 2-4 weeks
**Estimated cost:** SAR 0-5000 (accountant fees)

### Sub-steps

- [ ] Engage accountant/tax consultant familiar with ZATCA
- [ ] Submit VAT registration via https://zatca.gov.sa
- [ ] Receive VAT certificate (15-digit number)
- [ ] Configure VAT rate in `packages/commerce-core` (default 15%)
- [ ] Set up VAT reporting calendar (quarterly)

---

## G3 — E-Commerce License — MoCI

**What:** Apply for the online sales license from MoCI (separate from CR).
**Why:** Required to legally sell online in Saudi.
**Who:** You + your CR number (G1 dependency).
**Brief:** `docs/ops/OWNER_ACTION_G3_ECOMMERCE_LICENSE.md`
**Blocker for:** Phase 5
**Estimated effort:** 1-3 weeks
**Estimated cost:** SAR 1000-5000

### Sub-steps

- [ ] After CR is issued (G1), apply via https://maroof.sa or MoCI portal
- [ ] Provide: CR copy, store domain, sample products
- [ ] Receive E-commerce license (رخصة التجارة الإلكترونية)
- [ ] Display license on storefront footer (engineering task once issued)

---

## G4 — DPO Appointment (PDPL Article 22)

**What:** Hire or appoint a Data Protection Officer (per Saudi PDPL).
**Why:** Saudi Personal Data Protection Law (PDPL) requires a DPO when processing personal data at scale.
**Who:** You (either hire full-time, contract, or appoint yourself with documentation).
**Brief:** `docs/ops/OWNER_ACTION_G4_DPO.md`
**Blocker for:** Phase 3.4 (already published PRIVACY_POLICY without contact) + Phase 5
**Estimated effort:** 1-4 weeks (depends on hiring path)
**Estimated cost:** SAR 0 (appoint yourself) to SAR 20,000+/year (hire/contract)

### Sub-steps

- [ ] Decide: hire full-time / contract external DPO / appoint yourself
- [ ] Draft DPO appointment letter (if self-appointed)
- [ ] Update `docs/PRIVACY_POLICY.md` §DPO Contact section with name + email + phone
- [ ] Update storefront footer with DPO contact link
- [ ] Notify existing customers of DPO appointment (email blast)

---

## G5 — Trademark Registration — SAIP

**What:** Register "هاء متاجر" (or chosen brand) with SAIP (Saudi Authority for Intellectual Property).
**Why:** Protects your brand from copycats; required for credibility.
**Who:** You + IP lawyer (recommended).
**Brief:** `docs/ops/OWNER_ACTION_G5_TRADEMARK.md`
**Blocker for:** Phase 5
**Estimated effort:** 3-6 months (publication + opposition period)
**Estimated cost:** SAR 1000-3000 government fees + SAR 5000-15000 lawyer

### Sub-steps

- [ ] Search SAIP trademark database for conflicts: https://saip.gov.sa
- [ ] File trademark application (word mark + logo mark)
- [ ] Pay government fees
- [ ] Wait for publication in Official Gazette (30-day opposition period)
- [ ] Receive registration certificate

---

## G6 — PCI-DSS ASV Scan

**What:** Engage a PCI-SSC Approved Scanning Vendor (ASV) to scan your infrastructure.
**Why:** Required if you process credit card payments directly (Tabby/Tamara redirect reduces scope, but ASV is still required by Tabby's processor agreement).
**Who:** You (founder) + PCI ASV vendor.
**Brief:** `docs/ops/OWNER_ACTION_G6_PCI_ASV.md`
**Blocker for:** Phase 5 + Phase 6
**Estimated effort:** 2-4 weeks (vendor engagement + scan + remediation)
**Estimated cost:** USD 1000-5000/year (annual scans)

### Sub-steps

- [ ] Verify payment processor (Tabby/Tamara) is using hosted checkout (reduces your PCI scope to SAQ-A)
- [ ] Engage ASV from https://www.pcisecuritystandards.org/assessors_and_solutions/point_to_point_assessments
- [ ] Provide: scan target URLs, network diagrams, server configs
- [ ] Receive PASS report
- [ ] Remediate any findings (usually CVSS <4.0)

---

## G7 — External Penetration Test (CREST-certified)

**What:** Engage a CREST-certified pen-test firm to do a full security assessment.
**Why:** Independent third-party validation before live launch with real money.
**Who:** You (founder) + vendor (from shortlist).
**Brief:** `docs/ops/OWNER_ACTION_G7_PENTEST.md` + `PEN_TEST_VENDOR_SHORTLIST.md`
**Blocker for:** Phase 6 (TASK-0045)
**Estimated effort:** 2-3 weeks (vendor engagement + test + report + triage)
**Estimated cost:** USD 8,000-25,000

### Sub-steps

- [ ] Choose vendor from `PEN_TEST_VENDOR_SHORTLIST.md` (3 candidates pre-screened)
- [ ] Sign NDA + scope agreement (scope defined in Phase 6 of MARKETPLACE_HARDENING_PLAN.md)
- [ ] Provide: test environment access, test accounts, scope boundaries
- [ ] Run pen test (typically 1-2 weeks active testing)
- [ ] Receive report (Critical/High/Medium/Low findings)
- [ ] Engineering triages findings (TASK-0045 Phase 6.3)
- [ ] Fix Critical/High before launch

---

## G8 — KSA Hosting Decision

**What:** Decide: launch on current Dubai-region hosting vs wait for KSA-region.
**Why:** SDAIA (Saudi Data & AI Authority) requires KSA data residency for many categories of data. Tabby's terms may also prefer KSA region.
**Who:** You (founder) + infrastructure consultant.
**Brief:** `docs/ops/OWNER_ACTION_G8_KSA_HOSTING.md`
**Blocker for:** Phase 5
**Estimated effort:** 1-2 weeks (decision + procurement)
**Estimated cost:** +30-50% hosting costs if moving to KSA region

### Sub-steps

- [ ] Review current hosting (Dubai vs other) and cost
- [ ] Get quotes from KSA-region providers (SDAIA-accredited): STC Cloud, Mobily, etc.
- [ ] Decide: launch-now Dubai vs wait KSA
- [ ] If KSA: plan migration (DB replication, DNS cutover, etc.)
- [ ] Update infra docs

---

## G9 — Tabby Data Processing Agreement (DPA)

**What:** Sign the DPA with Tabby (cross-border data processing).
**Why:** PDPL requires DPAs with any third party processing Saudi personal data, even if Tabby is UAE-based.
**Who:** You + Tabby's legal team.
**Brief:** `docs/ops/OWNER_ACTION_G9_TABBY_DPA.md`
**Blocker for:** Phase 5
**Estimated effort:** 1-4 weeks
**Estimated cost:** SAR 0 (Tabby covers legal fees)

### Sub-steps

- [ ] Contact Tabby merchant support: https://tabby.ai/business
- [ ] Request their standard DPA
- [ ] Have lawyer review (especially cross-border data flow clauses)
- [ ] Sign + return
- [ ] Store signed copy in `docs/compliance/tabby-dpa.pdf`

---

## G10 — Disaster Recovery Plan (DR)

**What:** Document + test a DR procedure (NCA Essential Cybersecurity Controls).
**Why:** NCA (National Cybersecurity Authority) requires documented DR for any business handling personal data at scale.
**Who:** You + engineering (engineering provides technical content, you sign off).
**Brief:** `docs/ops/OWNER_ACTION_G10_DR_PLAN.md`
**Blocker for:** Phase 5 + Phase 6
**Estimated effort:** 2-3 weeks
**Estimated cost:** SAR 0 (engineering time) + potentially SAR 5000+ for tabletop exercise facilitator

### Sub-steps

- [ ] Engineering drafts `docs/ops/DR_PLAN.md` template (RTO/RPO targets)
- [ ] Document backup procedures (database, file storage)
- [ ] Document failover procedure (multi-region?)
- [ ] Run tabletop exercise (simulate failure + recovery)
- [ ] Sign off as founder
- [ ] Schedule annual DR drill

---

## When to update this file

After completing each gate:

1. Open this file
2. Change ⏳ to ✅ next to the gate name
3. Add the date + any key details under the gate
4. Update the progress counter at the top

Engineering will automatically unblock Phase 5 (TASK-0044) once all 10 are ✅.

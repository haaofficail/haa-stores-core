# G4 — DPO Appointment Checklist

> **Owner action required.** G4 of TASK-0038. **Required by PDPL Article 22**.

## What is a DPO?

**Data Protection Officer** (مسؤول حماية البيانات الشخصية) is required by **PDPL** (Personal Data Protection Law, Saudi Arabia) for any organization that processes personal data at scale. The DPO is the public-facing person accountable for data privacy.

For Haa: required because we process customer PII (name, phone, address, payment info).

## Prerequisites

- [ ] **G1 CR received** (DPO must be employed by a legal entity)
- [ ] **Legal team or external counsel** to define DPO scope

## Options for appointment

| Option | Pros | Cons | Cost |
|--------|------|------|------|
| **Internal hire** (full-time DPO) | Full control, deep product knowledge | SAR 15-30k/month salary, hard to recruit | High |
| **Part-time internal** (e.g., CTO with DPO duties) | Cost-effective for early-stage | Conflicts of interest if CTO is engineering | Medium |
| **Outsourced DPO** (external consultant) | No employment overhead, specialized | Less product knowledge | SAR 5-15k/month |
| **Shared DPO** (fractional across companies) | Lowest cost | Less attention to your data | SAR 2-5k/month |

**Recommendation for early-stage Haa:** Outsourced or shared DPO for the first 6 months, then internal hire as scale grows.

## Appointment steps

### Step 1: Define DPO scope (1-2 days)

Document the DPO's responsibilities:
- [ ] Privacy impact assessments
- [ ] PDPL complaint handling (Article 25)
- [ ] Data breach notification (Article 17 — 72h to SDAIA, 30d to subjects)
- [ ] Privacy policy review + updates
- [ ] Internal privacy training
- [ ] DPO contact for data subjects (`dpo@haastores.sa`)

### Step 2: Appoint (1 day)

- Sign DPO agreement (responsibilities + liability)
- Update `docs/PRIVACY_POLICY.md` header with DPO contact
- Update Haa platform footer: "Data Protection Officer: dpo@haastores.sa"
- Update `docs/SFDA_DISCLAIMER.md` contact section

### Step 3: Public contact (immediate)

- Add `dpo@haastores.sa` to PRIVACY_POLICY header
- Add to Haa platform footer
- Add to incident response runbook
- Reply to PDPL complaints within 30 days (Article 25)

## Cost

| Option | Monthly cost |
|--------|-------------|
| Internal FTE DPO | SAR 15-30k |
| Outsourced DPO firm | SAR 5-15k |
| Shared DPO | SAR 2-5k |

## Timeline: 1-2 weeks

## Engineering integration (30 min)

- Add DPO contact to `tenants.dpo_email` + `tenants.dpo_phone`
- Update PRIVACY_POLICY.md header (replace placeholder)
- Update Haa platform footer
- Add DPO email to mail relay

## References

- PDPL: https://sdaia.gov.sa/Arabic/pages/policiesAndRegulations.aspx
- PDPL Article 22 (DPO requirement)
- PDPL Article 25 (data subject rights + complaint handling)

---

**Last Updated:** 2026-06-17 (TASK-0038 G4 brief)
**Owner Action:** Appoint DPO (internal or outsourced)
**Engineering Effort:** 30 min schema + footer update

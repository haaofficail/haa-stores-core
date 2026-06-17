# G9 — Tabby DPA Checklist

> **Owner action required.** G9 of TASK-0038. **Depends on G1 (CR)**.

## What is a DPA?

**Data Processing Agreement** (DPA) is a legal contract between two parties that defines how personal data is processed, stored, and protected. Required under **PDPL Article 25** when one entity processes personal data on behalf of another.

For Haa ↔ Tabby: Haa processes customer data that flows through Tabby's BNPL (Buy Now Pay Later) integration. Tabby requires a DPA to comply with PDPL.

## Prerequisites

- [ ] **G1 CR received** (both Haa AND Tabby need to be legal entities)
- [ ] **Tabby integration** already deployed (Tabby is in our payment provider list per `packages/payment-providers/`)
- [ ] **Legal counsel** to review the DPA terms

## DPA process (2-4 weeks)

### Step 1: Tabby's DPA template (1 week)

1. Contact Tabby's legal team via your account manager
2. Request their **standard DPA template** (most BNPL providers have one ready)
3. Tabby typically sends within 2-5 business days

### Step 2: Legal review (1-2 weeks)

- Send Tabby's DPA to your lawyer
- Review focus areas:
  - Data shared (name, phone, order amount — NOT card data, Tabby handles that)
  - Data residency (where each party stores data)
  - Breach notification timelines (typically 72h)
  - Audit rights (can Tabby audit your data handling?)
  - Sub-processors (who can each party share data with)
  - Termination (what happens to data after contract ends)

### Step 3: Negotiate + sign (1 week)

- Most BNPL DPAs are standard — minimal negotiation needed
- Common tweaks:
  - Data residency requirements (match Tabby's actual hosting region)
  - Breach notification timeline (typically 24-72h is industry standard)
  - Audit frequency (annual is typical)

### Step 4: Implementation (2-3 days)

- Update privacy policy to mention Tabby as a sub-processor
- Update Tabby integration to log data flows
- Set up breach notification alerts
- Update Haa's data retention policy (if Tabby requires it)

## Cost

- **Tabby's legal fees:** absorbed by Tabby (you're the smaller party)
- **Your lawyer's review fee:** SAR 3,000-10,000 (one-time)

## Timeline: 2-4 weeks

## Engineering integration (1-2 hours)

- Add `data_processing_agreements` table (vendor_id, signed_at, dpa_url)
- Update Tabby integration to log data flows to this table
- Add breach notification webhook + alert
- Update PRIVACY_POLICY.md to mention Tabby as a sub-processor

## Common pitfalls

- ❌ **Using Tabby's payment integration without a DPA** — PDPL violation, Tabby won't refund fraudulent orders
- ❌ **Storing Tabby's customer data beyond needed retention** — Tabby may require deletion
- ❌ **Sharing Tabby's customer data with third parties (analytics, marketing)** — Tabby's DPA typically prohibits this

## References

- Tabby DPA template: contact Tabby account manager
- PDPL Article 25 (data subject rights + DPA requirements)
- Tabby PDPL compliance: https://tabby.ai/privacy

---

**Last Updated:** 2026-06-17 (TASK-0038 G9 brief)
**Owner Action:** Request DPA from Tabby after G1
**Engineering Effort:** 1-2 hours (DPA tracking + breach alerts)

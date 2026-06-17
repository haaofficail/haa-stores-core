# G8 — KSA Hosting Decision Checklist

> **Owner action required.** G8 of TASK-0038. **Strategic decision, not strictly required**.

## What's the decision?

Haa is currently hosted in a **non-KSA region** (likely AWS Dublin/Frankfurt/US). The decision: **stay in non-KSA OR migrate to KSA**.

## Why consider KSA hosting?

**Pros:**
- **Data residency:** Some KSA regulations (especially financial data) require local storage
- **Latency:** Lower latency for KSA users (50-100ms vs 200-300ms from EU)
- **Local payment integration:** Easier integration with SAMA-regulated gateways
- **Government relationships:** Better positioning for government contracts

**Cons:**
- **Cost:** KSA data centers (e.g., STC, Mobily) are 2-3x more expensive than AWS
- **Maturity:** KSA cloud providers less mature than AWS/Azure
- **Compliance overhead:** Local certifications + audits

## Options

### Option A: Stay in current region (default — recommended for MVP)

- **Provider:** AWS / Azure / GCP current region
- **Cost:** Same as now (~$200-500/month)
- **Latency:** 200-300ms (acceptable for MVP)
- **Compliance:** Adequate for early-stage (SAMA + NCA don't enforce KSA hosting for non-financial SaaS yet)
- **Plan:** Migrate to KSA only if SAMA regulations require it OR latency becomes a complaint

### Option B: Migrate to KSA region (e.g., AWS me-central-1, STC Cloud)

- **Provider:** AWS Middle East (Bahrain/UAE) OR STC Cloud (Riyadh)
- **Cost:** 2-3x current (~$500-1500/month)
- **Latency:** 50-100ms
- **Compliance:** Full KSA data residency
- **Plan:** 4-8 weeks migration effort (downtime + DNS + DB restore + testing)

### Option C: Hybrid (recommended long-term)

- **Setup:** Production in KSA region, dev/staging in current region
- **Cost:** 2-3x current + dev costs
- **Best of both:** Local for users, cheap for development

## Recommendation for Haa

**For MVP launch (now):** Stay in current region. KSA hosting is a future optimization, not a launch blocker.

**After pen-test + first 100 merchants:** Re-evaluate based on:
- Latency complaints from cohort merchants
- KSA data residency requirements (if any)
- Cost-benefit (is the cost worth the latency gain?)

## Decision matrix

| Criterion | Option A (Stay) | Option B (Migrate) |
|-----------|----------------|-------------------|
| Cost | Low | High |
| Latency | Acceptable | Excellent |
| Compliance | Adequate for MVP | Full |
| Migration risk | None | High |
| Time to benefit | Immediate | 4-8 weeks |

## Engineering effort (if migration chosen)

- 2-4 weeks: Database migration + testing
- 1-2 weeks: DNS + TLS certificate migration
- 1 week: Monitoring + observability in new region
- 1 week: Rollback plan + dry run

## Cost

| Option | Monthly cost (SAR) |
|--------|------------------|
| A: Stay | ~1,000-2,000 |
| B: Migrate to KSA | ~3,000-7,000 |
| C: Hybrid | ~3,500-7,500 |

## Timeline

- **Decision now:** Recommended **Option A** for MVP launch
- **Re-evaluation:** After T+30 soft-launch OR at 100+ merchants

## References

- AWS Middle East: https://aws.amazon.com/about-aws/global-infrastructure/regions_az/
- STC Cloud: https://cloud.stc.com.sa/
- Mobily Cloud: https://mobily.com.sa/business/cloud
- SAMA Cloud Computing Framework: https://sama.gov.sa/

---

**Last Updated:** 2026-06-17 (TASK-0038 G8 brief)
**Owner Action:** Decide Option A (stay) for MVP, re-evaluate post-launch
**Engineering Effort:** 0 if Option A; 4-8 weeks if Option B chosen

# Production Launch Gates — single-page truth

> **Status:** Tracking only. Engineering-side blockers are listed
> alongside owner-side gates. Update when each gate flips.
> **Source of truth:** This file is the single page an operator
> reads to know "what is blocking production launch right now?"
> The detailed playbooks live in `docs/ops/*` (see Cross-references).

---

## Server decision

- **Staging server:** `72.61.108.208` (official Haa Stores host).
- **Production server:** SAME `72.61.108.208` after readiness audit
  - explicit owner approval (DECISION-OS-007).
- **Forbidden:** `187.124.41.239` (Nasaq / Haa Soft project — separate
  ownership). Never propose this VPS for Haa Stores.
- **Forbidden domains:** `nasaqpro.tech`, `tarmizos.com`, `haasoft.com`.
- **Forbidden SSH key:** `nasaq_deploy`.

## DNS

- **Manager:** Cloudflare (DECISION-OS-008). Hostinger may stay as
  registrar/mail only.
- **MX / SPF / DKIM / DMARC:** must be preserved for `hello@haastores.com`.
- **NOT YET DONE:** Cloudflare DNS for `haastores.com` is not configured
  in this account (memory: `haastores-dns-not-in-hostinger`). Owner
  must confirm DNS provider + transfer if needed.
- **DO NOT** enable Cloudflare proxy on webhook endpoints if it breaks
  HMAC headers / Geidea / Tabby / Tamara signatures.

## Production secrets

| Secret                                           | Status             | Source                                         |
| ------------------------------------------------ | ------------------ | ---------------------------------------------- |
| `JWT_SECRET`                                     | ❌ not provisioned | Owner — generate via `openssl rand -base64 48` |
| `ADMIN_JWT_SECRET`                               | ❌ not provisioned | Owner — generate separately                    |
| `ENCRYPTION_KEY`                                 | ❌ not provisioned | Owner — 32-byte minimum                        |
| `DATABASE_URL`                                   | ❌ not provisioned | Owner — production Postgres URL                |
| `REDIS_URL`                                      | ❌ not provisioned | Owner                                          |
| `QUEUE_REDIS_URL`                                | ❌ not provisioned | Owner                                          |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASSWORD`      | ✅ staging         | Hostinger smtp.hostinger.com                   |
| `SENTRY_DSN`                                     | ❌ not provisioned | Owner — create Sentry project                  |
| `GEIDEA_*`                                       | ❌ not provisioned | Owner gate G2 (VAT) → G6 PCI-DSS               |
| `OTO_*` (or chosen aggregator)                   | ❌ not provisioned | Owner — aggregator name + creds                |
| `STORAGE_DRIVER=s3` + `S3_*`                     | ❌ not provisioned | Owner — R2 / S3 + bucket                       |
| `CDN_PUBLIC_BASE_URL`                            | ❌ not provisioned | Owner                                          |
| `STAGING_KNOWN_HOSTS` / `PRODUCTION_KNOWN_HOSTS` | ⚠️ staging only    | Owner runs `ssh-keyscan -H <host>` once        |

## Owner Gates (G1–G10)

Source: `docs/HAA_TASK_LEDGER.md` § Owner Gates.

| Gate   | Description                   | Status                                                                          |
| ------ | ----------------------------- | ------------------------------------------------------------------------------- |
| **G1** | Commercial Registration (CR)  | ✅ provided 2026-06-24 — مؤسسة حرف الهاء التجارية, CR `7038798612`              |
| G2     | VAT / ZATCA enrollment        | ⏳ owner action                                                                 |
| G3     | E-commerce license (SBC)      | 🟨 owner states license exists 2026-06-28; license number/copy pending evidence |
| G4     | DPO (Data Protection Officer) | ⏳ owner action                                                                 |
| G5     | Trademark filing              | ⏳ owner action                                                                 |
| G6     | PCI-DSS ASV scan              | ⏳ depends on G1                                                                |
| G7     | Pen-test                      | ⏳ owner action                                                                 |
| G8     | KSA hosting compliance        | ⏳ owner action                                                                 |
| G9     | Tabby/BNPL DPA                | ⏳ depends on G1                                                                |
| G10    | DR tabletop                   | ⏳ owner action                                                                 |

## Engineering-side blockers (NONE are owner-gated)

| Item                                | Status                                            | Action                                                         |
| ----------------------------------- | ------------------------------------------------- | -------------------------------------------------------------- |
| Migration 0073 (wallet idempotency) | ⏳ file ready, NOT applied                        | Owner runs `ops-staging-migrate` then `ops-production-migrate` |
| Sentry wiring                       | ❌ depends on DSN                                 | After G+monitoring decision                                    |
| Backup automation                   | ⏳ snapshot-on-migrate only                       | Schedule nightly `pg_dump` cron                                |
| Restore drill                       | ⏳ tied to G10                                    | Owner schedules tabletop                                       |
| Production deploy runbook           | ✅ exists at `docs/ops/PHASE_5_DEPLOY_RUNBOOK.md` | Test once production env is up                                 |
| Post-deploy smoke gate              | ⏳ manual today                                   | Wire into `deploy.yml` post-deploy step                        |

## Beta merchants

- **Target:** 3 named beta merchants confirmed by owner (G unrelated).
- **Status:** 0 merchants identified.
- **Owner action:** Identify + onboard.

## Sandbox preparation

- **Owner posture:** Sandbox preparation requested on 2026-06-28.
- **Allowed now:** sandbox checklist, local/staging rehearsal design,
  fake-provider and sandbox-provider test planning, and non-secret setup docs.
- **Current checklist:** `docs/ops/SANDBOX_REHEARSAL_CHECKLIST.md`.
- **Still forbidden:** live payment calls, live shipping calls, production
  deploy, production `db:migrate`, secret printing, and production DNS/server
  changes.

## Launch sequence (do NOT execute until every blocker above is ✅)

1. Owner provides all production secrets → `ops-staging-env` for each,
   per the allow-list in that workflow.
2. Owner runs `ops-staging-migrate` to apply migration 0073 on staging
   - smokes the wallet flow.
3. Owner provisions production Postgres + Redis + S3/R2.
4. Engineering provisions production deploy environment in GitHub
   (production env protection + secrets).
5. Owner triggers `Deploy` workflow with `environment=production`.
6. Post-deploy smoke + Sentry alarm thresholds verified.
7. Beta merchants onboarded.
8. 7-day burn-in before opening signup beyond the 3 betas.

## Cross-references

- `docs/HAA_TASK_LEDGER.md` — task-level dashboard.
- `docs/ops/PRODUCTION_READINESS_CHECKLIST.md` — line-item checklist.
- `docs/ops/BETA_LAUNCH_CHECKLIST.md` — beta-specific gates.
- `docs/ops/BETA_LAUNCH_TECHNICAL_CHECKLIST.md` — engineering side.
- `docs/ops/PHASE_5_DEPLOY_RUNBOOK.md` — step-by-step deploy commands.
- `docs/ops/OWNER_ACTION_G{1..10}_*.md` — per-gate owner playbooks.

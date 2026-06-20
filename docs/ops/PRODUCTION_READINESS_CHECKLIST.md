# Production Readiness Checklist — Haa Stores

> Branch: `feature/production-readiness-geidea-shipping`
> Date: 2026-06-20
> Status: **STAGING COMPLETE — PRODUCTION PENDING CREDENTIALS**

## Legend

- ✅ Done (code shipped and verified)
- 🔑 Blocked on credentials / keys
- ⏳ Pending human action
- ❌ Not started

---

## 1. Infrastructure

| #   | Check                                          | Status | Notes                                                                              |
| --- | ---------------------------------------------- | ------ | ---------------------------------------------------------------------------------- |
| 1.1 | Staging server provisioned                     | ✅     | `72.61.108.208` — srv1769872                                                       |
| 1.2 | Staging DNS resolved                           | ✅     | `staging.haastores.com`, `admin.staging.*`, `merchant.staging.*` → `72.61.108.208` |
| 1.3 | Staging TLS certs (Let's Encrypt)              | ✅     | Caddy auto-issued via ACME                                                         |
| 1.4 | SSH hardened (deploy user, root blocked)       | ✅     | `deploy` user, `PermitRootLogin no`                                                |
| 1.5 | Production server provisioned                  | ⏳     | Promote `72.61.108.208` OR provision dedicated server                              |
| 1.6 | Production DNS records                         | ⏳     | Point `haastores.com`, `admin.*`, `merchant.*` at prod server                      |
| 1.7 | Production TLS                                 | ⏳     | Will auto-provision on first Caddy start after DNS                                 |
| 1.8 | `deploy/production/docker-compose.yml` created | ✅     | Mirrors staging; no MinIO; Redis password-protected                                |
| 1.9 | `deploy/production/Caddyfile` created          | ✅     | HSTS headers, www redirect                                                         |

---

## 2. Secrets & Environment

| #   | Check                                        | Status | Notes                                             |
| --- | -------------------------------------------- | ------ | ------------------------------------------------- |
| 2.1 | `deploy/production/.env.example` created     | ✅     | All keys documented                               |
| 2.2 | Production `.env` on server (actual secrets) | ⏳     | Owner must create from example                    |
| 2.3 | `JWT_SECRET` (not dev default, ≥32 chars)    | ⏳     | `openssl rand -hex 32`                            |
| 2.4 | `ADMIN_JWT_SECRET` (not dev default)         | ⏳     | `openssl rand -hex 32`                            |
| 2.5 | `ENCRYPTION_KEY` (not dev default, 32 bytes) | ⏳     | `openssl rand -hex 32`                            |
| 2.6 | `DATABASE_URL` pointing to prod DB           | ⏳     |                                                   |
| 2.7 | `REDIS_URL` with `REDIS_PASSWORD`            | ⏳     | Redis configured with `requirepass`               |
| 2.8 | GitHub env `production` secrets set          | ⏳     | See §6 GitHub Actions                             |
| 2.9 | `deploy/production/.env` gitignored          | ✅     | Pattern: `deploy/production/.env` in `.gitignore` |

---

## 3. Payment: Geidea

> See [GEIDEA_PAYMENT_READINESS.md](./GEIDEA_PAYMENT_READINESS.md) for full detail.

| #    | Check                                             | Status | Notes                                                    |
| ---- | ------------------------------------------------- | ------ | -------------------------------------------------------- |
| 3.1  | `GeideaPaymentProvider` implemented               | ✅     | `packages/payment-providers/src/geidea.ts`               |
| 3.2  | HMAC-SHA256 signature helper                      | ✅     | `createGeideaSignature()` in `base.ts`                   |
| 3.3  | Webhook verification                              | ✅     | `verifyGeideaCallbackSignature()`                        |
| 3.4  | 3DS flow support                                  | ✅     | Implemented                                              |
| 3.5  | `PAYMENT_PROVIDER=fake` blocked in production     | ✅     | `env.ts` guardrail added                                 |
| 3.6  | `PAYMENT_PROVIDER=geidea` requires keys           | ✅     | `env.ts` guardrail: both keys required                   |
| 3.7  | `PAYMENT_MODE=live` unblocked                     | 🔑     | Factory throws until Geidea live key received            |
| 3.8  | Geidea sandbox credentials configured             | 🔑     | Add `GEIDEA_MERCHANT_PUBLIC_KEY` + `GEIDEA_API_PASSWORD` |
| 3.9  | Geidea live credentials configured                | 🔑     | Requires Geidea merchant contract                        |
| 3.10 | Geidea callback/webhook URLs registered in portal | ⏳     | Post-deploy                                              |
| 3.11 | Payment flow tested end-to-end in sandbox         | ⏳     | Pre-launch                                               |
| 3.12 | Refund flow confirmed with Geidea support         | ⏳     | `refundPayment()` is stubbed                             |

---

## 4. Shipping: OTO

> See [SHIPPING_AGGREGATOR_READINESS.md](./SHIPPING_AGGREGATOR_READINESS.md) for full detail.

| #   | Check                                       | Status | Notes                                      |
| --- | ------------------------------------------- | ------ | ------------------------------------------ |
| 4.1 | `OtoShippingProvider` implemented           | ✅     | `packages/shipping-core/src/oto.ts`        |
| 4.2 | Webhook verification                        | ✅     | `OTO_WEBHOOK_SECRET` support               |
| 4.3 | `SHIPPING_PROVIDER=oto` requires credential | ✅     | `env.ts` guardrail added                   |
| 4.4 | `SHIPPING_MODE=live` unblocked              | 🔑     | Factory throws until OTO live key received |
| 4.5 | OTO sandbox credentials configured          | 🔑     | Add `OTO_SANDBOX_API_KEY`                  |
| 4.6 | OTO live credentials configured             | 🔑     | Requires OTO merchant account              |
| 4.7 | Shipping rates flow tested in sandbox       | ⏳     | Pre-launch                                 |
| 4.8 | Shipment creation + tracking tested         | ⏳     | Pre-launch                                 |
| 4.9 | Webhook events verified                     | ⏳     | Post-deploy                                |

---

## 5. Storage

| #   | Check                                            | Status | Notes                         |
| --- | ------------------------------------------------ | ------ | ----------------------------- |
| 5.1 | `STORAGE_DRIVER=local` rejected in production    | ✅     | `loadEnv()` throws            |
| 5.2 | Cloudflare R2 bucket created                     | ⏳     | Bucket: `haa-stores-prod`     |
| 5.3 | R2 API credentials generated                     | ⏳     | Add to production `.env`      |
| 5.4 | `CDN_PUBLIC_BASE_URL` points to R2 public domain | ⏳     | Configure custom domain on R2 |

---

## 6. GitHub Actions

| #   | Check                                      | Status | Notes                                                    |
| --- | ------------------------------------------ | ------ | -------------------------------------------------------- |
| 6.1 | `staging` environment configured           | ✅     | `STAGING_HOST`, `STAGING_USER=deploy`, `STAGING_SSH_KEY` |
| 6.2 | `production` environment created in GitHub | ⏳     | Add protection rules (required reviewers)                |
| 6.3 | `PRODUCTION_HOST` secret set               | ⏳     |                                                          |
| 6.4 | `PRODUCTION_USER` secret set               | ⏳     | e.g. `deploy`                                            |
| 6.5 | `PRODUCTION_SSH_KEY` secret set            | ⏳     | `haa_production_deploy` key                              |
| 6.6 | Deploy workflow `deploy-production` job    | ⏳     | Mirror of `deploy-staging` job                           |

---

## 7. Observability

| #   | Check                              | Status | Notes                                      |
| --- | ---------------------------------- | ------ | ------------------------------------------ |
| 7.1 | Sentry project for production      | ⏳     |                                            |
| 7.2 | `SENTRY_DSN` set in production env | ⏳     |                                            |
| 7.3 | OTEL endpoint configured           | ⏳     |                                            |
| 7.4 | Log level = `info` in production   | ✅     | `env.ts` defaults to `info` for production |

---

## 8. Testing

| #   | Check                           | Status | Notes                                            |
| --- | ------------------------------- | ------ | ------------------------------------------------ |
| 8.1 | Production guardrail tests      | ✅     | `tests/production-guardrails.test.ts`            |
| 8.2 | Geidea unit tests               | ✅     | `tests/geidea-settlement-reconciliation.test.ts` |
| 8.3 | CI typecheck passes             | ⏳     | Run `pnpm typecheck`                             |
| 8.4 | All tests green before PR merge | ⏳     |                                                  |

---

## Go-Live Gate (final checklist before first production deploy)

- [ ] All ✅ items in §1–8 complete
- [ ] Production `.env` reviewed by owner
- [ ] Geidea sandbox smoke test passed
- [ ] OTO sandbox smoke test passed
- [ ] GitHub `production` environment requires 1+ approver
- [ ] Database backup verified before first migration run
- [ ] Rollback plan documented (snapshot or pg_dump)
- [ ] Owner explicitly approves promotion of `72.61.108.208` to production role

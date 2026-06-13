# Staging Plan — هاء متاجر

> **Deployment Readiness Gate — 2026-06-07**

## الحالة: READY_FOR_STAGING_REQUEST

No Deploy Policy لا يزال مفعّلاً. هذا الملف خطة فقط. لا تنفيذ حتى GO صريح.

---

## Hosting

| Component | Option | Cost Estimate |
|-----------|--------|---------------|
| Compute | Fly.io (2 shared-CPU, 512MB) | ~$5.70/mo |
| Database | Fly Postgres (1 shared-CPU, 256MB) | ~$1.94/mo |
| Redis | Upstash (256MB) or Fly Redis | ~$3-5/mo |
| Object Storage | Cloudflare R2 (10GB) | Free tier |
| CDN | Cloudflare (proxy) | Free tier |
| **Total** | | **~$13/mo** |

## Domains (مقترحة)

| Service | Domain |
|---------|--------|
| API | `api.haastores.sa` |
| Merchant Dashboard | `merchant.haastores.sa` |
| Storefront | `*.haastores.sa` (wildcard or subdomain per store) |
| Admin Dashboard | `admin.haastores.sa` |

## Environment Variables

```
NODE_ENV=staging
DATABASE_URL=postgres://...
JWT_SECRET=<generated>
ENCRYPTION_KEY=<generated>
LOG_LEVEL=info
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=haa-stores-staging
S3_ACCESS_KEY_ID=<key>
S3_SECRET_ACCESS_KEY=<secret>
S3_PUBLIC_BASE_URL=https://cdn.haastores.sa
REDIS_URL=redis://...
PAYMENT_PROVIDER=moyasar
PAYMENT_MODE=sandbox
PAYMENT_SANDBOX_SECRET_KEY=<key>
PAYMENT_SANDBOX_PUBLIC_KEY=<key>
PAYMENT_WEBHOOK_SECRET=<generated>
SHIPPING_PROVIDER=manual
SHIPPING_MODE=manual
ADMIN_JWT_SECRET=<generated>
```

## Monitoring

- Health check: `GET /health`
- Logging: structured JSON logs
- Error tracking: ErrorMonitor (Sentry-ready)
- DB monitoring: Fly Postgres metrics
- Rate limiter: Redis (replace InMemory before Production)

## Backup Strategy

| Resource | Frequency | Tool |
|----------|-----------|------|
| Database | Daily | `pg_dump` / Fly snapshots |
| User files | Daily | R2 bucket replication |

## Smoke Checklist (قبل GO)

- [ ] API health check returns ok
- [ ] Merchant login works (ahmed@example.com)
- [ ] Products CRUD works
- [ ] Checkout and payment flows work
- [ ] Storefront loads and displays products
- [ ] Shipping methods configurable
- [ ] KYC form submit works
- [ ] Admin login works
- [ ] Subscriptions + plans load
- [ ] Notifications preferences save
- [ ] Migration templates download
- [ ] AI assistant responds

## Rollback Plan

1. `flyctl deploy --image <previous-version>`
2. Restore DB from latest backup: `pnpm db:restore <backup-file>`
3. Verify: `pnpm smoke`

## Launch Steps (تسلسل مقترح)

1. إنشاء حسابات Fly.io + Cloudflare + Upstash
2. Generate all secrets + env vars
3. Setup CI/CD (GitHub Actions → Fly.io)
4. Create Staging database + run migrations + seed
5. Deploy API + verify health
6. Deploy Storefront (static site to R2/Cloudflare Pages)
7. Deploy Merchant Dashboard (static)
8. Deploy Admin Dashboard (static)
9. Run smoke tests
10. Owner review + GO decision

## Security Pre-Staging Checklist

- [ ] No secrets in repository
- [ ] `.env.example` has no real keys
- [ ] Live payments blocked (PAYMENT_MODE=live rejected)
- [ ] Live shipping blocked (SHIPPING_MODE=live rejected)
- [ ] Webhook signatures verified
- [ ] Rate limiter active
- [ ] CORS restricted to staging domains
- [ ] Admin dashboard access restricted

## Notes

- Staging only. لا Production.
- Payment sandbox فقط. لا أموال حقيقية.
- Shipping manual/mock فقط. لا شركات شحن حقيقية.
- KYC review manual/placeholder.
- No real email/SMS/WhatsApp — notifications console only.

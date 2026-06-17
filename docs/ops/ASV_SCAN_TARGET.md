# PCI-DSS ASV Scan Target Configuration — TASK-0038 G6

> Engineering-side configuration for the quarterly PCI-DSS ASV
> (Approved Scanning Vendor) scan. Owner engages the ASV firm
> (G6 owner action) and provides them with this config.

## Scan Scope

### Public-facing hosts

| Host | Purpose | Notes |
|---|---|---|
| `haastores.sa` | Marketing landing | Public, no auth |
| `app.haastores.sa` | Storefront (customer) | Public, no auth |
| `merchants.haastores.sa` | Merchant dashboard | Public login endpoint |
| `admin.haastores.sa` | Admin dashboard | Public login endpoint |
| `api.haastores.sa` | API server | Public, requires API key |

### Endpoints to include in scan

- `GET /health` — health check
- `GET /marketplace/products` — public marketplace list
- `GET /marketplace/products/:storeSlug/:productSlug` — public product detail
- `GET /marketplace/stats` — public stats
- `GET /auth/me` — protected (ASV will test for IDOR)
- `POST /auth/login` — auth
- `POST /auth/register` — auth
- `POST /marketplace/orders` — order creation (ASV will test injection)
- `GET /s/:slug/p/:slug` — storefront product page

### Endpoints to EXCLUDE

- `POST /auth/login` — should NOT be brute-forced during ASV scan
  (rate limit will trigger and create noise). Coordinate with ASV
  firm to use a separate scan user.
- `POST /admin/login` — same as above
- `POST /webhooks/*` — external integrations (Tabby, Tamara, etc.)
  should not be tested as part of public-facing scan
- `GET /internal/*` — internal-only, should not be exposed externally

## Pre-Scan Verification

Run these checks before the ASV firm starts their scan:

```bash
# 1. Verify the production deployment is stable
pnpm ops:health

# 2. Run the pre-pentest smoke test
pnpm preflight:pentest

# 3. Verify security headers are in place
curl -I https://api.haastores.sa/health | grep -E "^(Strict-Transport-Security|X-Frame-Options|X-Content-Type-Options|Content-Security-Policy|Referrer-Policy)"

# 4. Verify TLS configuration (1.2+ only, strong ciphers)
nmap --script ssl-enum-ciphers -p 443 api.haastores.sa
```

## Known Defenses (so ASV firm doesn't waste cycles)

- **SQL injection:** Drizzle ORM with parameterized queries throughout
- **XSS:** React's auto-escaping + CSP headers
- **CSRF:** SameSite cookies + double-submit token pattern
- **Rate limiting:** 30 req/min on auth, 100 req/min on public reads
- **TLS:** TLS 1.2+ only
- **HSTS:** enabled via `Strict-Transport-Security` header
- **Account lockout:** 5 failed login attempts → 15-min lockout

## Expected Findings (with remediation)

| Finding | Severity | Remediation |
|---|---|---|
| `Server: Hono` header exposed | Low | Set `X-Powered-By: haa-stores` or remove |
| `X-Powered-By: Hono` exposed | Low | Set to generic value |
| Missing CSP header on /health | Informational | CSP only on HTML routes |
| HTTP/2 not enabled | Informational | Infrastructure-level, not app |
| TLS 1.0/1.1 negotiation | Medium | Already disabled (TLS 1.2+) |

## Post-Scan Process

1. ASV firm sends report (PDF + XML) within 5-10 business days
2. Engineering triages findings using `docs/ops/PEN_TEST_TRIAGE_TEMPLATE.md`
3. Critical/High findings fixed within 30 days
4. Re-scan to confirm remediation
5. ASV certificate stored in `tenants.asvCertificateUrl` (migration 0061)
6. Update `docs/ops/CURRENT_STATE.md` with scan date + status

## ASV Vendor Shortlist

See `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` for the existing 5
candidates. For ASV specifically, ensure the vendor is on the PCI
SSC list of Approved Scanning Vendors:
https://www.pcisecuritystandards.org/assessors_and_solutions/approved_scanning_vendors

## Cost & Cadence

- **Cost:** SAR 5,000-15,000 per scan
- **Cadence:** Quarterly (4 per year)
- **First scan:** Before public launch

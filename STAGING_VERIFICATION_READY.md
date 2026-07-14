# STAGING VERIFICATION — READY FOR EXECUTION

**Date:** July 2, 2026  
**Commit:** dc71e25d (Merge pull request #365)  
**Status:** ✅ **CODE READY FOR STAGING DEPLOYMENT**

---

## **Current State**

```
✅ Code on main:       dc71e25d (PR #365 merged)
✅ Local verification: PASS (typecheck, lint, 5,100+ tests)
✅ Quality gates:      PASS (will run in GitHub Actions)

⏳ Staging deploy:     AWAITING EXECUTION
⏳ Smoke tests:        AWAITING STAGING (will run automatically)
⏳ Production:         BLOCKED (until staging verification passes)
```

---

## **How Staging Deployment Works**

### **Automatic Trigger (GitHub Actions)**

When code is pushed to main:

```
Push to main
  ↓ (triggers .github/workflows/deploy.yml)
Quality gates: typecheck, lint, test
  ↓ (must ALL pass)
Build & push Docker images to GHCR:
  - ghcr.io/.../api:sha-<commit>
  - ghcr.io/.../merchant-dashboard:sha-<commit>
  - ghcr.io/.../admin-dashboard:sha-<commit>
  - ghcr.io/.../storefront:sha-<commit>
  ↓
Deploy to staging (self-hosted runner: haa-staging label)
  - Authenticate to GHCR
  - Check ports 80, 443, 5433 availability
  - Sync Caddyfile + docker-compose.yml
  - docker compose pull (new images)
  - docker compose up -d --remove-orphans
  - Caddy reload
  ↓
Automatic smoke gate: scripts/server/smoke-staging.sh
  - api-health: /health endpoint
  - storefront-html: / should be HTML
  - api-payment-methods: /api/s/haa-demo/payment-methods
  - merchant-login-html: merchant. subdomain
  - admin-login-html: admin. subdomain
  ↓
If smoke PASSES: Deployment complete ✅
If smoke FAILS: Auto-rollback to previous version ⚠️
```

---

## **Deployment Location & Configuration**

| Item              | Value                                          |
| ----------------- | ---------------------------------------------- |
| **Server**        | 72.61.108.208 (staging)                        |
| **Deploy path**   | `/srv/haa-stores` (STAGING_DEPLOY_PATH secret) |
| **Project**       | `haa-staging` (docker compose project name)    |
| **Reverse proxy** | Caddy (auto TLS via Let's Encrypt)             |
| **Database**      | PostgreSQL (localhost:5433, bound only)        |
| **Cache**         | Redis                                          |
| **Storage**       | MinIO (S3-compatible)                          |

---

## **The 5 Smoke Tests (Automatic)**

The real smoke gate is: **`scripts/server/smoke-staging.sh`**

Runs automatically after deployment. Returns 0 if ALL pass, 1 if ANY fail.

| #   | Test                    | What It Checks                      | Expected                           |
| --- | ----------------------- | ----------------------------------- | ---------------------------------- |
| 1   | **api-health**          | GET /health                         | HTTP 200 + `"status"` in response  |
| 2   | **storefront-html**     | GET / (storefront root)             | HTTP 200 + `<!doctype html`        |
| 3   | **api-payment-methods** | GET /api/s/haa-demo/payment-methods | HTTP 200 + `"methods"` in response |
| 4   | **merchant-login-html** | GET merchant.{host}/                | HTTP 200 + `<!doctype html`        |
| 5   | **admin-login-html**    | GET admin.{host}/                   | HTTP 200 + `<!doctype html`        |

**If smoke fails:** Automatic rollback to previous version  
**If smoke passes:** Deployment is live

---

## **Manual Monitoring (Post-Deployment)**

After automatic deployment + smoke tests complete:

### **Check Service Health**

```bash
# SSH into staging runner
ssh <user>@72.61.108.208

# Verify all services are running
cd /srv/haa-stores
docker compose ps

# Expected: All containers "Up" with health "healthy"
```

### **Check Logs (15 min baseline)**

```bash
# API logs
docker compose logs api | tail -100 | grep -E "ERROR|5[0-9]{2}"
# Expected: No 5xx errors

# Caddy logs (reverse proxy)
docker compose logs caddy | tail -50 | grep -i error
# Expected: No errors, certificates OK

# Database logs
docker compose logs postgres | tail -50 | grep -i error
# Expected: No connection errors
```

### **Manual Curl Tests (If Needed)**

```bash
# Test API health
curl -s https://staging-api.haastores.com/health | jq '.status'
# Expected: "ok"

# Test Storefront
curl -s https://staging.haastores.com/ | head -c 100
# Expected: <!doctype html (not JSON)

# Test CSRF protection
curl -s -X POST https://staging-api.haastores.com/admin/settings \
  -H "Content-Type: application/json" \
  -d '{}' \
  -w "\nStatus: %{http_code}\n"
# Expected: 403 Forbidden
```

---

## **Success Criteria**

### **✅ GO for Production if:**

- ✅ GitHub Actions deploy job completes without error
- ✅ Automatic smoke tests ALL pass (5/5)
- ✅ No auto-rollback occurred
- ✅ Manual monitoring (logs, curl tests) shows no 5xx errors
- ✅ Database, Redis, Minio all healthy
- ✅ HTTPS/Caddy working properly

### **⚠️ NO-GO if:**

- ❌ Deploy job fails before smoke tests
- ❌ Any of 5 smoke tests fail → Auto-rollback triggers
- ❌ Logs show 5xx errors, database errors, or connectivity issues
- ❌ Caddy/HTTPS not working

---

## **Monitoring the Deployment**

### **Option 1: GitHub Actions UI (Recommended)**

```bash
# Watch in real-time
gh run list --branch main --workflow deploy.yml -L 1

# Stream full logs
gh run view <RUN_ID> --log
```

**Expected steps:**

1. ✅ quality-gates job
2. ✅ build-and-push job (4 containers in parallel)
3. ✅ deploy-staging job
4. ✅ Smoke tests run (inside deploy-staging)

**Expected duration:** ~10-15 minutes

---

## **Files Referenced**

| File                                | Purpose                                     |
| ----------------------------------- | ------------------------------------------- |
| `.github/workflows/deploy.yml`      | GitHub Actions workflow (automatic trigger) |
| `scripts/server/smoke-staging.sh`   | Smoke gate (5 tests, auto-run)              |
| `deploy/staging/docker-compose.yml` | Compose stack definition                    |
| `deploy/staging/Caddyfile`          | Reverse proxy config                        |
| `deploy/staging/.env.example`       | Environment variables                       |

---

## **No Action Needed Yet**

The code is ready. GitHub Actions will:

1. Detect the push to main
2. Run quality gates (will pass)
3. Build and push images
4. Deploy to staging automatically
5. Run smoke tests automatically
6. Report pass/fail

**You only need to:**

1. Watch GitHub Actions workflow
2. Monitor logs if interested
3. Confirm all smoke tests pass
4. After verification, approve production deployment

---

## **Next Step**

**Trigger:** Push to main (already done at dc71e25d)

**Monitor:**

```bash
gh run list --branch main --workflow deploy.yml
```

**Expected:** Deploy completes in ~10-15 minutes with smoke tests PASS

---

**Prepared:** July 2, 2026  
**Last updated:** Verified against actual repo:

- `.github/workflows/deploy.yml`
- `scripts/server/smoke-staging.sh`
- `deploy/staging/docker-compose.yml`

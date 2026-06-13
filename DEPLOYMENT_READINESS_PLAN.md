# Deployment Readiness Plan — Haa Stores Core

**Status**: Local MVP Final Gate = PASS | P0A ✅ | P0B ✅ | P0B Review Gate ✅
**Prepared**: For staging deployment planning
**Note**: Plan only — no deployment has been executed.

> **⛔ قرار مؤجل: النشر مؤجل حتى اكتمال المنتج محليًا 100%.**
> المشروع سيبقى Local-only. لا Fly.io، لا R2 فعلي، لا دومينات، لا أسرار خارجية.
> انظر `docs/NO_DEPLOY_POLICY.md` و `docs/LOCAL_COMPLETION_ROADMAP.md`.

---

## Haa Stores Differentiation Strategy / استراتيجية تفوق هاء متاجر

> هدف هاء متاجر ليس نسخ سلة وزد بعدد المزايا، بل بناء منصة متاجر سعودية **أسهل وأوضح ماليًا وتشغيليًا**.

### الأولويات الأساسية (Stack Ranked)

| الأولوية | الوصف |
|:---------|-------|
| 1 | إطلاق متجر بسرعة |
| 2 | إدارة المنتجات والطلبات بسهولة |
| 3 | Checkout واضح ومختصر |
| 4 | شحن مفهوم وسهل |
| 5 | محفظة مالية دقيقة وواضحة |
| 6 | تجربة عربية سعودية ممتازة |

### قاعدة قرار المنتج

> إذا كانت الميزة لا تساعد التاجر على: إطلاق متجره **أسرع**، بيع منتجاته **أوضح**، إدارة طلباته **أسهل**، فهم أمواله **بدقة**، شحن طلباته **ببساطة**، تحسين تجربة عميله — **فهي تؤجل** ولا تدخل في الأولويات الحالية.

### خارطة التفوق — المراحل

| المرحلة | الحالة |
|---------|:------:|
| Local MVP | ✅ |
| P0A — Staging Security Foundation | ✅ |
| P0B — S3/R2 Storage Adapter | ✅ |
| P0C — Staging Environment Prep | ⛔ مؤجل |
| Staging Deploy | ⛔ مؤجل |
| Staging Review Gate | ⛔ مؤجل |
| LC2 — Dashboard Polish | ⬜ |
| LC3 — Storefront Polish | ⬜ |
| LC4 — Commerce Features | ⬜ |
| LC5 — Local Operations | ⬜ |
| LC6 — Local Full Product Gate | ⬜ |
| Demo Polish | ⬜ |
| Wallet Pro | ⬜ |
| Shipping Pro | ⬜ |
| Payment Integration | ⬜ |
| Saudi Commerce Experience | ⬜ |

> **⛔ النشر مؤجل.** المشروع سيبقى Local-only حتى اكتماله محليًا 100%.
> انظر `docs/LOCAL_COMPLETION_ROADMAP.md` و `docs/NO_DEPLOY_POLICY.md`.

---

## P0A — Staging Security Foundation: ✅ Complete

P0A includes: Error handling (centralized, no stack traces), Security headers, CORS (env-based), Rate limiting (in-memory), Secrets/env validation, Logging safety.
152 tests, 9 files, all passing. See `docs/STAGING_SECURITY.md` for details.

---

## 1. Deployment Target — Options Evaluation

### Option A: VPS + Docker Compose (Recommended)

| Criteria | Rating |
|----------|:------:|
| السهولة | ⭐⭐⭐ (سهل بعد الإعداد الأولي) |
| التكلفة | ⭐⭐  ($10–20/month VPS) |
| التحكم | ⭐⭐⭐⭐⭐ (كامل) |
| الأمان | ⭐⭐⭐⭐ (جيد مع الإعداد الصحيح) |
| قابلية التوسع | ⭐⭐⭐ (أفقيًا محدود، عموديًا ممكن) |
| المناسبة للمشروع | ✅ الأنسب لـ MVP مستقل |

**مكونات Docker Compose:**
- `api` service (node image, runs compiled JS)
- `nginx` service (reverse proxy, serve static files, SSL)
- `postgres` service (optional — could be managed)
- `minio` service (optional — for staging storage)

### Option B: VPS + PM2 + Nginx

| Criteria | Rating |
|----------|:------:|
| السهولة | ⭐⭐ (إعداد يدوي أكثر) |
| التكلفة | ⭐⭐ (نفس VPS) |
| التحكم | ⭐⭐⭐⭐⭐ (كامل) |
| الأمان | ⭐⭐⭐ (يدوي أكثر، خطأ بشري أكبر) |
| قابلية التوسع | ⭐⭐ |
| المناسبة للمشروع | ❌ غير مناسب — Docker يقلل التعقيد ويزيد الاتساق |

### Option C: Managed Platform (Render / Railway / Fly.io)

| Criteria | Rating |
|----------|:------:|
| السهولة | ⭐⭐⭐⭐⭐ (سريع جدًا) |
| التكلفة | ⭐ ($0–5 staging, $20+ production) |
| التحكم | ⭐⭐ (محدود) |
| الأمان | ⭐⭐⭐⭐⭐ (المنصة تتولى الأمان الأساسي) |
| قابلية التوسع | ⭐⭐⭐⭐ |
| المناسبة للمشروع | ✅ ممتاز لـ staging سريع، لكن التكلفة ترتفع للإنتاج |

### Option D: Advanced Local Staging

| Criteria | Rating |
|----------|:------:|
| السهولة | ⭐⭐⭐⭐ (مألوف) |
| التكلفة | ⭐⭐⭐⭐⭐ (مجاني) |
| التحكم | ⭐⭐⭐⭐⭐ |
| الأمان | غير قابل للتقييم (محلي) |
| قابلية التوسع | لا ينطبق |
| المناسبة للمشروع | ❌ ليس نشرًا حقيقيًا، لا يختبر سيناريوهات الإنتاج |

### ✅ Recommendation

**مسار مختلط — مرحلتين:**

| المرحلة | الخيار | السبب |
|---------|--------|-------|
| **Staging** | Option C — Render or Fly.io | نشر سريع بأقل تكلفة، يختبر كل السيناريوهات دون الحاجة لإدارة سيرفر |
| **Production** | Option A — VPS + Docker Compose | تحكم كامل، تكلفة ثابتة، مناسب للإنتاج التجاري |

**التوصية النهائية لـ Staging: Fly.io**
- دعم Dockerfile مباشر
- PostgreSQL managed مجاني
- تكلفة قليلة جدًا لـ staging
- SSL تلقائي
- نشر من git (اختياري)

---

## 2. Domains Plan

### Staging (مباشر)

```
stores.haasoft.com          ← Storefront (public, root)
app.stores.haasoft.com      ← Merchant Dashboard
api.stores.haasoft.com      ← API (REST)
```

**السبب**: نطاق فرعي تحت `haasoft.com` موجود، لا يحتاج شراء نطاق جديد.

### Production (لاحقًا)

```
haastores.com                ← Storefront (public, root)
app.haastores.com            ← Merchant Dashboard
api.haastores.com            ← API (REST)
```

**السبب**: نطاق مستقل لتجاري، يعطي ثقة وجدية.

### Routing المقترح (Nginx / Caddy)

```
# Staging — stores.haasoft.com (Nginx example)

server {
    listen 443 ssl;
    server_name api.stores.haasoft.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

server {
    listen 443 ssl;
    server_name app.stores.haasoft.com;

    root /var/www/dashboard/dist;
    index index.html;
    try_files $uri $uri/ /index.html;   # SPA fallback
}

server {
    listen 443 ssl;
    server_name stores.haasoft.com;

    root /var/www/storefront/dist;
    index index.html;
    try_files $uri $uri/ /index.html;   # SPA fallback
}
```

### SSL

- **Staging**: Let's Encrypt (Certbot) أو تلقائي من المنصة (Render/Fly.io)
- **Production**: Let's Encrypt أو ZeroSSL

---

## 3. App Deployment Shape

### apps/api — Hono REST Server

| البند | القرار |
|------|--------|
| Build | `pnpm --filter @haa/api build` → `tsc` → `dist/index.js` |
| Run | `node dist/index.js` |
| Process Manager | PM2 (على VPS) أو مدمج في المنصة |
| Env vars | كل متغيرات البيئة ما عدا VITE_*

### apps/merchant-dashboard — React SPA

| البند | القرار |
|------|--------|
| Build | `pnpm --filter @haa/merchant-dashboard build` → `dist/` (static) |
| Serve | Nginx / Caddy serve static files |
| API Connection | `VITE_API_URL` يُحدد في وقت البناء |
| SPA Routing | `try_files $uri $uri/ /index.html` |

**هام**: في staging، يجب بناء dashboard بـ `VITE_API_URL=https://api.stores.haasoft.com`

### apps/storefront — React SPA

| البند | القرار |
|------|--------|
| Build | `pnpm --filter @haa/storefront build` → `dist/` (static) |
| Serve | Nginx / Caddy serve static files |
| API Connection | `VITE_API_URL` يُحدد في وقت البناء |
| SPA Routing | `try_files $uri $uri/ /index.html` |

**هام**: في staging، يجب بناء storefront بـ `VITE_API_URL=https://api.stores.haasoft.com`

### Postgresql

| الخيار | Staging | Production |
|--------|---------|------------|
| Managed (Fly.io/Render) | ✅ مجاني/رخيص | ✅ موصى به |
| Self-hosted (Docker) | ❌ تعقيد غير ضروري | ✅ مع backup آلي |
| Backup | تلقائي من المنصة | daily cron + pg_dump إلى S3/R2 |

### Storage — قرار حاسم

| الخيار | مناسب لـ Staging؟ | مناسب لـ Production؟ | Notes |
|--------|:-----------------:|:--------------------:|-------|
| **LocalStorage** | ❌ لا | ❌ لا | يختفي عند redeploy، غير مقبول |
| **MinIO (Docker)** | ✅ نعم مع الحذر | ✅ نعم | يحتاج volume مستمر، إدارة إضافية |
| **Cloudflare R2** | ✅ ممتاز | ✅ ممتاز | تكلفة قليلة جدًا، egress مجاني، S3-compatible |
| **AWS S3** | ✅ جيد | ✅ ممتاز | تكلفة أعلى قليلاً من R2 |
| **VPS disk** | ⚠️ مؤقتًا فقط | ❌ لا | يختفي عند crash/rebuild |

**التوصية:**
- **Staging**: Cloudflare R2 (مجاني تقريبًا لـ staging، S3-compatible، لا يحتاج Docker)
- **Production**: Cloudflare R2 أو AWS S3
- **التنفيذ**: LocalStorageAdapter موجود حاليًا. سنضيف S3Adapter (يستخدم R2 أو S3) كـ P0 fix

---

## 4. Environment Variables

### Required — All Environments

```env
DATABASE_URL=postgres://user:pass@host:5432/dbname
JWT_SECRET=<generate_random_64_chars>
ENCRYPTION_KEY=<generate_random_32_chars_min>
API_PORT=3000
NODE_ENV=staging|production

# URLs (for CORS)
API_BASE_URL=https://api.stores.haasoft.com
MERCHANT_DASHBOARD_URL=https://app.stores.haasoft.com
STOREFRONT_URL=https://stores.haasoft.com

# Storage (S3-compatible)
STORAGE_DRIVER=s3
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<r2_access_key>
S3_SECRET_ACCESS_KEY=<r2_secret_key>
S3_BUCKET=haa-stores-staging
S3_REGION=auto
S3_PUBLIC_URL=https://pub-<hash>.r2.dev
```

### Optional — With Defaults

```env
JWT_EXPIRES_IN=7d
WEBHOOK_RETRY_MAX_ATTEMPTS=3
WEBHOOK_RETRY_INTERVAL_MS=5000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
```

### Build-time (Vite)

```env
VITE_API_URL=https://api.stores.haasoft.com
```

### Local Only

```env
MINIO_ROOT_USER=haaadmin
MINIO_ROOT_PASSWORD=haa_secret_2024
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=haaadmin
MINIO_SECRET_KEY=haa_secret_2024
MINIO_BUCKET=haa-stores
```

### Per-Environment Summary

| Variable | Local | Staging | Production |
|----------|:-----:|:-------:|:----------:|
| `DATABASE_URL` | dev | staging DB | production DB |
| `JWT_SECRET` | `dev-jwt-secret-...` | **مفتاح عشوائي** | **مفتاح عشوائي** |
| `ENCRYPTION_KEY` | dev key | **مفتاح عشوائي** | **مفتاح عشوائي** |
| `STORAGE_DRIVER` | `local` | `s3` | `s3` |
| `S3_*` | — | R2 staging | R2/S3 production |
| `VITE_API_URL` | `/api` | `https://api.stores.haasoft.com` | `https://api.haastores.com` |
| `CORS_ORIGINS` | `localhost:5173,5174` | `stores.haasoft.com, app.stores.haasoft.com` | `haastores.com, app.haastores.com` |
| `NODE_ENV` | `development` | `staging` | `production` |
| `LOG_LEVEL` | `debug` | `info` | `warn` |

---

## 5. Security Readiness Checklist

| البند | الحالة | ملاحظة |
|------|--------|--------|
| Rate limiting | ⚠️ Needs work before staging | غير مطبق على public endpoints |
| CORS | ✅ Ready | API يسمح بـ localhost:5173/5174 فقط. يحتاج تحديث للـ staging domains |
| Security headers | ⚠️ Needs work before staging | لا `helmet` أو middleware للأمان |
| Request size limits | ⚠️ Needs work before staging | غير محدد حاليًا |
| Password policy | ⚠️ Needs work before staging | لا minimum length, لا validation قوي |
| JWT expiration | ✅ Ready | 7 أيام حاليًا، مقبول لـ staging |
| Refresh token | ❌ Deferred | لا refresh tokens حاليًا، مقبول لـ MVP |
| HTTPS only | ✅ تلقائي من المنصة | في VPS يحتاج Certbot |
| Secrets management | ⚠️ Needs work | حاليًا `.env` فقط، يحتاج env vars من المنصة |
| DB backup | ⚠️ Needs work | يحتاج خطة قبل staging |
| Audit logs | ✅ Ready | audit_logs يُسجل جميع التغييرات |
| Public DTO safety | ✅ Ready | تم المراجعة والإغلاق في Release 4 |
| Error handling | ⚠️ Needs work before staging | رسائل الخطأ قد تسرّب تفاصيل داخلية |
| Logs without secrets | ⚠️ Needs work before staging | التأكد من عدم تسجيل `passwordHash` أو `token` |
| File upload protection | ❌ Deferred | لا image upload حاليًا |
| File validation | ❌ Deferred | لا يوجد |
| Dependency audit | ⚠️ Needs work before staging | `pnpm audit` قبل staging |

**التوزيع:**
- ✅ Ready: 5 بنود
- ⚠️ Needs work before staging: 7 بنود
- ❌ Deferred: 3 بنود

---

## 6. Staging Must-Fix List

### P0A — Staging Security Foundation ✅ (Complete)

| # | البند | الحالة | تاريخ الإنجاز |
|:-:|-------|:------:|:-------------:|
| 1 | **Error handling** — centralized, no stack traces | ✅ | P0A |
| 2 | **Security headers** — X-Content-Type-Options, X-Frame-Options, etc | ✅ | P0A |
| 3 | **CORS** — env-based origins, no wildcard | ✅ | P0A |
| 4 | **Rate limiting** — in-memory on public endpoints | ✅ | P0A |
| 5 | **Secrets management** — env validation, reject dev defaults in staging | ✅ | P0A |
| 6 | **Logging safety** — review, no sensitive data in logs | ✅ | P0A |

### P0B — Storage Adapter (Next)

| # | البند | الجهد | المبرر |
|:-:|-------|:-----:|--------|
| 1 | **S3/R2 Storage Adapter** — ✅ Complete | 1 يوم | بديل عن LocalStorage للصور |

### P0 Remaining after P0B

No remaining P0 items. P0A + P0B covers all P0 requirements. ✅

**إجمالي P0**: ~5 أيام عمل (P0A ~4 days + P0B ~1 day)

### P1 — Before Demo / User Testing

| # | البند | الجهد | المبرر |
|:-:|-------|:-----:|--------|
| 1 | **Environment validation at startup** | نصف يوم | التأكد من وجود المتغيرات الضرورية |
| 2 | **Structured logging (pino/bunyan)** | 1 يوم | logs مفيدة للتشخيص |
| 3 | **Password policy** | نصف يوم | minimum length 8 |
| 4 | **Dependency audit** | 1 ساعة | `pnpm audit` وتحديث أي ثغرات |
| 5 | **Image upload UI (Dashboard)** | 2 يوم | ✅ Complete (P0B) |

**إجمالي P1**: ~4 أيام عمل

### P2 — Before Production

| # | البند | الجهد | المبرر |
|:-:|-------|:-----:|--------|
| 1 | Refresh token strategy | 2 يوم | أمان أفضل للجلسات |
| 2 | DB backup automation | 1 يوم | cron + pg_dump + R2 |
| 3 | Migration rollback procedure | 1 يوم | documented process |
| 4 | Uptime monitoring | 1 يوم | healthcheck + notification |
| 5 | Pagination for storefront | 1 يوم | UX كامل |
| 6 | Rate limiting for merchant API | 1 يوم | حماية إضافية |

---

## 7. Docker / Non-Docker Decision

### القرار: ✅ **Docker Compose على السيرفر للإنتاج، بدون Docker للـ staging (منصة مدارة)**

### Staging (Fly.io / Render)

لا حاجة لـ Docker لأن المنصة تدير:
- Builds تلقائي (من Dockerfile لو اخترنا Fly.io)
- PostgreSQL managed
- SSL تلقائي
- Logs مدمجة

**الخدمات المطلوبة في staging:**
```
api (خدمة واحدة على Fly.io)
  └── postgres (managed من Fly.io)

dashboard (static build → Fly.io static أو serve من api)
storefront (static build → Fly.io static)
```

### Production (VPS + Docker Compose)

```yaml
services:
  nginx:
    image: nginx:alpine
    ports: [80, 443]
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./dashboard-dist:/var/www/dashboard:ro
      - ./storefront-dist:/var/www/storefront:ro
      - certbot-data:/etc/letsencrypt

  api:
    build: ./apps/api
    env_file: .env.production
    depends_on: [postgres]
    restart: always

  postgres:
    image: postgres:16-alpine
    volumes: [pgdata:/var/lib/postgresql/data]
    env_file: .env.production

  minio:      # اختياري — يمكن استخدام R2 بدلاً منه
    image: minio/minio
    volumes: [miniodata:/data]
```

### MinIO vs R2/S3

| البند | MinIO | R2/S3 |
|-------|:-----:|:-----:|
| يحتاج Docker | ✅ نعم | ❌ لا |
| تكلفة | مجاني | شبه مجاني (0.015$/GB/month) |
| متانة | متوسطة (single node) | عالية (managed) |
| إدارة | تحتاج إشراف | لا تحتاج |
| سرعة الوصول | سريع (local network) | سريع (CDN) |

**التوصية: R2 للـ staging والإنتاج.**  
MinIO اختياري فقط لو أردنا تحكم كامل بدون تكلفة تخزين خارجية.

---

## 8. Database Migration Strategy

### Current State

- 1 migration file موجود في `packages/db/src/migrations/`
- Drizzle-kit يستخدم `drizzle.config.ts` مع `DATABASE_URL`

### Staging Process

```bash
# 1. Set DATABASE_URL to staging DB
export DATABASE_URL=postgres://...

# 2. تشغيل migration
pnpm db:migrate

# 3. هل نشغل seed؟
# Staging: ✅ نعم — ولكن بدون بيانات حساسة
# Production: ❌ لا — أبدًا
```

### Seed Protection

**الآلية المقترحة**: إضافة فحص `NODE_ENV` في الـ seed:

```ts
// packages/db/src/seed/index.ts
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Seed cannot run in production');
  process.exit(1);
}
```

### Backup Strategy

```bash
# Daily backup cron
0 2 * * * pg_dump $(DATABASE_URL) | gzip > /backups/haastores-$(date +%Y%m%d).sql.gz

# Upload to R2
0 3 * * * aws s3 cp /backups/haastores-*.sql.gz s3://haa-stores-backups/ --endpoint-url https://<r2-endpoint>
```

### Pre-Migration Backup

```bash
# Always backup before migrate
pg_dump $(DATABASE_URL) > /tmp/pre-migration-backup-$(date +%s).sql
pnpm db:migrate
```

### Rollback (Theoretical)

Drizzle-kit لا يدعم rollback تلقائي. الإجراء المقترح:

```sql
-- Manual rollback: استعادة النسخة الاحتياطية
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
psql $(DATABASE_URL) < /tmp/pre-migration-backup-*.sql
```

**التوصية**: استمرار استخدام Drizzle-kit مع backup قبل كل migrate.

---

## 9. Observability

### الحد الأدنى لـ Staging

| المكون | الأداة | كيفية |
|--------|--------|-------|
| Structured logs | `pino` أو `consola` | استبدال `console.log` في API بـ `pino` |
| Error logs | `pino` + file/stream | `pino/file` أو stream إلى stdout |
| Request logs | Hono logger | موجود حاليًا، يطبع لكل request |
| Health endpoint | `GET /health` | موجود ✅ |
| Uptime check | Cron job أو Better Uptime | ping `https://api.stores.haasoft.com/health` كل 5 دقائق |
| DB connectivity | Health endpoint | موجود ✅ (`db: connected/disconnected`) |
| Disk usage | نظامي (ضمن VPS monitoring) | — |
| Backup status | Log بعد كل backup | تسجيل نجاح/فشل cron job |

### المستوى المتقدم (لاحقًا)

- Sentry (error tracking)
- Grafana + Prometheus
- uptimerobot.com أو betteruptime.com (مجاني)

---

## 10. Deployment Readiness Report

### 1. القرار الموصى به للنشر التجريبي

**Staging على Fly.io** — بسيط، سريع، مجاني تقريبًا، مع PostgreSQL managed.

### 2. بنية الدومينات

```
stores.haasoft.com          ← Storefront
app.stores.haasoft.com      ← Dashboard
api.stores.haasoft.com      ← API
```

### 3. بنية الخدمات

```
Client → DNS → Fly.io → Nginx (أو Fly.io proxy)
                          ├── api.stores.haasoft.com → API (port 3000)
                          ├── app.stores.haasoft.com → Dashboard (static)
                          └── stores.haasoft.com     → Storefront (static)
```

### 4. متغيرات البيئة المطلوبة

9 أساسية (required), 6 اختيارية (optional), 6 محلية فقط (local-only).
انظر القسم 4 للتفاصيل الكاملة.

### 5. التخزين المقترح

**Cloudflare R2** — S3-compatible, تكلفة قليلة, لا يحتاج Docker.
لـ staging: bucket واحد `haa-stores-staging`
لـ production لاحقًا: bucket منفصل `haa-stores-production`

### 6. قاعدة البيانات المقترحة

**PostgreSQL managed من Fly.io** — مجاني ضمن الحد المسموح لـ staging.

### 7. Security Checklist

| التصنيف | العدد |
|---------|:-----:|
| ✅ Ready | 5 |
| ⚠️ Needs work before staging | 7 |
| ❌ Deferred | 3 |

### 8. P0 Before Staging

#### P0A — Staging Security Foundation ✅ (Complete)

| # | البند | الحالة |
|:-:|-------|:------:|
| 1 | Error handling (centralized, no stack traces) | ✅ |
| 2 | Security headers (X-Content-Type-Options, X-Frame-Options, etc) | ✅ |
| 3 | CORS (env-based origins, no wildcard) | ✅ |
| 4 | Rate limiting (in-memory on public endpoints) | ✅ |
| 5 | Secrets/env management (validation, reject dev defaults) | ✅ |
| 6 | Logging safety (no sensitive data in logs) | ✅ |
| | **P0A Total** | **~4 days ✅** |

#### P0B — Storage Adapter ✅

| # | البند | أيام |
|:-:|-------|:-----:|
| 1 | S3/R2 Storage Adapter (replace local) | 1 |
| 2 | LocalStorageAdapter (interim for dev) | - |
| 3 | DB migration: add `key` column to `product_images` | - |
| 4 | API endpoints: upload/delete product images | - |
| 5 | Dashboard image upload UI | - |
| 6 | Storefront image display | - |
| 7 | File validation (size 5MB, jpeg/png/webp only) | - |
| 8 | Audit logging for image uploads/deletes | - |
| 9 | Test coverage (15 tests) | - |
| | **P0B Total** | **~1 day ✅** |

### 9. P1 Before Demo

| # | البند | أيام |
|:-:|-------|:-----:|
| 1 | Environment validation at startup | 0.5 |
| 2 | Structured logging | 1 |
| 3 | Password policy | 0.5 |
| 4 | Dependency audit | 0.1 |
| 5 | Image upload UI (optional) | 2 |
| | **Total** | **~4 days** |

### 10. P2 Before Production

| # | البند | أيام |
|:-:|-------|:-----:|
| 1 | Refresh token strategy | 2 |
| 2 | DB backup automation | 1 |
| 3 | Migration rollback procedure | 1 |
| 4 | Uptime monitoring | 1 |
| 5 | Pagination for storefront | 1 |
| 6 | Rate limiting for merchant API | 1 |
| | **Total** | **~7 days** |

### 11. هل المشروع جاهز للـ staging الآن؟

**لا.** هناك 6 بنود P0 يجب تنفيذها أولاً (≈4 أيام عمل).

### 12. ما Blockers؟

| Blocker | الحل |
|---------|------|
| No rate limiting on public endpoints | إضافة Hono middleware |
| No security headers | إضافة `helmet` أو Hono middleware |
| CORS يسمح فقط بـ localhost | تحديث إلى قائمة domains |
| Secrets كملف `.env` | نقل إلى env vars المنصة و`.env.staging` نموذج |
| Error handling قد يسرّب معلومات | wrapped errors آمنة |
| LocalStorageAdapter غير صالح لـ staging | إضافة S3Adapter مع R2 |

### 13. أول أمر تنفيذ مقترح بعد اعتماد الخطة

```bash
# إضافة S3 Storage Adapter
# هذا يفتح الطريق لبقية P0 ويمنع انهيار التخزين في staging
```

---

## الخلاصة

```
Local MVP PASS ✅
P0A Security Foundation ✅
P0B Storage Adapter ✅
P0B Review Gate ✅
    ↓ (أنت هنا)
⛔ النشر مؤجل — Local Completion Roadmap
    ↓
LC2 — Dashboard Polish
    ↓
LC3 — Storefront Polish
    ↓
LC4 — Commerce Features
    ↓
LC5 — Local Operations
    ↓
LC6 — Local Full Product Gate
    ↓
[بعدها فقط] فتح ملف النشر
```

**الخطوة التالية:** LC2 — Merchant Dashboard Polish.

انظر `docs/LOCAL_COMPLETION_ROADMAP.md` للتفاصيل الكاملة.

# Local Runbook — Haa Stores Core

دليل التشغيل المحلي الكامل للمشروع.

---

## المتطلبات

| الأداة | الحد الأدنى | الفحص |
|--------|-------------|-------|
| Node.js | >= 20 | `node --version` |
| pnpm | >= 9 | `pnpm --version` |
| PostgreSQL | 16 | `psql --version` |
| Docker | أي إصدار | `docker --version` |

## أول تشغيل

```bash
# 1. استنساخ المشروع
cd ~/Desktop/haa-stores-core

# 2. نسخ ملف البيئة
cp .env.example .env

# 3. تشغيل كل شيء بأمر واحد
pnpm setup
```

`pnpm setup` يقوم تلقائيًا بـ:
1. `pnpm install` — تثبيت الاعتماديات
2. `docker compose up -d` — تشغيل PostgreSQL و MinIO
3. `pnpm db:migrate` — تشغيل الترحيلات
4. `pnpm db:seed` — بذر البيانات التجريبية

## تشغيل الخدمات

### تشغيل منفصل لكل خدمة

```bash
# API (http://localhost:3000)
pnpm dev:api

# Merchant Dashboard (http://localhost:5173)
pnpm dev:dashboard

# Storefront (http://localhost:5174)
pnpm dev:storefront
```

### تشغيل الكل (3 نوافذ طرفية منفصلة)

```bash
# Terminal 1
pnpm dev:api

# Terminal 2
pnpm dev:dashboard

# Terminal 3
pnpm dev:storefront
```

## الروابط

| الخدمة | الرابط |
|--------|--------|
| API Health | http://localhost:3000/health |
| Merchant Dashboard | http://localhost:5173 |
| Storefront | http://localhost:5174/s/haa-demo |
| PostgreSQL | `postgres://haa:haa_secret_2024@localhost:5432/haastores` |

## حساب التجربة

| الحقل | القيمة |
|-------|--------|
| البريد | `ahmed@example.com` |
| كلمة المرور | `Test@123456` |
| رابط المتجر | `http://localhost:5174/s/haa-demo` |

## إدارة قاعدة البيانات

### Reset (حذف وإعادة بناء)

```bash
pnpm db:reset
# يحذف قاعدة البيانات ← ينشئها ← يشغل الترحيلات ← يبذر البيانات
```

### Backup (نسخ احتياطي)

```bash
pnpm db:backup
# ينشئ ملف backup داخل backups/ بالتوقيت
# ينشئ رابطه latest → backups/latest.sql
```

### Restore (استعادة)

```bash
# استعادة آخر نسخة
pnpm db:restore

# استعادة نسخة محددة
pnpm db:restore backups/haastores_20260607_120000.sql
```

## Smoke Test

يتطلب تشغيل جميع الخدمات (API + Dashboard + Storefront) أولاً.

```bash
# شغّل الخدمات أولًا في 3 نوافذ
pnpm dev:api
pnpm dev:dashboard
pnpm dev:storefront

# ثم في نافذة رابعة
pnpm smoke
```

## الفحوصات

```bash
# التحقق من البيئة
pnpm env:check

# فحص الأنواع
pnpm -r typecheck

# بناء
pnpm -r build

# اختبارات الوحدة
pnpm test

# الاختبار الشامل (يتطلب الخدمات)
pnpm smoke
```

## استكشاف الأخطاء

### Port 5173 مشغول

إذا كان المنفذ 5173 مستخدمًا من مشروع آخر (مثل nasaq القديم):

```bash
# أوقف المشروع القديم
lsof -i :5173
kill -9 <PID>

# أو استخدم منفذ مختلف
# عدّل vite.config.ts في apps/merchant-dashboard
```

### Database connection failed

```bash
# تأكد من تشغيل PostgreSQL
docker ps | grep haa-postgres

# أو شغّله
pnpm docker:up
```

### Seed فشل

```bash
# تأكد من تشغيل الترحيلات أولاً
pnpm db:migrate

# ثم أعد البذر
pnpm db:seed

# أو reset كامل
pnpm db:reset
```

### MinIO غير متاح

إذا كان MinIO معطلاً، رفع الصور لن يعمل:
```bash
docker compose up -d minio
```

## سياسة عدم النشر

**النشر الخارجي مؤجل حتى LC6 — Local Full Product Gate.**

- ❌ لا Fly.io
- ❌ لا Cloudflare R2
- ❌ لا دومينات
- ❌ لا أسرار حقيقية
- ❌ لا Payment حقيقي
- ❌ لا Shipping حقيقي
- ❌ لا ربط مع هاء

راجع `docs/NO_DEPLOY_POLICY.md` للتفاصيل.

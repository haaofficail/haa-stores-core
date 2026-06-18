# Haa Stores — Public Marketplace Audit Report

**Date:** 2026-06-17  
**Auditor Role:** Principal Marketplace Systems Auditor  
**Type:** Read-Only Deep Architecture & Security Audit  
**Scope:** Haa Stores public marketplace (سوق هاء)  
**Methodology:** Code review, schema analysis, route audit, test coverage mapping, demo isolation analysis, multi-tenant security review

---

## Executive Verdict

| Metric                      | Value                                                     |
| --------------------------- | --------------------------------------------------------- |
| **Final Verdict**           | **غير جاهز للإطلاق التجاري العام**                        |
| **Recommended Launch Mode** | إطلاق محدود (Controlled Beta) مع متاجر مختارة فقط         |
| **Readiness Percentage**    | ~30% (الهيكل الأساسي موجود، لكن السياسات والضوابط مفقودة) |
| **P0 Launch Blocker Count** | **6** — تمنع الإطلاق التجاري                              |
| **P1 Must Fix Count**       | **9** — يجب إصلاحها قبل الإطلاق العام                     |
| **P2 Post-MVP Count**       | **12** — تحسينات بعد الإطلاق                              |

---

## Scope Reviewed

### Files/Directories Reviewed (35+ files)

**Core Marketplace Logic:**

- `apps/api/src/routes/haa-marketplace.ts` (704 LOC) — جميع endpoints السوق العام
- `apps/api/src/routes/admin/marketplace.ts` (368 LOC) — لوحة تحكم الأدمن للسوق
- `apps/api/src/routes/admin/index.ts` (243 LOC) — تجميع مسارات الأدمن مع الصلاحيات
- `packages/shared/src/demo/demo-rules.ts` — قواعد عزل الديمو المركزية

**Database Schema:**

- `packages/db/src/schema/products.ts` — جدول المنتجات (حقول السوق العام)
- `packages/db/src/schema/stores.ts` — جدول المتاجر (isDemo, publishStatus)
- `packages/db/src/schema/marketplace_orders.ts` — جدول طلبات السوق الموحد
- `packages/db/src/schema/orders.ts` — جدول الطلبات
- `packages/db/src/schema/checkout.ts` — جلسات الدفع
- `packages/db/src/schema/cart.ts` — سلة المشتريات
- `packages/db/src/schema/categories.ts` — التصنيفات (prohibitedInMarketplace, regulatedCategory)
- `packages/db/src/schema/wallet.ts` — المحفظة والتسويات
- `packages/db/src/schema/compliance.ts` — KYC والامتثال
- `packages/db/src/schema/audit.ts` — سجل التدقيق
- `packages/db/src/schema/marketplaces.ts` — اتصالات الأسواق الخارجية (Zid, Salla, Amazon)

**Storefront Marketplace UI:**

- `apps/storefront/src/pages/marketplace/MarketplaceEdition.tsx` — صفحة السوق الرئيسية
- `apps/storefront/src/pages/marketplace/MarketplaceProductDetail.tsx` — صفحة تفاصيل المنتج
- `apps/storefront/src/pages/marketplace/theme/MarketplaceHero.tsx`
- `apps/storefront/src/pages/marketplace/theme/MarketplaceProductCard.tsx`
- `apps/storefront/src/pages/marketplace/theme/MarketplaceSellerRail.tsx`
- `apps/storefront/src/pages/marketplace/theme/MarketplaceFilters.tsx`

**Storefront API Routes:**

- `apps/api/src/routes/storefront/products.ts` — منتجات المتجر
- `apps/api/src/routes/storefront/checkout.ts` — الدفع والطلب
- `apps/api/src/routes/storefront/cart.ts` — السلة
- `apps/api/src/routes/storefront/_shared.ts` — المشاركات (resolveActiveStore)
- `apps/api/src/routes/storefront/index.ts` — تجميع مسارات المتجر

**Platform Infrastructure:**

- `apps/api/src/index.ts` — مدخل API (rate limiting, CORS, CSRF, security headers)
- `apps/api/src/middleware/rate-limiter.ts` — تحديد المعدل
- `apps/api/src/middleware/security-headers.ts`
- `apps/api/src/middleware/csrf-origin.ts`

**Tests:**

- `tests/marketplace-p0-2-category-blocklist.test.ts`
- `tests/marketplace-p0-3-access-token.test.ts`
- `tests/marketplace-p0-4-demo-isolation.test.ts`
- `tests/marketplace-p0-5-audit.test.ts`
- `tests/marketplace-demo.test.ts`
- `tests/products-qa-regression.test.ts`
- `tests/multi-tenancy.test.ts`
- `tests/demo-rules.test.ts`
- `tests/rbac-coverage.test.ts`
- `tests/permissions.test.ts`
- `tests/oto-marketplace-platform-regression.test.ts`
- `tests/marketing-events.test.ts`

**Packages:**

- `packages/marketplace-core/` — (package.json exists, zero business logic files found — directory is essentially empty)
- `packages/auth-core/`
- `packages/commerce-core/`
- `packages/wallet-core/`
- `packages/shared/`

### Endpoints Reviewed

| Method | Path                                            | Type                 | Auth             |
| ------ | ----------------------------------------------- | -------------------- | ---------------- |
| GET    | `/marketplace/products`                         | Public               | No               |
| GET    | `/marketplace/products/:storeSlug/:productSlug` | Public               | No               |
| GET    | `/marketplace/sellers`                          | Public               | No               |
| GET    | `/marketplace/sellers/:storeSlug`               | Public               | No               |
| GET    | `/marketplace/categories`                       | Public               | No               |
| POST   | `/marketplace/orders`                           | Public (no auth)     | No               |
| GET    | `/marketplace/orders/:num`                      | Public (accessToken) | Token/Phone      |
| GET    | `/admin/marketplace/summary`                    | Admin                | requireAdminAuth |
| GET    | `/admin/marketplace/products`                   | Admin                | requireAdminAuth |
| PATCH  | `/admin/marketplace/products/:id/review`        | Admin                | requireAdminAuth |
| PATCH  | `/admin/marketplace/products/:id/feature`       | Admin                | requireAdminAuth |
| GET    | `/admin/marketplace/sellers`                    | Admin                | requireAdminAuth |
| GET    | `/admin/marketplace/orders`                     | Admin                | requireAdminAuth |
| GET    | `/admin/marketplace/settlements`                | Admin                | requireAdminAuth |
| GET    | `/admin/marketplace/deep-report`                | Admin                | requireAdminAuth |

### Tables Reviewed

| Table                     | Key Marketplace Columns                                                                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `products`                | `haaMarketplaceEnabled`, `haaMarketplaceReviewStatus` (pending/approved/rejected/suspended), `haaMarketplaceCommissionRate`, `haaMarketplaceFeatured` |
| `stores`                  | `isDemo`, `demoProfile`, `demoSeedVersion`, `publishStatus` (draft/published)                                                                         |
| `marketplace_orders`      | `marketplaceOrderNumber`, `accessToken`, `status` (created/demo), `platformCommission`                                                                |
| `marketplace_order_links` | `marketplaceOrderId`, `orderId`, `storeId`, `storeSlug`, `platformCommission`                                                                         |
| `categories`              | `prohibitedInMarketplace`, `regulatedCategory`                                                                                                        |
| `checkout_sessions`       | `storeId`, `cartId`, `status`                                                                                                                         |
| `orders`                  | `storeId`, `customerId`, `source`, `platformCommission`                                                                                               |
| `kyc_profiles`            | `storeId`, `status` (not_started/submitted/approved/rejected)                                                                                         |

---

## Marketplace Architecture Map

### Current Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Haa Marketplace Architecture                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐  │
│  │  Storefront   │    │  Merchant     │    │  Admin Dashboard │  │
│  │  (5174)       │    │  Dashboard    │    │  (5175)          │  │
│  │  /marketplace │    │  (5173)       │    │  /admin/         │  │
│  └──────┬───────┘    └──────┬───────┘    └───────┬──────────┘  │
│         │                   │                    │              │
│         ▼                   ▼                    ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Hono API Server (port 3000)                │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │  Middleware Stack                               │   │   │
│  │  │  requestId → structuredLogger → securityHeaders │   │   │
│  │  │  → cors → csrfOrigin → rateLimiter             │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐  │   │
│  │  │ /marketplace │  │ /admin/      │  │ /s/:slug/*    │  │   │
│  │  │ (Public)     │  │ marketplace  │  │ (Storefront)  │  │   │
│  │  │ haa-market-  │  │ admin/       │  │ products/     │  │   │
│  │  │ place.ts     │  │ marketplace  │  │ checkout/     │  │   │
│  │  └──────┬───────┘  │ .ts          │  │ cart/         │  │   │
│  │         │          └──────┬───────┘  └──────┬────────┘  │   │
│  │         ▼                 ▼                  ▼           │   │
│  │  ┌─────────────────────────────────────────────────┐   │   │
│  │  │              PostgreSQL Database                 │   │   │
│  │  │  products → stores → tenants                    │   │   │
│  │  │  marketplace_orders → orders → wallets          │   │   │
│  │  └─────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Public Flows (Customer)

1. **Browse marketplace** → `GET /marketplace/products` → returns active, approved products from active+published stores (real: marketplaceEnabled+approved; demo: isDemo+allowedProfile)
2. **View product** → `GET /marketplace/products/:storeSlug/:productSlug` → same filters + specific product
3. **View seller** → `GET /marketplace/sellers/:storeSlug` → store info + product count
4. **Search/categorize** → `GET /marketplace/products?search=&category=&sort=&price=`
5. **Place combined order** → `POST /marketplace/orders` → links multiple store orders into one marketplace order
6. **Track order** → `GET /marketplace/orders/:num?access_token=` → returns order status

### Admin Flows

1. **View summary** → `GET /admin/marketplace/summary` → pending/approved/seller/order/commission counts
2. **Review products** → `GET /admin/marketplace/products?status=pending`
3. **Approve/reject/suspend** → `PATCH /admin/marketplace/products/:id/review` (with audit log)
4. **Feature product** → `PATCH /admin/marketplace/products/:id/feature` (with audit log)
5. **View sellers** → `GET /admin/marketplace/sellers` → per-seller product/moderation stats
6. **View orders** → `GET /admin/marketplace/orders` → all marketplace orders
7. **Manage settlements** → `GET /admin/marketplace/settlements` + settlement batch/payout workflow
8. **Deep report** → `GET /admin/marketplace/deep-report` → GMV, commission, top sellers, product moderation stats

### Merchant Flows

1. **Enable marketplace** → sets `haaMarketplaceEnabled=true` on product (merchant dashboard)
2. **Wait for review** → product status becomes `pending` → admin reviews → `approved`/`rejected`
3. **Manage marketplace orders** → sees orders with `source='haa_marketplace'` in their dashboard
4. **Wallet/settlements** → platform commission deducted, merchant receives net

### Customer Flows (Storefront → Marketplace Cart)

1. Browse product on marketplace
2. Click "أضف إلى السلة" → adds to `marketplaceCart` (client-side cart, not server-side)
3. Checkout: redirects to individual store's `/s/:slug/checkout` for payment
4. After completing individual orders, returns to marketplace with order numbers
5. `POST /marketplace/orders` links all sub-orders under one marketplace order

---

## Findings Summary

| Severity  | Count  | Meaning                                 |
| --------- | ------ | --------------------------------------- |
| **P0** 🚫 | 6      | يمنع الإطلاق التجاري (Launch Blocker)   |
| **P1** ⚠️ | 9      | يجب إصلاحه قبل الإطلاق العام (Must Fix) |
| **P2** 🔧 | 12     | يحسن الجودة ويمكن تأجيله (Post-MVP)     |
| **P3** 💡 | 4      | تحسين لاحق (Nice to Have)               |
| **Total** | **31** |                                         |

---

## P0 — Launch Blockers

### P0-1: تسريب بيانات التاجر الشخصية عبر API عام

- **الوصف:** `GET /marketplace/sellers/:storeSlug` (haa-marketplace.ts:277-354) يعرض `email` و `phone` للتاجر مباشرة دون أي تحقق. أي زائر يمكنه استخراج بريد وجوال أي تاجر في السوق.
- **الدليل:** `haa-marketplace.ts:290-291`:
  ```typescript
  email: s.stores.email,
  phone: s.stores.phone,
  ```
- **الأثر:** خرق صريح لمبدأ PDPL (تقليل البيانات) — بيانات شخصية حساسة متاحة للعامة
- **الاحتمال:** 100% — أي طلب GET يعيد البيانات
- **الضرر:** عالي — انتهاك تنظيمي، خسارة ثقة التجار، غرامات محتملة
- **هل تمنع الإطلاق؟** ✅ نعم

### P0-2: لا يوجد `prohibitedInMarketplace` filter في استعلامات السوق

- **الوصف:** رغم أن جدول `categories` فيه عمود `prohibitedInMarketplace` (categories.ts:25)، استعلامات `/marketplace/products` و `/marketplace/categories` لا تستخدم هذا الفلتر. تصنيفات مثل الأسلحة والمخدرات والمحتوى البالغ لو تم تعليمها `prohibitedInMarketplace=true` ستظهر في السوق.
- **الدليل:** `haa-marketplace.ts` WHERE clauses (lines 97-103, 256-267, 443-452) — لا يوجد شرط على `prohibitedInMarketplace` في أي من الاستعلامات الأربعة.
- **الأثر:** منتجات من تصنيفات محظورة قد تظهر في السوق العام
- **الاحتمال:** متوسط — يعتمد على ما إذا كان الأدمن يضبط التصنيفات
- **الضرر:** عالي جدًا — مخالفة تنظيمية، محتوى غير لائق
- **هل تمنع الإطلاق؟** ✅ نعم

### P0-3: لا يوجد فلتر `prohibitedInMarketplace` في استعلام التصنيفات

- **الوصف:** نفس المشكلة — `GET /marketplace/categories` لا يستبعد التصنيفات المحظورة. التصنيفات المحظورة ستظهر للمستخدمين كخيارات تصفح.
- **الدليل:** `haa-marketplace.ts:432-464` — WHERE clause لا يحتوي على شرط `prohibitedInMarketplace`
- **الأثر:** تصنيفات غير لائقة تظهر للمستخدمين
- **الاحتمال:** متوسط
- **الضرر:** عالي
- **هل تمنع الإطلاق؟** ✅ نعم

### P0-4: لا يوجد ضوابط للمنتجات المنظمة (SFDA)

- **الوصف:** لا يوجد تحقق إلزامي من أرقام SFDA، تواريخ صلاحية، أو تصاريح للمنتجات الغذائية والتجميلية والمكملات والأجهزة الطبية. أي تاجر يمكنه نشر أي منتج في السوق بدون أي تحقق امتثالي. حقل `regulatedCategory` في التصنيفات موجود لكن لا يستخدم لمنع النشر.
- **الدليل:** `products.ts` schema لا يحتوي على `sfdaNumber`, `expirationDate`, `complianceDocUrl` أو ما شابه. `categories.regulatedCategory` موجود (categories.ts:21) لكن لا يتم فرضه في أي endpoint.
- **الأثر:** مخاطرة تنظيمية عالية — هيئة الغذاء والدواء قد تطلب إيقاف المنصة
- **الاحتمال:** عالي — أي منتج منظم قد ينشر
- **الضرر:** عالي جدًا — عقوبات تنظيمية، مسؤولية قانونية
- **هل تمنع الإطلاق؟** ✅ نعم

### P0-5: لا يوجد `Store Marketplace Status` مستقل عن `isActive`

- **الوصف:** لا يوجد حقل `marketplaceStatus` أو `marketplaceSuspendedUntil` في جدول `stores`. الإيقاف الحالي لمتجر (isActive=false) يوقف المتجر بالكامل بما فيه storefront الخاص به. لا توجد طريقة لإخفاء متجر من السوق العام فقط مع إبقاء متجره الخاص شغال.
- **الدليل:** `stores.ts:16-21` — الحقول المتعلقة بالنشر: `isDemo`, `demoProfile`, `status`, `isActive`, `publishStatus`. لا يوجد `marketplaceStatus` أو `marketplaceSuspendedAt` أو `marketplaceSuspendedReason`.
- **الأثر:** إيقاف مؤقت/تأديبي لمتجر في السوق يتطلب تعطيل المتجر بالكامل
- **الاحتمال:** عالي — سيحدث حتمًا
- **الضرر:** متوسط — يمنع الإدارة المرنة
- **هل تمنع الإطلاق؟** ✅ نعم (لعدم وجود إدارة فعالة للمخالفات)

### P0-6: طلب السوق الموحد لا يتحقق من هوية العميل

- **الوصف:** `POST /marketplace/orders` يمكن استدعاؤه بدون أي Auth. أي شخص يعرف أرقام الطلبات الفردية يمكنه ربطها في طلب سوق موحد باسمه. لا يوجد CSRF أو captcha أو تحقق من هوية.
- **الدليل:** `haa-marketplace.ts:479` — `haaMarketplaceRouter.post('/orders', ...)` — لا يوجد middleware للتحقق.
- **الأثر:** إساءة استخدام — ربط طلبات غير مصرح بها، تخمين أرقام الطلبات
- **الاحتمال:** متوسط
- **الضرر:** متوسط
- **هل تمنع الإطلاق؟** ✅ نعم

---

## P1 — Must Fix Before Public Launch

### P1-1: لا يوجد filtering على `prohibited_in_marketplace` في استعلامات البائعين

- **الوصف:** `GET /marketplace/sellers` يحسب عدد منتجات البائع بدون مراعاة `prohibitedInMarketplace`. قد يظهر بائع في السوق العام فقط لأن عنده منتجات من تصنيفات غير محظورة في العدد لكن أغلب منتجاته محظورة.
- **الدليل:** `haa-marketplace.ts:360-383` (realSellers query) — لا يوجد JOIN على `prohibitedInMarketplace`
- **الأثر:** بائعون غير مناسبين يظهرون في السوق
- **الاحتمال:** متوسط
- **الضرر:** متوسط

### P1-2: الديمو لا يظهر badge "متجر تجريبي" في marketplace

- **الوصف:** رغم وجود `getMarketplaceDemoBadgeConfig()` في `demo-rules.ts`، واجهة المستخدم في `MarketplaceEdition.tsx` و `MarketplaceProductCard.tsx` لا تعرض badge لمتاجر الديمو. الزائر لا يعرف أنه يتصفح منتجات تجريبية.
- **الدليل:** `MarketplaceEdition.tsx` و `MarketplaceProductCard.tsx` — لا تستخدم `isDemoStore` للعرض
- **الأثر:** تضليل المستخدم — قد يعتقد أن المنتجات حقيقية
- **الاحتمال:** عالي
- **الضرر:** متوسط

### P1-3: التاجر يمكنه تفعيل marketplace بدون مراجعة مسبقة

- **الوصف:** حقل `haaMarketplaceReviewStatus` قيمته الافتراضية `pending` (products.ts:30). التاجر يضبط `haaMarketplaceEnabled=true` عبر dashboard. لا يوجد validate يمنع تعيين `enabled=true` مع `reviewStatus=pending` أو `draft`. أيضا لا يوجد حالة `draft` للمراجعة قبل الإرسال.
- **الدليل:** `products.ts:28-30`: القيم الافتراضية تسمح بـ `haaMarketplaceEnabled=false` و `haaMarketplaceReviewStatus=pending`. لا يوجد قيد في API يمنع التاجر من تعديل أي منهما.
- **الأثر:** منتج قد يظهر في السوق بدون مراجعة إذا كان هناك خلل في الفلترة
- **الاحتمال:** منخفض (لأن الفلتر يتحقق من `approved` في `haa-marketplace.ts`) لكن لا يوجد defense in depth
- **الضرر:** متوسط

### P1-4: لا يوجد Disclaimer قانوني للمشتري

- **الوصف:** السوق العام لا يعرض أي إفصاح قانوني بأن المنتجات يبيعها تجار مستقلون، أو أن Haa منصة فقط. لا توجد سياسة إرجاع، شحن، أو ضريبة موضحة في صفحات السوق.
- **الدليل:** `MarketplaceEdition.tsx` و `MarketplaceProductDetail.tsx` — لا تحتوي على seller disclosure أو terms
- **الأثر:** المسؤولية القانونية تقع بالكامل على Haa
- **الاحتمال:** عالي
- **الضرر:** متوسط-عالي

### P1-5: لا يوجد Report Abuse / Blame Flow

- **الوصف:** لا يوجد endpoint أو واجهة للإبلاغ عن منتج مخالف أو تاجر. المستخدم ليس لديه طريقة لتنبيه الإدارة.
- **الدليل:** لا يوجد `report`, `flag`, `abuse` في أي من ملفات marketplace
- **الأثر:** المنتجات المخالفة تبقى مرئية حتى يكتشفها الأدمن يدويًا
- **الاحتمال:** عالي
- **الضرر:** متوسط

### P1-6: لا يوجد Rate Limiting خاص بـ marketplace (على مستوى IP للقراءة فقط)

- **الوصف:** رغم وجود `storefrontBrowseRateLimit` (600 req/10min في الإنتاج)، لا يوجد rate limit خاص بـ `/marketplace` للقراءة فقط لمنع السكربتات والـ scraping. حد 600/10min مرتفع جدًا للسوق العام.
- **الدليل:** `api/src/index.ts:154-156`: `/marketplace/*` يستخدم `storefrontBrowseRateLimit` وهو 600 req/10min
- **الأثر:** يمكن scrape كل منتجات السوق بسهولة
- **الاحتمال:** عالي
- **الضرر:** منخفض-متوسط

### P1-7: لا يوجد Pagination إجباري في admin marketplace endpoints

- **الوصف:** `admin/marketplace.ts` endpoints مثل `marketplaceProductsRoute` تستخدم `LIMIT 200` بدون pagination إجباري. إذا زاد عدد المنتجات، قد يصبح الاستعلام بطيئًا أو يعيد بيانات كثيرة.
- **الدليل:** `admin/marketplace.ts:49`: `.limit(200)` ثابت بدون page/offset
- **الأثر:** بطء مع نمو المنتجات
- **الاحتمال:** منخفض (للمدى القريب) لكنه سيزيد
- **الضرر:** منخفض

### P1-8: لا يوجد Full-Text Search (FTS) للغة العربية

- **الوصف:** البحث يستخدم `ILIKE` (haa-marketplace.ts:106) الذي لا يدعم التشكيل، جذور الكلمات، أو stop words العربية.
- **الدليل:** `haa-marketplace.ts:106-108`: `ilike(s.products.name, term)` — بحث نصي بسيط
- **الأثر:** تجربة بحث ضعيفة للمستخدم العربي
- **الاحتمال:** عالي
- **الضرر:** منخفض (UX)

### P1-9: لا يوجد التحقق من `prohibitedInMarketplace` عند إنشاء الطلب

- **الوصف:** `POST /marketplace/orders` لا يتحقق من أن جميع المنتجات في الطلب ليست من تصنيفات محظورة.
- **الدليل:** `haa-marketplace.ts:479-628` — لا يوجد check على `prohibitedInMarketplace`
- **الأثر:** طلب يحتوي على منتجات محظورة قد ينفذ
- **الاحتمال:** منخفض
- **الضرر:** متوسط

---

## P2 — Post-MVP Improvements

| #     | Title                                                           | Evidence File                                                              |
| ----- | --------------------------------------------------------------- | -------------------------------------------------------------------------- |
| P2-1  | إضافة cache للمنتجات المتصفحة (Redis أو in-memory)              | `haa-marketplace.ts:70-202` — كل طلب query DB                              |
| P2-2  | إضافة SEO metadata محسّن للمنتجات (og:image, structured data)   | `MarketplaceProductDetail.tsx` — SEO بسيط حاليًا                           |
| P2-3  | إضافة wishlist / المفضلة                                        | غير موجود                                                                  |
| P2-4  | إضافة product reviews / التقييمات في marketplace                | `haa-marketplace.ts` يعيد `rating` و `reviewCount` لكن لا يوجد واجهة إضافة |
| P2-5  | تحسين seller page بعرض منتجات المتجر                            | `MarketplaceSellerRail.tsx` — يعرض 6 بائعين فقط                            |
| P2-6  | إضافة phone verification أو captcha لـ POST /marketplace/orders | `haa-marketplace.ts:479`                                                   |
| P2-7  | إضافة marketplace-specific settings/policies لكل متجر           | غير موجود                                                                  |
| P2-8  | إضافة ability to flag product as "طلب قيد المراجعة" مؤقتًا      | غير موجود                                                                  |
| P2-9  | إضافة cross-sell / upsell في marketplace                        | غير موجود                                                                  |
| P2-10 | إضافة analytics dashboard للمسوقين                              | غير موجود                                                                  |
| P2-11 | تصدير marketplace products feed للأسواق الأخرى                  | غير موجود                                                                  |
| P2-12 | إضافة Saudi business days لحساب وقت التوصيل                     | غير موجود                                                                  |

---

## Demo Leakage Assessment

**الحكم: 🟢 مستوى العزل مقبول مع وجود فجوات.**

### نقاط القوة:

1. **قواعد الديمو مركزية بالكامل** في ملف واحد: `packages/shared/src/demo/demo-rules.ts`
2. **استعلامات السوق تفصل بوضوح** بين real stores (تتطلب `haaMarketplaceEnabled=true` + `haaMarketplaceReviewStatus='approved'`) و demo stores (تتطلب فقط `isDemo=true` + `demoProfile IN ('main','perfume')`)
3. **الطلبات المختلطة (ديمو + حقيقي) ممنوعة** في `haa-marketplace.ts:531-539`
4. **طلبات الديمو تحصل على status=`demo` و `isMockOrder=true`** لضمان عدم اختلاطها مع الفواتير الحقيقية (haa-marketplace.ts:553-554, 592)
5. **تحليلات الديمو مستبعدة** — `shouldExcludeFromRealAnalytics()` و `shouldExcludeFromMarketplaceAnalytics()` ترجع `true`
6. **اختبارات تغطي عزل الديمو** — `marketplace-p0-4-demo-isolation.test.ts` و `marketplace-demo.test.ts`

### الفجوات:

1. **الديمو لا يظهر badge "متجر تجريبي" في واجهة السوق** — P1-2 أعلاه
2. **الديمو يظهر في search و categories و sellers** (مقصود، لكن بدون badge)
3. **لا يوجد حظر لإنشاء طلب marketplace من متجر ديمو بحساب حقيقي** — الديمو يمكنه إنشاء طلب حقيقي يربطه
4. **لا يوجد اختبار يضمن أن استعلامات السوق الـ 4 جميعها تستخدم `shouldShowInMarketplace()`**

### المخاطرة المتبقية: منخفضة-متوسطة

الديمو لا يلوث البيانات المالية (mock payments + demo status + analytics exclusion) لكنه قد يربك المستخدمين لأن badge غير موجود في الواجهة.

---

## Tenant Isolation Assessment

**الحكم: 🟡 مستوى العزل متعدد المستأجرين جيد لكن يحتاج تحسينات.**

### نقاط القوة:

1. **جميع استعلامات المنتجات merchant-specific تستخدم `storeId`** في WHERE clause
2. **`requireStoreAccess` middleware** يتحقق من أن `storeId` في الـ URL يطابق صلاحيات المستخدم
3. **BOLA/IDOR Defense** — `setStoreTenantResolver()` يحل tenantId لكل store لمنع cross-tenant الوصول
4. **اختبارات تغطي cross-tenant prevention** — `multi-tenancy.test.ts`, `permissions.test.ts`, `oto-marketplace-platform-regression.test.ts`
5. **RBAC coverage test** — `rbac-coverage.test.ts` يضمن أن كل route محمي بـ middleware

### الفجوات:

1. **السوق العام endpoints عامة بالكامل** — لا يوجد تفريق بين tenants في `GET /marketplace/products` (جميع المتاجر النشطة تظهر)
2. **لا يوجد isolated marketplace لكل tenant** — السوق موحد لكل المستأجرين
3. **Admin marketplace endpoints** لا تتحقق من `tenantId` — `marketplaceProductsRoute` (admin/marketplace.ts:39-56) يعيد جميع المنتجات بغض النظر عن tenant
4. **لا يوجد اختبار لـ cross-tenant عبر endpoints السوق العام**

### المخاطرة المتبقية: منخفضة (لأن السوق عام بطبيعته) لكن إدارة الأدمن تحتاج tenant scoping.

---

## Product Compliance Assessment

**الحكم: 🔴 غير جاهز — لا يوجد أي نظام امتثال للمنتجات المنظمة.**

### الثغرات الحرجة:

1. **لا يوجد `sfdaNumber` أو `sfdaApprovalUrl`** في `products.ts` schema
2. **لا يوجد `expirationDate` للمنتجات الحساسة** (غذائية، تجميلية)
3. **لا يوجد `complianceDocUrl` أو `evidenceUpload`** لمنتجات SFDA
4. **`regulatedCategory` موجود في `categories.ts` لكن لا يُفرض في أي API**
5. **لا يوجد category-specific policy** (مثلاً: "المستحضرات التجميلية تحتاج تصريح قبل النشر")
6. **لا يوجد `complianceReviewStatus` أو `complianceReviewedBy`** في products
7. **لا يوجد حظر للمنتجات المقلدة** — لا `isCounterfeitCheckRequired` أو `authenticityProof`
8. **لا يوجد سياسة إرجاع إجبارية للمنتجات المنظمة**

### التوصية:

قبل الإطلاق، يجب:

- منع جميع المنتجات المنظمة مؤقتًا (food, drugs, medical devices, cosmetics, supplements)
- السماح فقط بـ "المنتجات العامة" (general products, electronics, fashion, books)
- إضافة حقل `regulatedCategory` إجباري لكل منتج جديد
- جعل القيمة الافتراضية `general` ومعاقبة أي محاولة لتجاوزها

---

## Checkout / Wallet / Order Integrity Assessment

**الحكم: 🟡 جيد مع مخاطر محددة.**

### نقاط القوة:

1. **الطلبات مرتبطة بـ `storeId`** — لا يمكن أن تختلط طلبات متجر مع آخر
2. **`marketplaceOrderLinks`** تسجل بالضبط أي order تابع لأي متجر مع `storeId`, `storeName`, `storeSlug`
3. **العمولة منصبة** (platformCommission) محسوبة لكل طلب
4. **محفظة كل متجر مستقلة** — `wallet_accounts.storeId` unique
5. **سجل كامل** لطلبات السوق عبر `marketplaceOrders` و `marketplaceOrderLinks`
6. **access token** عشوائي (UUID) يمنع تخمين أرقام الطلبات
7. **اختبار `marketplace-p0-3-access-token.test.ts`** يغطي صلاحية الـ access token

### الفجوات:

1. **POST /marketplace/orders بدون Auth** — P0-6
2. **لا يوجد idempotency** على POST /marketplace/orders — تكرار الطلب قد ينشئ طلبات مكررة
3. **لا يوجد التحقق من المخزون** عند ربط الطلبات — قد يربط طلب لمخزون منتهي
4. **لا يوجد التحقق من أن `subOrders` تابعة لنفس العميل** — شرط `customerPhone` موجود لكن ضعيف

### المخاطرة المتبقية: متوسطة. الهيكل الأساسي سليم لكن الـ `POST /marketplace/orders` بدون auth هو أكبر خطر.

---

## Admin Moderation Assessment

**الحكم: 🟡 أساسيات المراجعة موجودة لكن غير مكتملة.**

### الموجود:

1. ✅ `GET /admin/marketplace/summary` — نظرة عامة على السوق
2. ✅ `GET /admin/marketplace/products?status=pending` — قائمة منتجات pending
3. ✅ `PATCH /admin/marketplace/products/:id/review` — مراجعة منتج (approve/reject/suspend)
4. ✅ `PATCH /admin/marketplace/products/:id/feature` — تمييز منتج
5. ✅ `AuditLogService.record()` — تسجيل كل مراجعة
6. ✅ `marketplace-p0-5-audit.test.ts` — اختبار التدقيق

### المفقود:

1. ❌ **لا يوجد واجهة UI للأدمن للمراجعة** — الـ endpoints API فقط موجودة
2. ❌ **لا يوجد batch review** — كل منتج على حدة
3. ❌ **لا يوجد moderation queue** — pending sorted by oldest first أو حسب الأولوية
4. ❌ **لا يوجد إشعار للتاجر** عند رفض/تعليق المنتج
5. ❌ **لا يوجد متجر review** — الأدمن لا يستطيع مراجعة متجر كامل
6. ❌ **لا يوجد category/regulated review** — لا يوجد review للتصنيفات المنظمة
7. ❌ **لا يوجد تقرير نشاط مشبوه** — abuse report flow مفقود
8. ❌ **لا يوجد export** للمنتجات المرفوضة/المعلقة

### المخاطرة المتبقية: عالية — الإدارة اليدوية غير ممكنة لأكثر من 50 منتج.

---

## Public UX / Trust Assessment

**الحكم: 🟡 مقبول مع فجوات.**

### نقاط القوة:

1. ✅ تصميم marketplace بسيط ونظيف
2. ✅ RTL مدعوم بالكامل
3. ✅ تصفح بالتصنيفات، بحث، سعر، توفر
4. ✅ trust badges على صفحة المنتج
5. ✅ BNPL (تابي، تمارا) مدعوم
6. ✅ تفاصيل المنتج كاملة (صور، سعر، وصف، أبعاد)
7. ✅ فلاتر متعددة

### الفجوات:

1. ❌ لا يوجد seller disclaimer ("هذا المنتج يباع بواسطة ..." أو "هاء منصة فقط")
2. ❌ لا يوجد سياسة إرجاع أو شحن موضحة في marketplace
3. ❌ لا يوجد توضيح للضريبة (VAT)
4. ❌ لا يوجد demo badge للمتاجر التجريبية
5. ❌ لا يوجد trust badge خاص بالمنصة
6. ❌ لا يوجد Maroof badge أو شهادات سعودية
7. ❌ لا يوجد chat support أو مساعدة مباشرة
8. ❌ الصفحة لا تحتوي على footer كامل مع روابط قانونية

### المخاطرة التجارية: عالية — الزوار لن يثقوا بالسوق بدون إفصاحات قانونية واضحة.

---

## Test Coverage Assessment

### Existing Tests (12 relevant)

| Test                                          | What it Covers                                               |
| --------------------------------------------- | ------------------------------------------------------------ |
| `marketplace-p0-2-category-blocklist.test.ts` | أن `prohibitedInMarketplace` موجود في الـ schema و migration |
| `marketplace-p0-3-access-token.test.ts`       | أن accessToken يعمل لربط الطلبات                             |
| `marketplace-p0-4-demo-isolation.test.ts`     | أن demo isolation تستخدم `shouldShowInMarketplace()`         |
| `marketplace-p0-5-audit.test.ts`              | أن audit logging شغال عند review/feature                     |
| `marketplace-demo.test.ts`                    | سلوك دوال `@haa/shared` المتعلقة بالديمو                     |
| `products-qa-regression.test.ts`              | QA عام للمنتجات وربط السوق                                   |
| `multi-tenancy.test.ts`                       | منع cross-tenant الوصول                                      |
| `demo-rules.test.ts`                          | دوال قواعد الديمو الأساسية                                   |
| `rbac-coverage.test.ts`                       | أن كل route عنده middleware حماية                            |
| `permissions.test.ts`                         | أن permission changes مقيدة بـ tenant                        |
| `oto-marketplace-platform-regression.test.ts` | OTO tenant isolation                                         |
| `marketing-events.test.ts`                    | منع cross-store slug manipulation                            |

### Missing Critical Tests

| Missing Test                                            | Impact                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------- |
| ❌ `marketplace/products` query correctness test        | P0 — لا يوجد اختبار أن الاستعلام يرجع فقط المنتجات `approved` |
| ❌ `marketplace/sellers` PII leak test                  | P0 — لا يوجد اختبار أن email/phone leak موجود                 |
| ❌ **لا يوجد test لـ `packages/marketplace-core/`**     | الحزمة بأكملها بدون اختبارات                                  |
| ❌ Marketplace review/moderation flow functional test   | P1 — لا اختبار لـ approve → visible / reject → hidden         |
| ❌ `prohibitedInMarketplace` filtering integration test | P1 — لا اختبار أن الفلتر يمنع التصنيفات المحظورة              |
| ❌ Cross-tenant data leakage via marketplace endpoints  | P1 — لا اختبار أن تاجر من tenant A يرى منتجات tenant B        |
| ❌ Multi-seller checkout isolation test                 | P1 — لا اختبار لخلط منتجات من متجرين                          |
| ❌ E2E marketplace → checkout → payment → order test    | P2 — لا اختبار شامل                                           |
| ❌ Rate limit bypass on marketplace endpoints           | P2                                                            |
| ❌ XSS/sanitization test on product/store names         | P2                                                            |

### الحكم: 🟠 التغطية الحالية (12 اختبارًا) تغطي الأساسيات لكنها غير كافية للإطلاق. 9+ اختبارات حرجة مفقودة.

---

## Recommended Execution Plan

### Phase 1: Launch Blockers (قبل أي شيء — 1-2 weeks)

| #   | Task                                                                    | Files                                                    |
| --- | ----------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | إزالة email/phone من `/marketplace/sellers` (P0-1)                      | `haa-marketplace.ts`                                     |
| 2   | إضافة `prohibitedInMarketplace` filter لكل استعلامات السوق (P0-2, P0-3) | `haa-marketplace.ts` (4 مواقع)                           |
| 3   | إضافة ضوابط SFDA للمنتجات المنظمة (P0-4) — منعها مؤقتًا                 | `products.ts`, `haa-marketplace.ts`, merchant dashboard  |
| 4   | إضافة `marketplaceStatus` مستقل للمتاجر (P0-5)                          | `stores.ts`, `haa-marketplace.ts`                        |
| 5   | حماية `POST /marketplace/orders` (P0-6)                                 | `haa-marketplace.ts`                                     |
| 6   | إضافة marketplace disclaimer قانوني (P1-4)                              | `MarketplaceEdition.tsx`, `MarketplaceProductDetail.tsx` |

### Phase 2: Compliance & Moderation (2-3 weeks)

| #   | Task                                                   |
| --- | ------------------------------------------------------ |
| 1   | إضافة Admin UI للمراجعة (marketplace moderation panel) |
| 2   | إضافة report abuse flow (API + UI)                     |
| 3   | إضافة demo badge في واجهة السوق                        |
| 4   | إضافة notification للتاجر عند رفض/تعليق منتجه          |
| 5   | إضافة batch review للأدمن                              |
| 6   | إضافة `complianceReview` للمنتجات المنظمة              |

### Phase 3: UX/Trust/Performance (2-3 weeks)

| #   | Task                                            |
| --- | ----------------------------------------------- |
| 1   | SEO محسّن مع structured data                    |
| 2   | سياسات واضحة (شحن، إرجاع، ضريبة) في صفحات السوق |
| 3   | Full-text search للعربية                        |
| 4   | Caching للـ marketplace                         |
| 5   | Trust badges ومنصة/toggle للبائعين              |
| 6   | Idempotency لـ POST /marketplace/orders         |

### Phase 4: Final Launch Gate

| #   | Check                                               |
| --- | --------------------------------------------------- |
| 1   | ✅ جميع P0 تم إصلاحها                               |
| 2   | ✅ جميع P1 تم إصلاحها أو لديها خطة معروفة           |
| 3   | ✅ اختبارات تغطي جميع الثغرات السابقة               |
| 4   | ✅ اختبارات tenant isolation و demo isolation ناجحة |
| 5   | ✅ مراجعة قانونية للـ disclaimers                   |
| 6   | ✅ التحقق من أن كل متجر marketplace لديه KYC معتمد  |
| 7   | ✅ إطلاق beta مع 3-5 متاجر مختارة فقط               |

---

## Final Professor-Level Judgment

### هل السوق العام جاهز الآن؟

**لا. السوق العام غير جاهز للإطلاق التجاري العام.**

### لماذا؟

1. **هيكل أساسي ممتاز** — الـ architecture قوي، العزل المدروس (demo isolation, tenant isolation, marketplace order linking, audit trail) يدل على هندسة متقنة. قاعدة البيانات مصممة جيدًا لفصل المخاوف.

2. **لكن السياسات والضوابط مفقودة** — السوق العام بدون:
   - حماية بيانات التجار (تسريب PII)
   - حماية تصنيفية (prohibitedInMarketplace غير مفعل)
   - حماية تنظيمية (SFDA, منتجات منظمة)
   - حماية تشغيلية (report abuse, seller suspension)
   - حماية قانونية (disclaimers, terms)

3. **الإدارة (Admin Moderation) غير مكتملة** — API موجود لكن لا توجد واجهة مستخدم كافية للإدارة اليومية للسوق. المراجعة اليدوية لمنتجات كثيرة مستحيلة بدون batch reviews و moderation queue.

4. **التجربة التجارية غير ناضجة** — الزائر لا يعرف من البائع، ما هي سياسة الإرجاع، هل الضريبة شاملة، وهل المنصة مسؤولة.

### ما القرار التجاري الأقل مخاطرة؟

**إطلاق محدود (Controlled Beta) مع متاجر مختارة فقط بعد إصلاح P0.**

### خطة الـ 5 مراحل المقترحة:

1. **الأسبوع 1-2:** إصلاح P0s الـ 6 (Launch Blockers)
2. **الأسبوع 3-4:** إضافة Admin UI للمراجعة + Report Abuse
3. **الأسبوع 5-6:** الـ disclaimers القانونية + تحسينات الثقة
4. **الأسبوع 7-8:** الاختبارات المفقودة + Smoke Tests
5. **الإطلاق:** Beta بـ 3-5 متاجر حقيقية بعد اجتياز Launch Gate

### ما أول 5 مهام يجب تنفيذها؟

1. إخفاء `email` و `phone` من `/marketplace/sellers/:storeSlug` (P0-1)
2. إضافة `WHERE prohibitedInMarketplace = false` في جميع استعلامات `haa-marketplace.ts` (P0-2, P0-3)
3. منع جميع المنتجات المنظمة مؤقتًا (حتى إضافة SFDA workflow) (P0-4)
4. إضافة حقل `marketplaceStatus` مستقل في `stores.ts` (P0-5)
5. حماية `POST /marketplace/orders` من الاستخدام بدون auth (P0-6)

**التقرير انتهى. جميع النتائج مبنية على قراءة الكود الفعلية وليس الافتراضات.**

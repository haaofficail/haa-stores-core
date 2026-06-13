# Haa Stores Core / هاء متاجر

منصة متاجر إلكترونية مستقلة، مبنية محليًا أولاً، مع إمكانية الربط مع منصة هاء عبر API/Webhooks مستقبلًا.

> **⛔ قرار: المشروع Local-Only.**
> ✅ **LC6 — Local Full Product Gate: PASS. Local Completion: 100%.**
> ✅ **Phase 1 — Production Readiness Foundation: PASS.**
> ✅ **Phase 2 — Real Payments Foundation & Sandbox: ✅ Review Gate PASS.**
> ✅ **Phase 3 — Shipping Pro Foundation & OTO-Ready Architecture: ✅ Review Gate PASS.**
> **⛔ No Deploy Policy: Active — النشر آخر خطوة، وليس الآن.**
> ✅ **جميع المراحل العشر مكتملة. 🎉 Deployment Readiness Gate: PASS.**
> **Owner GO required before staging. تطوير محلي فقط.**
> **مكتمل محليًا: نعم. جاهز للنشر: لا. جاهز للبيع التجاري: لا.**
> **المرحلة التالية:** `docs/POST_LC6_ROADMAP.md`.
> انظر `docs/NO_DEPLOY_POLICY.md` و `docs/LOCAL_COMPLETION_ROADMAP.md`.

## المتطلبات

- Node.js >= 20
- pnpm >= 9
- PostgreSQL (Homebrew أو Docker)

## التشغيل المحلي

```bash
# 1. تثبيت الاعتماديات
pnpm install

# 2. التأكد من تشغيل PostgreSQL
# Homebrew: brew services start postgresql@16

# 3. تشغيل الترحيلات (migrations)
pnpm db:migrate

# 4. إضافة البيانات التجريبية
pnpm db:seed

# 5. تشغيل الخوادم (3 terminals)
pnpm dev:api        # terminal 1 - API على :3000
pnpm dev:dashboard  # terminal 2 - لوحة التحكم على :5173
pnpm dev:storefront # terminal 3 - المتجر على :5174
```

## البيانات التجريبية

| البريد الإلكتروني | كلمة المرور | المتجر |
|------------------|------------|--------|
| ahmed@example.com | Test@123456 | haa-demo |

- ✔ 20 منتج في 7 تصنيفات (إلكترونيات، ملابس، منزل، عناية، أطفال، مكتبة، رياضة)
- ✔ 6 عملاء مع عناوين افتراضية
- ✔ 7 طلبات بحالات مختلفة (completed, shipped, processing, confirmed, cancelled, returned)
- ✔ شحن: 3 طرق (عادي، مجاني، استلام) × 3 مناطق (الرياض، جدة، الشرقية) = 9 أسعار
- ✔ محفظة مالية مع 2% رسوم منصة
- ✔ 4 كوبونات (SAVE10 ثابت، PERCENT20 نسبة، FREESHIP شحن مجاني، EXPIRED50 منتهي)
- ✔ 2 عروض ترويجية
- ✔ 5 سياسات منشورة (عن المتجر، الخصوصية، الاسترجاع، الشحن، الشروط)

## الأوامر المتاحة

| الأمر | الوصف |
|-------|-------|
| `pnpm dev:api` | تشغيل API محليًا (port 3000) |
| `pnpm dev:dashboard` | تشغيل لوحة التحكم (port 5173) |
| `pnpm dev:storefront` | تشغيل المتجر (port 5174) |
| `pnpm build` | بناء جميع الحزم |
| `pnpm typecheck` | التحقق من الأنواع |
| `pnpm test` | تشغيل اختبارات الوحدة (668 اختبار في 23 ملف) |
| `pnpm smoke` | تشغيل الاختبار الشامل (28 اختبار، يتطلب الخدمات) |
| `pnpm test:watch` | تشغيل الاختبارات مع المتابعة |
| `pnpm env:check` | التحقق من البيئة المحلية |
| `pnpm db:generate` | إنشاء migration جديد |
| `pnpm db:migrate` | تشغيل الترحيلات |
| `pnpm db:seed` | إضافة البيانات التجريبية (آمن للتكرار) |
| `pnpm db:reset` | حذف وإعادة بناء قاعدة البيانات + ترحيل + بذر |
| `pnpm db:backup` | نسخ احتياطي لقاعدة البيانات |
| `pnpm db:restore` | استعادة نسخة احتياطية |
| `pnpm db:studio` | فتح Drizzle Studio |
| `pnpm setup` | تثبيت + تشغيل + ترحيل + بذر (أمر واحد) |

## المستخدمين

- **تاجر**: `http://localhost:5173` — لوحة تحكم كاملة (منتجات، طلبات، شحن، محفظة)
- **عميل**: `http://localhost:5174/s/haa-demo` — متجر عام (تصفح، شراء، تتبع)

## العمارة

```
apps/api (Hono REST API :3000)
  ├── merchant routes (/merchant/:storeId/*) ← JWT auth
  ├── storefront routes (/s/:slug/*) ← public
  ├── admin routes (/admin/*) ← Admin JWT auth
  └── webhooks (/webhooks/*)

apps/merchant-dashboard (React :5173) ← Vite proxy /api → :3000
apps/storefront (React :5174) ← Vite proxy /api → :3000
apps/admin-dashboard (React :5175) ← Vite proxy /admin → :3000

packages/
  ├── auth-core        JWT + middleware + admin auth
  ├── commerce-core    منتجات/طلبات/سلة/دفع/امتثال/اشتراكات/AI
  ├── shipping-core    شحن (Manual + HaaMock + OTO skeleton)
  ├── wallet-core      دفتر الأستاذ المالي
  ├── integration-core سجلات تدقيق + Webhook + API keys
  ├── notification-core إشعارات (templates + logs)
  ├── db               Drizzle schema + seed
  ├── shared           ثوابت + أنواع
  ├── tokens           Design tokens (CSS variables)
  └── ui               shadcn/ui components
```

## استراتيجية التفوق / Differentiation Strategy

> هاء متاجر ليست نسخة من سلة أو زد. هدفها: منصة متاجر سعودية **أسهل وأوضح ماليًا وتشغيليًا**.

**الأولوية للوضوح والبساطة** قبل كثرة المزايا. أي ميزة لا تساعد التاجر على الإطلاق الأسرع، الإدارة الأسهل، الفهم المالي الدقيق، أو الشحن البسيط — **تؤجل**.

انظر `docs/PRODUCT_STRATEGY.md` للتفاصيل الكاملة.

## السلامة (Public API)

- `cost` مقصوص من جميع استجابات المنتجات والسلة العامة
- المعرفات الداخلية (`id`, `storeId`, `checkoutSessionId`, `idempotencyKey`) مقصوصة من تتبع الطلبات
- المتجر غير النشط يرجع 404 وليس 403
- التتبع يتطلب رقم هاتف صحيح
- الكاش آوت مقاوم للتكرار (idempotencyKey)
- سجل المحفظة داخل نفس transaction الطلب

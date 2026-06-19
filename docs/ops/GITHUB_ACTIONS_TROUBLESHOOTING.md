# GitHub Actions Troubleshooting Guide

> دليل تشغيل وصيانة CI لمشروع Haa Stores Core.
> آخر تحديث: 2026-06-20 — TASK-0054.

## 1. قاعدة التعامل مع الفشل

لا تعالج عدد رسائل الخطأ؛ ابحث عن أول سبب جذري في كل job. خطأ واحد في ترتيب بناء حزم
workspace قد ينتج مئات أخطاء `Cannot find module`. وفشل تهيئة قاعدة البيانات قد يظهر
كعشرات اختبارات فاشلة.

ابدأ دائمًا بهذه الأوامر:

```bash
gh auth status
gh pr checks <PR_NUMBER>
gh run view <RUN_ID> --json status,conclusion,jobs,url
gh run view <RUN_ID> --log-failed
```

إذا كانت الجولة لا تزال تعمل، استخرج سجل job مباشرة:

```bash
gh run view <RUN_ID> --json jobs \
  --jq '.jobs[] | {name,databaseId,status,conclusion}'

gh api /repos/haaofficail/haa-stores-core/actions/jobs/<JOB_ID>/logs
```

## 2. البنية الصحيحة للـCI

### Preflight

- Node.js 22 وpnpm 10.
- `pnpm install --frozen-lockfile`.
- `pnpm preflight`.

### Typecheck وBuild

حزم monorepo تشير إلى مخرجات `dist`. لذلك يجب بناء الحزم قبل التطبيقات:

```bash
pnpm -r --filter './packages/**' --workspace-concurrency=1 build
pnpm --filter @haa/<app> build
```

يُمنع بناء التطبيق منفردًا على checkout نظيف قبل هذه الخطوة.

### Test

الاختبارات تتضمن مسارات تستخدم PostgreSQL فعليًا، لذلك يحتاج job إلى:

1. PostgreSQL 16 service.
2. `DATABASE_URL` و`TEST_DATABASE_URL` يشيران إلى القاعدة نفسها.
3. `pnpm db:bootstrap` للقاعدة الجديدة.
4. `pnpm db:seed`.
5. `pnpm test`.

لا تستخدم `pnpm db:migrate` مباشرة على قاعدة فارغة. سلسلة migrations التاريخية تحتوي
إصلاحات متداخلة، والمسار المعتمد للقاعدة الجديدة هو `db:bootstrap`.

### E2E

قبل Playwright:

1. تثبيت Chromium.
2. بناء حزم workspace.
3. bootstrap + seed.
4. تشغيل API على 3000.
5. تشغيل merchant-dashboard على 5173.
6. تشغيل storefront على 5174.
7. تشغيل admin-dashboard على 5175.
8. انتظار HTTP 200 من جميع الخدمات.

## 3. الأعطال التي عولجت وأسبابها

| العرض                                  | السبب الجذري                           | الحل                                             |
| -------------------------------------- | -------------------------------------- | ------------------------------------------------ |
| مئات `Cannot find module @haa/*`       | التطبيق بُني قبل حزم workspace         | بناء `packages/**` أولًا                         |
| اختبارات `ECONNREFUSED :5432`          | Test job بلا PostgreSQL                | إضافة service وتهيئة القاعدة                     |
| `total_spent cannot be cast`           | migration بلا `USING` ومع default قديم | إسقاط default، cast صريح، إعادة default          |
| duplicate tables/columns أثناء migrate | استخدام المسار الخطأ لقاعدة جديدة      | استخدام `pnpm db:bootstrap`                      |
| `/Users/thwany/...` غير موجود          | مسار جهاز مطور داخل سكربت              | اشتقاق المسار من `import.meta.url`               |
| duplicate subscription plan            | seed يزرع الخطط مرتين                  | إعادة استخدام الصف حسب `code`                    |
| checkout cart FK failure               | UUID عشوائي بدل cart موجود             | إنشاء cart واستخدام ID المرجع                    |
| tests تبحث عن `haastores_test`         | غياب `TEST_DATABASE_URL`               | تعيينه صراحةً                                    |
| API/storefront لا يبدأان في E2E        | حزم workspace غير مبنية                | بناء الحزم قبل dev servers                       |
| dashboard E2E connection refused       | workflow لم يشغّل التطبيقين            | تشغيل وانتظار جميع التطبيقات                     |
| زر السلة موجود لكنه مخفي               | الاختبار اختار نسخة carousel مخفية     | استخدام locators مرئية فقط                       |
| زر مرئي ينفصل عند النقر                | hydration يستبدل عقدة DOM              | انتظار `networkidle` وإرسال الحدث للعقدة الحالية |
| API Docker install يفشل في Husky       | production install يشغّل root prepare  | `--ignore-scripts` في طبقة production            |

## 4. التحقق المحلي قبل الرفع

```bash
pnpm preflight
pnpm typecheck
pnpm lint
pnpm test
pnpm -r --filter './packages/**' --workspace-concurrency=1 build
pnpm --filter @haa/api build
pnpm --filter @haa/merchant-dashboard build
pnpm --filter @haa/admin-dashboard build
pnpm --filter @haa/storefront build
```

لـE2E يلزم PostgreSQL وتشغيل التطبيقات الأربعة. إذا لم يتوفر Docker محليًا، يجب اعتبار
GitHub runner هو تحقق Docker/E2E النهائي، ولا يجوز إعلان الإغلاق قبل نجاح الجولة هناك.

## 5. قواعد منع التكرار

- لا تضف مسارات مطلقة تبدأ بـ `/Users/` أو `/home/<user>/`.
- كل fixture يحمل FK يجب أن ينشئ الصف الأب أولًا.
- كل seed يجب أن يكون قابلًا لإعادة التشغيل أو يعيد استخدام المفاتيح الفريدة.
- اختبارات E2E تختار العناصر المرئية والقابلة للتفاعل، لا أول عنصر في DOM.
- أي تطبيق تضيفه إلى E2E يجب تشغيله وإضافته إلى readiness checks.
- أي حزمة workspace جديدة يجب أن تدخل في build-before-app contract.
- لا تُدمج PR قبل نجاح جميع checks المطلوبة.

## 6. عند فشل النشر

افصل بين مرحلتين:

1. **Build & Push**: فشل Dockerfile أو dependency install.
2. **Deploy to Staging**: أسرار SSH، مسار الخادم، pull، health check.

إذا فشل Docker:

```bash
gh run view <DEPLOY_RUN_ID> --log-failed
```

تحقق من:

- بناء حزم workspace قبل التطبيق.
- وجود manifests لكل workspace أثناء `pnpm install`.
- عدم تشغيل Husky في production-only install.
- تطابق Node/pnpm مع CI.

إذا نجحت الصور وفشل SSH أو health check، فالمشكلة تشغيلية على الخادم وليست build.

## 7. تعريف الإغلاق

لا تعتبر المشكلة محلولة إلا عند تحقق الآتي:

- Preflight ✅
- Typecheck ✅
- Lint ✅
- Test ✅
- Build API ✅
- Build Merchant Dashboard ✅
- Build Admin Dashboard ✅
- Build Storefront ✅
- E2E ✅
- لا توجد ملفات مرتبطة بالإصلاح غير مرفوعة
- TASK_TRACKER وCURRENT_STATE وCHANGELOG محدثة

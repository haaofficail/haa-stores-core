# تقرير تدقيق الجودة — يونيو 2026

فحص جودة متعدد الوكلاء على نظام Haa Stores (storefront / merchant-dashboard / admin-dashboard / api / packages). يوثّق هذا الملف كل مشكلة وُجدت وحالة إصلاحها.

> الحالة: ✅ مُصلح | 🔧 قيد الإصلاح | 📋 متابعة لاحقة

## أمان (Security)

| # | المشكلة | الموضع | الخطورة | الحالة |
|---|---------|--------|---------|--------|
| S1 | XSS مخزّن عبر JSON-LD — أسماء منتجات/متاجر يتحكّم بها التاجر تُحقن في `<script ld+json>` بلا تهريب `<>&` | `apps/storefront/src/lib/jsonld.ts` | عالية | ✅ PR #19 — `escapeJsonLd()` |
| S2 | منقّي HTML بـ regex قابل للتجاوز (blocklist) → XSS من محتوى أقسام التاجر | `apps/storefront/src/themes/base-elegant/HomePage.tsx:431` | عالية | ✅ PR #21 (DOMPurify) |
| S3 | IDOR — `/order/:orderNumber` يتجاهل فحص الهاتف → قراءة طلبات أي عميل بتخمين الرقم (PII) | `apps/api/src/routes/storefront/checkout.ts:246` | عالية | ✅ PR #21 |
| S4 | JWT في query string عند redirect (يتسرّب عبر Referer/سجلّات/تاريخ) | `apps/api/src/routes/auth.ts:288` | متوسطة-عالية | 📋 يتطلب تنسيق api+dashboard (OAuth خامل) |
| S5 | مقارنة توقيع webhook غير ثابتة الزمن (`===`) → timing attack لتزوير دفعة | `packages/payment-providers/{moyasar,geidea,tabby,tamara}.ts` | متوسطة | ✅ PR #21 |
| S6 | تسريب PII في سجلّات الإشعارات (المستلم + محتوى الرسالة) | `packages/notification-core/src/index.ts:27` | متوسطة | ✅ PR #19 — خلف `NOTIFICATION_DEBUG` |
| S7 | دفع وهمي (`fake_card_success`) + تحذير "لن يُخصم مبلغ" يظهران في الإنتاج بلا حارس بيئة | `apps/storefront/src/pages/Checkout.tsx:57,498` | عالية | ✅ PR #21 (حُصر بالتطوير) |

## صحّة وظيفية (Correctness)

| # | المشكلة | الموضع | الحالة |
|---|---------|--------|--------|
| C1 | فلاتر/بحث/فرز السوق متجاهلة تماماً — الـ route لا يمرّرها للـ service | `apps/api/src/routes/storefront/products.ts:16` | ✅ PR #20 |
| C2 | `/brands` و`/tags` تُرجع صفوف خام تسرّب حقول داخلية (لا DTO) | `apps/api/src/routes/storefront/products.ts:63` | ✅ PR #20 |
| C3 | `ShippingRate.perKgRate` غير مُرجَع → `undefined`/`NaN` في الواجهة | `apps/api/src/routes/storefront/checkout.ts:109` | ✅ PR #20 |
| C4 | بعد التسجيل توجيه لـ `/admin` (لا مسار) → "غير موجود" | `apps/storefront/src/pages/Auth.tsx` | ✅ PR #18 — لوحة التاجر |
| C5 | 9 `catch {}` صامتة تبتلع أخطاء التكاملات | `apps/api/src/routes/marketplaces.ts` | ✅ PR #20 |

## روابط / أصول / علامة (سبق إصلاحها)

| # | المشكلة | الحالة |
|---|---------|--------|
| L1 | نطاق `haasoft.com` الممنوع (كود + docs + tests) | ✅ PR #18/#17 |
| L2 | شعار CITC مكسور (`citc.png` غير موجود) | ✅ PR #18 |
| L3 | لون العلامة #007aff بدل #5c9cd5 خارج `#storefront-scope` | ✅ PR #18 |
| L4 | روابط لاندينق مكسورة (/market,/blog,/contact,/help,/privacy) | ✅ PR #18 |
| L5 | رابط `/admin` مكسور في ErrorBoundary الأدمن | ✅ PR #19 |
| L6 | هاتف وهمي في فوتر السوق | ✅ PR #19 |

## وصولية (a11y)

| # | المشكلة | الموضع | الحالة |
|---|---------|--------|--------|
| A1 | StorefrontMockup: أزرار أيقونية بلا aria-label، div/span قابلة للنقر بلا keyboard | `landing/sections/StorefrontMockup.tsx` | ✅ PR #22 (حُذف كود ميت) |
| A2 | dialogs بلا Escape/focus-trap/initial-focus | `StorefrontMockup.tsx`, `MarketplaceProductDetail.tsx:495` | ✅ PR #22 |
| A3 | `StoreInput/Textarea/Select` يشتق id من نص عربي → معرّفات مكررة | `components/ui/index.tsx:158,198,234` | ✅ PR #22 |

## صيانة (Maintainability) — متابعة

| # | المشكلة | الحالة |
|---|---------|--------|
| M1 | تكرار ErrorBoundary (3 تطبيقات، ~270 سطر) | 📋 |
| M2 | تكرار api client (3 تطبيقات) | 📋 |
| M3 | ~41 `eslint-disable` مؤجّلة (هجرة P1-#5 lucide→Icon) | 📋 |
| M4 | 2FA ناقص على حذف الحساب (PDPL) + لا تنفيذ لمهمة الحذف بعد 30 يوماً | 📋 |
| M5 | 148 `any` في `merchant-dashboard/src/lib/api.ts` | 📋 |

## مراجعة كود MarketplaceProductDetail (R)

| # | المشكلة | الحالة |
|---|---------|--------|
| R1 | عدم اتساق `isDemoStore` (الشارة تستخدم `product.isDemoStore`، الثقة تستخدم `product.store.isDemoStore`) | ✅ PR #22 — مصدر موحّد |
| R2 | الكمية لا تُصفّر عند تغيير المنتج ولا تُقيّد بالمخزون قبل الإضافة | ✅ PR #22 — تصفير + `safeQuantity()` |
| R3 | Race condition في جلب المنتج (نتيجة طلب قديم تستبدل الجديد) | ✅ PR #22 — حارس `cancelled` |
| R4 | `similarProducts` تبقى من منتج سابق عند غياب `categorySlug` | ✅ PR #22 — مسح فوري + else |
| R5 | `merchantProductUrl` يُمرّر لـ `Link` بلا تحقق (رابط خارجي محتمل) | ✅ PR #22 — يقبل المسارات الداخلية فقط |
| R6 | المنتجات المشابهة قد تقل عن 4 (limit:4 ثم استبعاد الحالي) | ✅ PR #22 — limit:8 ثم slice(4) |
| R7 | لون خصم hardcoded `#dc2626` | ✅ PR #22 — `bg-danger` |
| R8 | صور API بلا سياسة referrer | ✅ PR #22 — `referrerPolicy="no-referrer"` |
| R9 | معاينة الصورة بلا Escape/إغلاق خارجي | ✅ PR #22 — Escape + autoFocus + click-outside |

## مراجعة كود About (AB)

| # | المشكلة | الحالة |
|---|---------|--------|
| AB1 | حالة التحميل تستخدم `id="main-content"` خارج `storefront-scope` | ✅ PR #23 — `storefront-scope` في الحالتين |
| AB2 | `t('about.title')` و`t('about.description')` بلا fallback | ✅ PR #23 |
| AB3 | عنوان SEO يظهر "عن المتجر - " قبل تحميل المتجر | ✅ PR #23 — شرطي |
| AB4 | الوصف مكرر حرفياً في الهيرو والبطاقة السفلية | ✅ PR #23 — البطاقة صارت "قصة المتجر" + اسم المتجر في الهيرو |
| AB5 | الكروت الأربعة مكررة يدوياً | ✅ PR #23 — مصفوفة + map |
| AB6 | استيراد lucide مباشر (P1-#5) | ✅ PR #23 — عبر `<Icon>` (هجرة فعلية لهذا الملف) |

## مراجعة كود Home (H)

| # | المشكلة | الحالة |
|---|---------|--------|
| H1 | `const [, setLoading]` تُضبط ولا تُقرأ → الصفحة تُعرض والمنتجات فارغة | ✅ PR #24 — `contentLoading` + skeleton |
| H2 | لا حاجة لـ scope على Home (موجود من Layout عبر Outlet) | ℹ️ مقصود — إضافته = id مكرر (حذّر منه المراجع) |
| H3 | Race condition عند تبديل المتجر | ✅ PR #24 — حارس `cancelled` + تصفير |
| H4 | مفاتيح ترجمة بلا fallback | ✅ PR #24 |
| H5 | فشل `addItem` غير معالج | ✅ PR #24 — `try/catch` + `toast.error` |
| H6 | `window.location.href` يعيد تحميل كامل | ✅ PR #24 — `useNavigate` |

## مراجعة صفحات السوق/التتبع (دفعة ثانية)

### MarketplaceCheckout (MC)
| # | المشكلة | الحالة |
|---|---------|--------|
| MC1 | `fake_card_success` افتراضي ومعروض في الإنتاج | ✅ PR #25 — محصور خلف `import.meta.env.DEV`، الإنتاج COD |
| MC2 | ضغط مزدوج على الإرسال | ✅ PR #25 — `if (submitting) return` |
| MC3 | `catch (error: any)` | ✅ PR #25 — `unknown` + رسالة آمنة |
| MC4 | idempotency لكل session فقط | ✅ PR #25 — مفتاح واحد للمحاولة `key:slug` |
| MC5 | access token في localStorage | ✅ PR #25 — `sessionStorage` + try/catch |
| MC6 | **Orchestration متعدد المتاجر في الواجهة + partial failure + لا اختيار شحن** | 📋 **P0 معماري** — يجب نقله لـ endpoint backend واحد (`POST /marketplace/checkout`) بـ idempotency وtracking موحّد ومعالجة الفشل الجزئي + عرض/اختيار الشحن. لا يُنفّذ بالواجهة. |

### MarketplaceSellers (MS) / MarketplaceCart (CART) / MarketplaceOrderTrack (OT) / TrackOrder (TO) / TrackOrderResult (TOR)
| # | المشكلة | الحالة |
|---|---------|--------|
| MS1 | فشل API يظهر كـ"لا يوجد بائعون" | ✅ PR #25 — error state منفصل |
| MS2 | لا cancellation guard | ✅ PR #25 |
| MS3 | صور بلا referrer/lazy، productCount undefined | ✅ PR #25 |
| CART1 | كمية صفر/سالبة | ✅ PR #25 — حذف عند ≤0 |
| CART2 | أسعار NaN | ✅ PR #25 — `formatAmount` |
| CART3 | `productUrl` بلا تحقق داخلي | ✅ PR #25 — مسار داخلي فقط |
| CART4 | أيقونات/referrer/type=button | ✅ PR #25 |
| OT1 | إعادة كتابة access_token في URL | ✅ PR #25 — يُمسح بعد القراءة |
| OT2 | token في localStorage | ✅ PR #25 — sessionStorage |
| OT3 | race في load + اعتماد على accessToken | ✅ PR #25 — requestId guard + signature صريح |
| OT4 | زر الاستعلام يتجاهل الرقم المكتوب + لا sync | ✅ PR #25 |
| OT5 | تسمية "المنتجات" لحالة التنفيذ + NaN | ✅ PR #25 |
| TO1 | لا storefront-scope | ✅ PR #25 |
| TO2 | ترجمة بلا fallback، encode، مفتاح sessionStorage بـ slug | ✅ PR #25 |
| TOR1 | loading للأبد عند غياب slug/orderNumber | ✅ PR #25 — `setLoading(false)` |
| TOR2 | scope + cancellation + مفتاح موحّد + NaN + fallbacks | ✅ PR #25 |

## مراجعة App/CSS/Tailwind/Registry/التغطية (دفعة ثالثة)

| # | المشكلة | الحالة |
|---|---------|--------|
| APP1 | `/about` العام يستخدم صفحة متجر (`useStore` بلا slug → skeleton للأبد) | ✅ PR #26 — توجيه `/about` → `/` |
| APP2 | `/fake-3ds-challenge` متاح في الإنتاج | ✅ PR #26 — محصور خلف `import.meta.env.DEV` |
| CSS1 | **تعليق `.auth-scope` بلا `/*` افتتاحي → قاعدة auth-scope تُسقَط + تحذير unterminated string** | ✅ PR #26 — أُضيف `/*` (build نظيف) |
| CSS2 | كتلة `#storefront-scope {}` فارغة | ✅ PR #26 — أُزيلت |
| CASE1 | ادّعاء case-sensitivity (ملفات lowercase) | ✅ إيجابية كاذبة — الملفات PascalCase فعلاً، `forceConsistentCasingInFileNames:true` مضبوط، CI/Linux يبني طوال اليوم |
| CSS3 | Splide/Aurora global غير معزولة، font `!important` على كل عنصر، RTL `[dir=rtl]` selector، color-mix fallback | 📋 متابعة — تحسينات عزل CSS (غير حاجبة) |
| APP3 | `StoreNotFound` كـ 404 عام بدل `PlatformNotFound`؛ PageSkeleton عام | 📋 متابعة (المراجع أقرّ أن skeleton عام بلا id مقبول) |
| TW1 | tailwind: surface/text/status قيم ثابتة بدل CSS vars (اتساق الثيم) | 📋 متابعة — تغيير color-resolution عام، يتطلب تحقق بصري |
| REG1 | Theme Registry بلا guard ضد التسجيل المكرر (HMR/tests) | 📋 متابعة — idempotency في `@haa/storefront-themes` |
| COV1 | **تغطية اختبارات منخفضة في المسارات الحرجة** (shipping-core 10%, theme-system 8%, payment-providers 20%, api routes branch/fn 0%, commerce-core 30%) | 📋 **P0 اختبارات** — رفع التغطية في الدفع/الشحن/الطلبات/routes (نجاح+فشل+3DS+مخزون+عزل) قبل الإطلاق التجاري |

## مراجعة Dockerfile/Auth/Cart/Checkout (دفعة رابعة)

### Dockerfile (DK) — أغلبها إيجابيات كاذبة/تحسينات
| # | المشكلة | الحالة |
|---|---------|--------|
| DK1 | `/healthz` غير موجود في nginx.conf | ✅ إيجابية كاذبة — موجود (nginx.conf:72) |
| DK2 | `.dockerignore` ناقص | ✅ إيجابية كاذبة — موجود وقوي |
| DK3 | casing لـ SarIcon/ملفات | ✅ إيجابية كاذبة — PascalCase فعلاً |
| DK4 | `MAINTAINER` ARG غير معاد تعريفه في stages، cache، non-root nginx، BuildKit | 📋 متابعة (تحسينات/label تجميلي، البناء يعمل) |

### Auth (AU) — آمن
| # | المشكلة | الحالة |
|---|---------|--------|
| AU1 | توليد slug من اسم عربي ينتج فارغاً (`\w`) | ✅ PR #27 — `normalizeStoreSlug` (NFKD) |
| AU2 | slug يتوقف بعد أول حرف (لا slugTouched) | ✅ PR #27 — `slugTouched` |
| AU3 | لا تحقق من صيغة الجوال | ✅ PR #27 — `/^05\d{8}$/` قبل الإرسال |
| AU4 | WaitlistPage نجاح وهمي | ✅ لا يدّعي حفظاً — مقبول |
| AU5 | `id=storefront-scope` بدل auth-scope (عزل) | 📋 متابعة — عملياً منخفض الأثر (auth خارج متجر؛ التوكن #5c9cd5)، تغييره يمسّ focus styles |
| AU6 | أرقام تسويقية hardcoded، Nav authMode | 📋 متابعة |

### Cart (CT) — آمن
| # | المشكلة | الحالة |
|---|---------|--------|
| CT1 | كوبون قديم بعد تغيّر السلة | ✅ PR #27 — مسح عند التغيّر |
| CT2 | NaN في الأسعار | ✅ PR #27 — `toMoneyNumber/formatAmount` |
| CT3 | إجمالي سالب | ✅ PR #27 — `Math.max(0,...)` |
| CT4 | maxQty: `Math.max(1, undefined)=NaN`، 0→1 يسمح بالشراء | ✅ PR #27 — stock آمن + isOutOfStock |
| CT5 | `slug!`/`cart!` | ✅ PR #27 — guards |
| CT6 | كوبون/سعر يعتمد على الواجهة | 📋 backend يحسم (موثّق) |

### Checkout (CO) — آمن طُبّق، تدفّق الدفع مؤجّل لاختبار مخصّص
| # | المشكلة | الحالة |
|---|---------|--------|
| CO1 | NaN في الأسعار | ✅ PR #27 — `toMoneyNumber` |
| CO2 | currentStep يخرج عن النطاق عند تغيير fulfillment | ✅ PR #27 — clamp |
| CO3 | **خطوات checkout تنكسر مع pickup (فهارس ثابتة)** | 📋 **P0** — refactor لمفاتيح الخطوات (`step keys`)، يتطلب اختبار تدفّق الدفع |
| CO4 | idempotencyKey يتغيّر كل ضغطة | 📋 P1 — مفتاح ثابت لكل محاولة (useRef) |
| CO5 | مسح السلة قبل اكتمال 3DS/BNPL | 📋 P1 — مسح بعد callback مؤكّد فقط |
| CO6 | redirectUrl بلا allowlist، callback URLs، VAT naming | 📋 P1 — تشديد + اختبار |
| CO7 | `: any` في cart.items + دين `item.item?` | 📋 متابعة — يتطلب تنظيف شكل الـ item |

## Batch 3 — Marketplace Orchestration (B3 / MC6) — production-safe via gating

**القرار:** بناء endpoint backend موحّد بـ rollback يتطلب إعادة هيكلة دفع متعدّد المتاجر (مخاطر دفع حقيقية — قاعدة AGENTS/التاسك 15: سلامة الإنتاج أولاً). الإغلاق الـ production-safe المقبول في التاسك = **feature-gating**.

| البند | الحالة |
|---|---|
| MC6 orchestration بالواجهة (خطر orphan عند فشل جزئي) | ✅ **production-safe** — `MARKETPLACE_CHECKOUT_ENABLED` (DEV أو `VITE_ENABLE_MARKETPLACE_CHECKOUT`) — معطّل في الإنتاج، submit + render محروسان، 3 اختبارات |

### عقد الـ endpoint المطلوب لاحقاً (لرفع الحظر بالكامل)
`POST /api/marketplace/checkout` — الواجهة ترسل **intent فقط**:
```
{ items:[{storeSlug,productId,quantity}], customer, shippingAddress, paymentMethod, idempotencyKey }
```
الـ backend (في معاملة واحدة): تحقّق المنتجات/النشر/التاجر · إعادة حساب الأسعار/VAT/الشحن من DB · تحقّق المخزون الذرّي · تجميع per-seller · إنشاء master order + child orders + links · idempotency على المفتاح · rollback عند أي فشل · جلسة دفع موحّدة. الواجهة لا تحسم ماليّاً ولا تنشئ child orders.
**ملاحظة:** المسارات ذات إعادة التوجيه (card/BNPL/3DS) تحتاج تصميم callback موحّد — لذلك البناء الكامل خارج نطاق جلسة واحدة آمنة.

## تدقيق المجالات الأربعة (واتساب/تكاملات/ولاء/دومين) — معايير عالمية

### واتساب وحملاته — موجود، لكن P0 امتثال
| # | المشكلة | الخطورة | الحالة |
|---|---------|---------|--------|
| WA1 | لا consent/opt-in — يُرسل لكل العملاء | P0 | ✅ عمود `whatsapp_marketing_consent` (افتراضي false) + فلترة resolveRecipients (migration 0069) |
| WA2 | رسائل حرة بلا قوالب WABA معتمدة + لا نافذة 24س | P0 | 📋 سجل قوالب + type:template + inbound webhook |
| WA3 | لا opt-out | P0 | 🟡 عمود `whatsapp_opt_out` + فلترة مضافان؛ inbound webhook لكلمة STOP (WA2) لاحقاً |
| WA4 | إعادة دخول/إرسال مكرر (status='running' غير محروس، انتهاء القفل) | P1 | ✅ حارس running مضاف (atomic claim لاحقاً) |
| WA5 | "sent" وهمي (fallback deeplink يُحتسب مُرسلاً) + لا تتبّع تسليم | P1 | 📋 webhook تسليم + عدم احتساب fallback |
| WA6 | rate-limit ثابت بلا 429 backoff؛ مسار السلة المهجورة بلا throttle | P2 | 📋 |
| WA7 | tenant isolation / authz | ✅ سليم |

### التكاملات (salla/noon/amazon/zid) — موجودة، P0 أمني
| # | المشكلة | الخطورة | الحالة |
|---|---------|---------|--------|
| INT1 | **بيانات اعتماد القنوات plaintext** | **P0** | ✅ مُشفّرة AES-256-GCM (`credential-cipher.ts`) في القنوات الأربع، متوافق مع القديم (decrypt fallback)، 4 اختبارات. (migration backfill للصفوف القديمة لاحقاً — تُعاد تشفيرها عند أول كتابة) |
| INT2 | لا timeouts على fetch الصادر (sync يعلّق المجموعة) | P1 | 📋 `AbortSignal.timeout` (~12 موضع، آمن) |
| INT3 | لا 429/Retry-After handling | P1 | 📋 |
| INT4 | لا retry/backoff (idempotency-aware) | P1 | 📋 |
| INT5 | لا inbound webhooks (polling فقط) → توقيع/dedup N/A لكن غياب ingestion ملاحظة | P1 | 📋 |
| INT6 | per-SKU `catch{}` يبتلع سبب الخطأ + لا details في syncLogs | P2 | 📋 |
| INT7 | tenant isolation عبر storeId سليم (لا tenantId عمود — defense-in-depth) | P2 | 📋 |

### الولاء — غير مبني (تصميم جاهز)
لا schema/خدمة. تصميم كامل أُنتج: `loyalty.ts` (rules/accounts/transactions ledger مثل wallet) + `packages/loyalty-core` (earn/redeem/expiry نقي مختبَر) + 3 مسارات API (تاجr/عميل/earn-hook) + ربط في payment-webhook + COD + checkout + idempotency بـ partial-unique index. **الجهد ≈ 8.5-9.5 يوم**. = **بناء متعدّد الجلسات**.

### ربط دومين خارجي — غير مبني (تصميم جاهز، infra يحتاج موافقتك)
لا حقل domain. تصميم كامل: أعمدة stores (customDomain/status/token/ssl) + `packages/shared/custom-domain.ts` (normalize/verify نقي) + `resolveStoreByHost` + `GET /api/resolve-host` + bootstrap SPA لمضيف مخصّص. **TLS عبر Caddy on-demand مع `ask` guard** — يتطلب تعديل `Caddyfile` + DNS (CNAME→stores.haastores.com→72.61.108.208) = **يحتاج موافقتك الصريحة (CLAUDE.md)**. الجهد ≈ 7-11 يوم. مخاطر: domain takeover, cert-exhaustion DoS, host-header injection (محلولة بالتصميم).

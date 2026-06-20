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

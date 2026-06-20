# تقرير تدقيق الجودة — يونيو 2026

فحص جودة متعدد الوكلاء على نظام Haa Stores (storefront / merchant-dashboard / admin-dashboard / api / packages). يوثّق هذا الملف كل مشكلة وُجدت وحالة إصلاحها.

> الحالة: ✅ مُصلح | 🔧 قيد الإصلاح | 📋 متابعة لاحقة

## أمان (Security)

| # | المشكلة | الموضع | الخطورة | الحالة |
|---|---------|--------|---------|--------|
| S1 | XSS مخزّن عبر JSON-LD — أسماء منتجات/متاجر يتحكّم بها التاجر تُحقن في `<script ld+json>` بلا تهريب `<>&` | `apps/storefront/src/lib/jsonld.ts` | عالية | ✅ PR #19 — `escapeJsonLd()` |
| S2 | منقّي HTML بـ regex قابل للتجاوز (blocklist) → XSS من محتوى أقسام التاجر | `apps/storefront/src/themes/base-elegant/HomePage.tsx:431` | عالية | 🔧 |
| S3 | IDOR — `/order/:orderNumber` يتجاهل فحص الهاتف → قراءة طلبات أي عميل بتخمين الرقم (PII) | `apps/api/src/routes/storefront/checkout.ts:246` | عالية | 🔧 |
| S4 | JWT في query string عند redirect (يتسرّب عبر Referer/سجلّات/تاريخ) | `apps/api/src/routes/auth.ts:288` | متوسطة-عالية | 🔧 |
| S5 | مقارنة توقيع webhook غير ثابتة الزمن (`===`) → timing attack لتزوير دفعة | `packages/payment-providers/{moyasar,geidea,tabby,tamara}.ts` | متوسطة | 🔧 |
| S6 | تسريب PII في سجلّات الإشعارات (المستلم + محتوى الرسالة) | `packages/notification-core/src/index.ts:27` | متوسطة | ✅ PR #19 — خلف `NOTIFICATION_DEBUG` |
| S7 | دفع وهمي (`fake_card_success`) + تحذير "لن يُخصم مبلغ" يظهران في الإنتاج بلا حارس بيئة | `apps/storefront/src/pages/Checkout.tsx:57,498` | عالية | 🔧 |

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
| A1 | StorefrontMockup: أزرار أيقونية بلا aria-label، div/span قابلة للنقر بلا keyboard | `landing/sections/StorefrontMockup.tsx` | 🔧 |
| A2 | dialogs بلا Escape/focus-trap/initial-focus | `StorefrontMockup.tsx`, `MarketplaceProductDetail.tsx:495` | 🔧 |
| A3 | `StoreInput/Textarea/Select` يشتق id من نص عربي → معرّفات مكررة | `components/ui/index.tsx:158,198,234` | 🔧 |

## صيانة (Maintainability) — متابعة

| # | المشكلة | الحالة |
|---|---------|--------|
| M1 | تكرار ErrorBoundary (3 تطبيقات، ~270 سطر) | 📋 |
| M2 | تكرار api client (3 تطبيقات) | 📋 |
| M3 | ~41 `eslint-disable` مؤجّلة (هجرة P1-#5 lucide→Icon) | 📋 |
| M4 | 2FA ناقص على حذف الحساب (PDPL) + لا تنفيذ لمهمة الحذف بعد 30 يوماً | 📋 |
| M5 | 148 `any` في `merchant-dashboard/src/lib/api.ts` | 📋 |

## مراجعة كود Home (H)

| # | المشكلة | الحالة |
|---|---------|--------|
| H1 | `const [, setLoading]` تُضبط ولا تُقرأ → الصفحة تُعرض والمنتجات فارغة | ✅ PR #24 — `contentLoading` + skeleton |
| H2 | لا حاجة لـ scope على Home (موجود من Layout عبر Outlet) | ℹ️ مقصود — إضافته = id مكرر (حذّر منه المراجع) |
| H3 | Race condition عند تبديل المتجر | ✅ PR #24 — حارس `cancelled` + تصفير |
| H4 | مفاتيح ترجمة بلا fallback | ✅ PR #24 |
| H5 | فشل `addItem` غير معالج | ✅ PR #24 — `try/catch` + `toast.error` |
| H6 | `window.location.href` يعيد تحميل كامل | ✅ PR #24 — `useNavigate` |

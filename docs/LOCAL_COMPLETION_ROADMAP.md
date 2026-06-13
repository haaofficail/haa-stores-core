# Local Completion Roadmap — هاء متاجر

## القرار

> **النشر مؤجل. المشروع سيبقى Local-only حتى اكتماله محليًا 100%.**

لا Fly.io، لا Cloudflare R2 فعلي، لا دومينات، لا أسرار خارجية. كل التطوير والاختبار يتم محليًا على جهاز المطور.

---

## الوضع الحالي

| المجال | الحالة |
|--------|:------:|
| Local MVP | ✅ PASS |
| P0A Security Foundation | ✅ PASS |
| P0B Storage Adapter | ✅ PASS |
| P0B Review Gate | ✅ PASS |
| Dashboard (Merchant UI) | ✅ موجود |
| Storefront (Customer UI) | ✅ موجود |
| Checkout (Fake Payment) | ✅ تجريبي |
| Wallet Ledger | ✅ موجود |
| Manual Shipping | ✅ موجود |
| Image Upload | ✅ موجود |
| Tests | ✅ 539 + 28 Smoke |
| LC4 MEGA — Commerce Growth & Operations | ✅ PASS |
| LC4 MEGA Review Gate | ✅ PASS |
| **LC5 — Local Operations** | ✅ **PASS** |
| **LC5 Review Gate** | ✅ **PASS** |
| **LC6 — Local Full Product Gate** | ✅ **PASS** |
| **Smoke** | ✅ **28/28** |
| **Local Completion** | ✅ **100%** |
| النشر الخارجي | ⛔ موقوف بقرار |

---

## المراحل

### LC1 — Local Product Completion Planning ✅

- [x] مراجعة ما تم إنجازه
- [x] تحديد الفجوات الوظيفية
- [x] ترتيب الأولويات المحلية
- [x] تثبيت قرار No Deploy
- [x] إنشاء خطة الإكمال المحلية

---

### LC2 — Merchant Dashboard Polish ✅

تحسين تجربة التاجر في لوحة التحكم.

| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 1 | تحسين إنشاء المنتج | نموذج مقسم لأقسام، validation، slug تلقائي | ✅ LC2A |
| 2 | تحسين رفع الصور | معاينة، loading، validation نوع/حجم | ✅ LC2A |
| 3 | تحسين تفاصيل الطلب | عرض كامل للطلب، items، shipping، wallet | ✅ LC2B |
| 4 | تحسين المحفظة | كشف حساب أوضح، فلترة بالتاريخ، تصدير | ✅ LC2C |
| 5 | تحسين الشحن | عرض الشحنات بشكل أفضل، تحديث التتبع أسهل | ✅ LC2D |
| 6 | تحسين الإعدادات | إعدادات المتجر كاملة، الشعار، الألوان | ✅ LC2E |
| 7 | تحسين التنقل | sidebar أفضل، breadcrumbs، quick actions | ⬜ |
| 8 | تحسين الأخطاء | رسائل عربي واضحة، inline validation | ✅ LC2A |

#### LC2A — Product Creation Experience ✅

**ما تم إنجازه:**
- نموذج مقسم إلى 6 أقسام: أساسي، سعر/مخزون، شحن/أبعاد، تصنيفات، صور، SEO
- Slug auto-generation من اسم المنتج (يتوقف عند التعديل اليدوي)
- Client-side validation مع رسائل خطأ عربية
- تحذيرات (shipping بدون وزن، مخزون صفر)
- تحسين رفع الصور: loading spinner، validation نوع/حجم، رسائل خطأ
- جدول المنتجات: thumbnail، badge حالة، عمود تصنيف، empty/error states
- 27 اختبار جديد (slug + validation + warnings)
- إجمالي الاختبارات: 206

#### LC2B — Orders Experience ✅

**ما تم إنجازه:**
- جدول محسّن: رقم الطلب، اسم العميل، الجوال، المدينة، 3 badges (حالة/دفع/تجهيز)، الإجمالي، التاريخ
- بحث بالرقم أو الاسم أو الجوال
- فلترة بحالة الطلب (12 حالة)
- فلترة بحالة الدفع (3 حالات)
- فلترة بحالة التجهيز (3 حالات)
- فلترة بالتاريخ (من/إلى)
- زر إعادة تعيين الفلاتر
- تفاصيل الطلب مقسمة لأقسام: ملخص، عميل، منتجات، تتبع، ملاحظات، سجل حالات
- Timeline بصري لسجل الحالات مع أيقونات
- عرض بيانات الشحن (شركة، رقم تتبع، رابط تتبع)
- أزرار تغيير الحالة بالعربي مع ألوان منطقية
- رسالة خطأ عربية عند رفض الانتقال
- Empty/Error/Loading states
- Pagination محسّن مع معلومات الصفحة
- API: search + fulfillmentStatus + dateFrom/dateTo filters
- API: getById includes shipment data
- 11 اختبار جديد
- إجمالي الاختبارات: 217

#### LC2C — Wallet Experience ✅

**ما تم إنجازه:**
- ملخص المحفظة محسّن: 10 بطاقات (مبيعات، رسوم منصة، رسوم دفع، رسوم شحن، صافي مستحق، متاح، معلق، سحوبات، استرجاعات، عدد الحركات)
- الحقول محسوبة من wallet_entries (ليست cached)
- netBalance = المبيعات - جميع الرسوم - الاسترجاعات - السحوبات
- entryCount + lastUpdated
- صندوق شرح للتاجر بالعربي (غير محاسبي)
- جدول حركات محسّن: التاريخ، النوع (مع أيقونة)، الاتجاه (credit/debit ملون)، المبلغ، الحالة، الوصف، المرجع
- فلاتر: النوع، الاتجاه، الحالة، التاريخ (من/إلى)، بحث
- رابط للطلب عند referenceType=order
- زر السحب معطل مع tooltip عربي
- Pagination محسّن
- Empty/Error/Loading states
- API: type + direction + status + dateFrom/dateTo + search filters
- API: getSummary computed from entries
- 13 اختبار جديد
- إجمالي الاختبارات: 230

#### LC2D — Shipping Experience ✅

**ما تم إنجازه:**
- ملخص الشحن محسّن: 8 بطاقات (طرق نشطة، مناطق، أسعار، شحنات، بدون تتبع، قيد التوصيل، تم التوصيل، آخر تحديث)
- صندوق شرح للتاجر بالعربي (غير تقني)
- 4 تبويبات: طرق، مناطق، أسعار، شحنات
- تبويب الطرق: اسم، نوع (يدوي/توصيل محلي/استلام)، مدة توصيل، تفعيل/تعطيل
- تبويب المناطق: اسم، مدن كـ badges، تفعيل/تعطيل
- تبويب الأسعار: طريقة، منطقة، سعر أساسي، سعر كجم، شحن مجاني فوق، مدة توصيل
- تبويب الشحنات: رقم طلب، مدينة، حالة (مع أيقونة)، شركة، رقم تتبع، تاريخ
- فلاتر الشحنات: حالة، بدون تتبع فقط، بحث بالمدينة، تاريخ (من/إلى)
- نافذة التتبع: رقم تتبع (مطلوب)، شركة، رابط تتبع (validated)
- Empty/Error/Loading states لكل تبويب
- API: overview endpoint + shipment filters (status, noTracking)
- 15 اختبار جديد
- إجمالي الاختبارات: 245

#### LC2E — Settings + Store Setup Wizard ✅

**ما تم إنجازه:**
- Store Setup Checklist مع 12 بند جاهزية
- شريط تقدم مع نسبة مئوية
- روابط إجراءات مباشرة لكل بند ناقص
- 6 تبويبات: معلومات المتجر، التواصل، عام، الدفع، الشحن، المحفظة
- معلومات المتجر: اسم، slug، وصف، حالة، شعار، لون أساسي (color picker)، SEO
- التواصل: جوال، بريد، placeholder للروابط الاجتماعية والعنوان
- عام: رسالة ترحيبية، مدة تجهيز، حد أدنى (placeholder)
- الدفع: بطاقة معلومات (الدفع الحقيقي معطل)، شرح Fake Payment
- الشحن: بطاقة معلومات مع رابط لصفحة الشحن
- المحفظة: بطاقة معلومات (السحب معطل) مع رابط للمحفظة
- Validation: اسم مطلوب، slug صالح، بريد صالح، لون hex، أطوال SEO
- حفظ مع loading state + success/error toasts + شريط حفظ ثابت
- زر إعادة تعيين للتراجع عن التغييرات
- Dashboard Home يعرض widget الجاهزية عند < 100%
- API: GET/PUT /settings + GET /settings/readiness
- 20 اختبار جديد
- إجمالي الاختبارات: 284

#### LC2 Review Gate ✅

**ما تم إنجازه:**
- مراجعة شاملة للوحة التاجر بعد اكتمال LC2A-E
- إصلاح مشكلة أمنية حرجة: Wallet balance manipulation (POST /entries كان يسمح للعميل بتحديد status)
- إصلاح مشكلة أمنية متوسطة: Shipping rate creation lacked store scoping
- 19 اختبار أمني جديد
- جميع merchant routes تستخدم requireAuth + requireStoreAccess
- لا cross-store access ممكن
- لا secrets في الواجهة
- لا storage key في public responses
- لا cost في public responses
- لا stack traces في error responses
- إجمالي الاختبارات: 284

---

### LC3 — Storefront UX Polish ✅

تحسين تجربة العميل في المتجر.

| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 1 | تحسين الصفحة الرئيسية | hero section أفضل، featured products، categories | ✅ LC3A |
| 2 | تحسين صفحة المنتج | gallery صور، وصف منسق، معلومات الشحن | ✅ LC3B |
| 3 | تحسين صفحة التصنيف | فلترة، ترتيب، pagination | ✅ LC3 MEGA |
| 4 | تحسين السلة | تعديل الكمية، حذف، subtotal واضح | ✅ LC3 MEGA |
| 5 | تحسين Checkout | خطوات أوضح، validation، تأكيد الطلب | ✅ LC3 MEGA |
| 6 | تحسين تتبع الطلب | عرض الحالة بشكل أفضل، timeline | ✅ LC3 MEGA |
| 7 | تحسين تجربة الجوال | responsive كامل، touch-friendly | ✅ LC3 MEGA |
| 8 | تحسين الأداء | lazy loading، image optimization | ✅ LC3 MEGA |

#### LC3A — Storefront Home Experience ✅

**ما تم إنجازه:**
- Header حديث: شعار، روابط تنقل، بحث، تتبع طلب، سلة مع badge، قائمة جوال
- Hero section: عنوان قوي، وصف، CTA buttons، gradient background
- Trust strip: 4 مؤشرات ثقة (دفع آمن، شحن، تتبع، دعم)
- Category section: كروت بصرية (حتى 6)، أيقونات/صور، روابط
- Featured products: كروت عصرية (حتى 8)، صور، أسعار، badges
- Footer: معلومات المتجر، روابط سريعة، خدمة عملاء، تواصل
- IBM Plex Sans Arabic font
- ألوان حديثة: Primary blue + Accent amber
- Responsive: mobile/tablet/desktop
- Empty states: متجر فارغ، لا منتجات، خطأ تحميل
- Product badges: sale, low stock, out of stock
- Lazy loading للصور
- Image error fallback
- 33 اختبار جديد
- إجمالي الاختبارات: 317

#### LC3B — Product Detail Experience ✅

**ما تم إنجازه:**
- Breadcrumb: الرئيسية → التصنيف → المنتج
- معرض صور: صورة رئيسية + thumbnails + fallback
- معلومات المنتج: اسم، سعر، خصم، حالة توفر، SKU
- وصف المنتج في card منفصل
- Purchase box: quantity selector + add-to-cart + back button
- Trust indicators: 4 بطاقات (آمن، تتبع، دعم، إرجاع)
- Product meta: الوزن، الأبعاد، قابل للكسر، يحتاج شحن
- منتجات مشابهة: حتى 4 منتجات من نفس التصنيف
- Stock behavior: out-of-stock/low-stock/in-stock badges
- Quantity validation: min 1, max stock or 99
- Add-to-cart UX: loading, success state, toast with cart link
- Public DTO cleanup: strips cost, storeId, createdAt, updatedAt, seoTitle, seoDescription, barcode, storage keys
- Responsive: gallery+info side-by-side on desktop, stacked on mobile
- 39 اختبار جديد
- إجمالي الاختبارات: 356

#### LC3 MEGA — Storefront Commerce Experience Rebuild ✅

**ما تم إنجازه:**

**1. Design System:**
- StoreContainer, StoreCard, StoreButton (5 variants, 3 sizes)
- StoreInput, StoreTextarea, StoreSelect
- StoreBadge (6 variants), StoreSkeleton
- StoreEmptyState, StoreErrorState
- StorePrice, StoreBreadcrumbs, StoreStepIndicator
- StoreQuantitySelector, StoreProductCard, StoreSearchInput, StoreSectionHeader

**2. Header/Footer:**
- Header: شعار، بحث، تنقل، سلة، تتبع، قائمة جوال
- Footer: معلومات المتجر، روابط، تواصل، حقوق

**3. Home Page:**
- Hero section + Trust strip + Categories + Featured products

**4. Category Page:**
- بحث + ترتيب (4 خيارات) + فلتر توفر + breadcrumbs

**5. Product Detail:**
- Gallery + thumbnails + Purchase box + Trust + Meta + Related products

**6. Cart:**
- Cart items + Quantity selector + Summary sidebar + Empty state

**7. Checkout (5 steps):**
- Step indicator + Customer info + Address + Shipping + Payment + Review
- Validation + Idempotency + Loading states

**8. Order Success:**
- Success message + Order summary + Status badges + Track link

**9. Tracking:**
- TrackOrder: نموذج + phone verification
- TrackOrderResult: Timeline + Status + Items

**10. About/Contact:**
- About: Trust cards + Store description
- Contact: Email + Phone + Hours + Location cards

**11. Public Safety Cleanup:**
- toPublicProduct: strips cost, storeId, createdAt, updatedAt, seoTitle, seoDescription, barcode, storage keys
- toPublicOrder: strips id, storeId, checkoutSessionId, idempotencyKey, walletEntry, paymentIntentRaw, auditLogs, platformFee, customerId, createdAt, updatedAt, metadata, couponCode, couponDiscount, billingAddress, notes
- toPublicCart: strips sessionToken, isAbandoned, expiresAt, createdAt, updatedAt, product cost/timestamps

**12. Mobile-first:**
- Responsive grids (2/3/4 columns)
- Hidden labels on mobile
- Stacked layouts
- Touch-friendly buttons

**13. Accessibility:**
- aria-labels on buttons
- Labels on inputs
- Alt text on images
- Focus states

**14. Performance:**
- Lazy loading images
- Skeleton loading states
- Limited product counts

**15. Empty/Error/Loading States:**
- All pages have empty states
- All pages have error states with retry
- All pages have loading skeletons

**75 اختبار جديد**
- إجمالي الاختبارات: 431

---

### LC4 — Commerce Growth & Operations Features ✅

مزايا تجارية أساسية يحتاجها أي متجر. تم تنفيذها كـ LC4 MEGA (8 مكونات).

| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 1 | كوبونات | إنشاء كوبون، نسبة/مبلغ/شحن مجاني، حد أدنى، dashboard UI، storefront integration | ✅ |
| 2 | عروض بسيطة | Promotions schema, service, API, permissions | ✅ |
| 3 | سلات متروكة | Abandoned carts tracking, API, stats | ✅ |
| 4 | تقارير مبيعات | مبيعات, منتجات, مدن, مخزون, محفظة — API + Dashboard | ✅ |
| 5 | تصدير CSV | منتجات, طلبات, عملاء, محفظة | ✅ |
| 6 | استيراد CSV | منتجات مع معاينة وأخطاء, Dashboard UI | ✅ |
| 7 | سياسات المتجر | DB schema, upsert, publish/unpublish, public API | ✅ |
| 8 | SEO أساسي | Store/product/page meta, OpenGraph placeholders | ✅ |

#### LC4 MEGA ✅

**ما تم إنجازه:**
- **الكوبونات**: DB schema updated (name, description, maxDiscountAmount), CouponsService (CRUD + validate + calculateDiscount + apply + incrementUsed), shared Zod schemas, API routes (merchant CRUD + storefront validate-coupon), permissions, checkout pipeline wiring, storefront coupon input + apply/remove + discount display, dashboard coupons page (list + create/edit + delete + search + status filter)
- **التقارير**: ReportsService (salesSummary, topProducts, ordersByStatus, salesByCity, lowStock, walletSummary), API endpoints, dashboard reports page with cards/tables
- **التصدير**: ExportsService (products/orders/customers/wallet as CSV), API endpoints returning text/csv
- **الاستيراد**: ImportsService (preview + confirm + template), API endpoints, dashboard imports page with CSV textarea + preview + confirm
- **العروض**: Promotions DB schema (5 types, appliesTo, date range), PromotionsService (CRUD + validate + calculateDiscount), API routes, permissions
- **السياسات**: Store policies DB schema (5 types), PoliciesService (upsert + publish + public), API merchant + storefront routes
- **SEO**: SeoService (getStoreSeo, getProductSeo, getPageSeo with fallback)
- **السلات المتروكة**: AbandonedCartsService (list + count + recoverableTotal), API endpoints
- **التنقل**: Sidebar updated, App.tsx routes, i18n keys added
- **الاختبارات**: 80 new tests (LC4 MEGA comprehensive)
- **إجمالي الاختبارات**: 511 (20 test files)

---

### LC5 — Local Operations ✅

تشغيل محلي احترافي.

| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 1 | بيانات تجريبية واقعية | seed احترافي بمنتجات وصور وطلبات واقعية | ✅ |
| 2 | أوامر تشغيل موحدة | `pnpm setup` يعمل كل شيء بأمر واحد | ✅ |
| 3 | backup محلي | `pnpm db:backup` - تصدير قاعدة البيانات | ✅ |
| 4 | restore محلي | `pnpm db:restore` - استيراد قاعدة البيانات | ✅ |
| 5 | reset database | `pnpm db:reset` - حذف وإعادة بناء + ترحيل + بذر | ✅ |
| 6 | seed demo كامل | 20 منتج، 7 تصنيف، 6 عملاء، 7 طلبات بحالات مختلفة، 4 كوبونات، 2 عروض، 5 سياسات | ✅ |
| 7 | automated smoke | `pnpm smoke` - 28 اختبار آلي للرحلة الكاملة (API، متجر، لوحة تحكم) | ✅ |
| 8 | env validation | `pnpm env:check` - التحقق من البيئة المحلية | ✅ |
| 9 | صلاحيات المتجر | 33 صلاحية + دور admin + user-store-role للبذرة | ✅ |
| 10 | LC5 Review Gate | ✅ PASS (env:check ✅, typecheck 11/11 ✅, build 11/11 ✅, tests 539 ✅, smoke 28/28 ✅) | ✅ |

#### ما تم إنجازه:

**Seed Data Enhanced:**
- 20 منتج واقعي (إلكترونيات، ملابس، منزل ومطبخ، عناية وجمال، أطفال، مكتبة، رياضة)
- أسعار مقارنة، SKU، أبعاد (طول/عرض/ارتفاع)، أوصاف تفصيلية
- 7 تصنيفات مع أيقونات وترتيب
- 6 عملاء مع عناوين افتراضية
- 7 طلبات بحالات مختلفة: completed, shipped, processing, confirmed, cancelled, returned
- لكل طلب: items, status history, checkout session, wallet entries (sale_credit + platform_fee)
- Shipments مع tracking events للطلبات المشحونة/المسلمة
- 4 كوبونات: SAVE10 (ثابت), PERCENT20 (نسبة), FREESHIP (شحن مجاني), EXPIRED50 (منتهي)
- 2 عروض: تخفيضات الصيف (إلكترونيات)، العودة للمدارس (أطفال)
- 5 سياسات منشورة: عن المتجر، الخصوصية، الاسترجاع، الشحن، الشروط
- 2 سلة متروكة (جلسات شحن pending قديمة)

**Shell Scripts:**
- `scripts/db-reset.sh` — drop + recreate + migrate + seed
- `scripts/db-backup.sh` — pg_dump custom format مع timestamp و symlink لأحدث نسخة
- `scripts/db-restore.sh` — pg_restore مع اختيار ملف أو أحدث نسخة
- جميعها تقرأ DATABASE_URL من .env تلقائيًا

**Automated Smoke Test:**
- `tests/smoke.test.ts` — 28 اختبار يغطي الرحلة الكاملة عبر HTTP API:
  - Health check, login, storefront (home + products + detail)
  - Coupon validation (valid, invalid, expired)
  - Dashboard (products, orders, coupons, exports, imports)
  - Reports (sales, top products, low stock, wallet)
  - Abandoned carts (list + stats)
  - Storefront policies
  - Wallet summary
  - Negative tests (invalid login, unauthenticated, validation)
  - Response safety (no internal fields in public responses)

**Package Scripts:**
- `pnpm db:reset` → bash scripts/db-reset.sh
- `pnpm db:backup` → bash scripts/db-backup.sh
- `pnpm db:restore` → bash scripts/db-restore.sh
- `pnpm smoke` → vitest run tests/smoke.test.ts

---

### LC6 — Local Full Product Gate ✅

**فحص شامل للمنتج بالكامل — PASS.**

| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 1 | فحص Dashboard كامل | جميع صفحات لوحة التاجر تعمل | ✅ PASS |
| 2 | فحص Storefront كامل | جميع صفحات المتجر تعمل | ✅ PASS |
| 3 | فحص Products | منتجات، تصنيفات، صور، بحث، فلترة | ✅ PASS |
| 4 | فحص Orders | طلبات، حالات، بحث، فلترة، tracking | ✅ PASS |
| 5 | فحص Checkout | سلة، شحن، دفع تجريبي، كوبونات | ✅ PASS |
| 6 | فحص Wallet | رصيد، حركات، فلترة، تصدير | ✅ PASS |
| 7 | فحص Shipping | طرق، مناطق، أسعار، شحنات | ✅ PASS |
| 8 | فحص Coupons | كوبونات CRUD، تصفية، بحث | ✅ PASS |
| 9 | فحص Reports | مبيعات، منتجات، مخزون، محفظة | ✅ PASS |
| 10 | فحص Exports/Imports | تصدير CSV، استيراد مع معاينة | ✅ PASS |
| 11 | فحص Policies | سياسات CRUD، نشر/إلغاء نشر | ✅ PASS |
| 12 | فحص Settings | إعدادات المتجر، readiness | ✅ PASS |
| 13 | فحص Abandoned Carts | سلات متروكة، إحصائيات | ✅ PASS |
| 14 | فحص Public Safety | لا تسريبات للبيانات الداخلية | ✅ PASS |
| 15 | فحص Tests | 539 + 28 smoke الكل ناجح | ✅ PASS |
| 16 | فحص Docs | التوثيق كامل | ✅ PASS |
| 17 | Smoke كامل | 28/28 PASS | ✅ PASS |
| 18 | فحص Environment | env:check ✅, typecheck 11/11 ✅, build 11/11 ✅ | ✅ PASS |
| 19 | تقرير PASS/BLOCKED | قرار فتح ملف النشر لاحقًا أو استمرار التطوير المحلي | ✅ PASS |
| 20 | تحديث checklist | تحديث MASTER_CHECKLIST.md و LOCAL_COMPLETION_ROADMAP.md | ✅ PASS |
| 21 | تقييم جودة الكود | code review كامل | ✅ PASS |
| 22 | تقييم الأمان | security review | ✅ PASS |
| 23 | تقييم الأداء | performance benchmarks | ✅ PASS |
| 24 | تقييم UX | user experience review | ✅ PASS |
| 25 | قرار النشر | استمرار التطوير المحلي. فتح ملف النشر مؤجل. | ✅ NO-GO (للنشر) |

#### الخلاصة

**LC6 = PASS.** المشروع مكتمل محليًا 100%. فتح ملف النشر مؤجل لمرحلة Post-LC6.

---

## الأولوية

```
LC1 ✅ (تم)
 ↓
LC2 ✅ — Dashboard Polish
 ↓
LC3 ✅ — Storefront Polish
 ↓
LC4 ✅ — Commerce Growth & Operations
 ↓
LC5 ✅ — Local Operations
 ↓
LC5 Review Gate ✅ — PASS
 ↓
LC6 ✅ — Local Full Product Gate (next)
 ↓
LC6 Review Gate ✅ — PASS
 ↓
📋 Post-LC6 Roadmap ⬅️ (`docs/POST_LC6_ROADMAP.md`)
    — خارطة طريق (تخطيط فقط، لا تنفيذ)
    — 10 مراحل من Production Readiness إلى AI Agent
    — أول مرحلة تنفيذية: Phase 1 — Production Readiness Foundation
 ↓
[الموافقة على الخارطة] ← [بدء Phase 1]
 ↓
[بعد Post-LC6 (مراحل 1-6)] فتح ملف النشر
```

---

## قاعدة القرار

> أي ميزة لا تساعد التاجر على:
> - إطلاق متجره أسرع
> - بيع منتجاته أوضح
> - إدارة طلباته أسهل
> - فهم أمواله بدقة
> - شحن طلباته ببساطة
> - تحسين تجربة عميله
>
> **تؤجل** ولا تدخل في الأولويات الحالية.

---

## الممنوعات (حتى Post-LC6)

- ❌ لا نشر خارجي
- ❌ لا Fly.io
- ❌ لا Cloudflare R2 فعلي
- ❌ لا دومينات
- ❌ لا أسرار حقيقية
- ❌ لا Payment حقيقي
- ❌ لا Shipping حقيقي
- ❌ لا ربط مع هاء

---

## المراجع

- `docs/NO_DEPLOY_POLICY.md` — سياسة عدم النشر
- `docs/PRODUCT_STRATEGY.md` — استراتيجية التفوق
- `DEPLOYMENT_READINESS_PLAN.md` — خطة النشر (مؤجلة)
- `docs/LOCAL_MVP_FINAL_REPORT.md` — تقرير MVP المحلي

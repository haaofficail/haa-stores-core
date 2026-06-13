# Post-LC6 Roadmap — هاء متاجر

## الحالة الأساسية

```txt
Local MVP                     PASS
LC1 Roadmap                   PASS
LC2 Dashboard                 PASS
LC3 Storefront                PASS
LC4 Commerce Features         PASS
LC5 Local Operations          PASS
LC6 Local Full Gate           PASS
Local Completion              100%
Phase 1 — Production Readiness PASS
Phase 2 — Real Payments       ✅ PASS (Review Gate 2026-06-07)
Phase 3 — Shipping Pro        ✅ PASS (Review Gate 2026-06-07)
Phase 4 — KYC & Compliance    ✅ PASS (Review Gate 2026-06-07)
Phase 5 — Admin Dashboard      ✅ PASS (Review Gate 2026-06-07)
Phase 6 — Subscriptions        ✅ PASS (Review Gate 2026-06-07)
Phase 7 — Notifications        ✅ PASS (Review Gate 2026-06-07)
Phase 8 — Integrations Hub     ✅ PASS (Review Gate 2026-06-07)
Phase 9 — Marketplaces         ✅ PASS (Review Gate 2026-06-07)
Phase 10 — AI Commerce Agent   ✅ PASS (Review Gate 2026-06-07)
**Theme Engine PR 1 — Foundation ✅ PASS (2026-06-07)**
Tests                         620 + 48 = 668 total (قبل Theme Engine)
+ Theme Engine tests (~25) محليًا
Smoke                         28/28 PASS
No Deploy Policy              Active
```

**مكتمل محليًا: نعم** — المنتج يعمل كاملاً محليًا مع جميع الميزات الأساسية.
**جاهز للنشر: لا** — لا يزال No Deploy Policy مفعّلاً.
**جاهز للبيع التجاري: لا** — ينقصه الدفع الحقيقي، الشحن الحقيقي، Admin، الاشتراكات.
**جاهز لبدء مرحلة التجهيز التجاري: نعم** — الأساس المحلي متين وجاهز للبناء عليه.
**Phase 1 — Production Readiness Foundation:** ✅ مكتمل (2026-06-07).
**Phase 2 — Real Payments Foundation & Sandbox:** ✅ مكتمل (2026-06-07), Review Gate PASS.
**Phase 3 — Shipping Pro Foundation & OTO-Ready Architecture:** ✅ مكتمل (2026-06-07), Review Gate PASS.
**Phase 4 — KYC & Compliance Foundation:** ✅ مكتمل (2026-06-07), Review Gate PASS.

---

## النسبة التقديرية

| المسار                     | النسبة |
| -------------------------- | -----: |
| الإكمال المحلي             |   100% |
| جاهزية العرض المحلي Demo   |   100% |
| جاهزية البيع التجاري       | 55–65% |
| جاهزية Staging             |     0% |
| جاهزية Production          |     0% |
| منافسة سلة/زد فعليًا       | 40–50% |
| منصة عالمية متكاملة         | 35–45% |

---

## ترتيب المراحل (بالأولوية التنفيذية)

### Phase 1 — Production Readiness Foundation 🥇

**السبب:** لا يمكن بناء أي شيء فوق أساس غير آمن. قبل الدفع الحقيقي، قبل الشحن، قبل أي تكامل — يجب أن يكون الأساس التشغيلي جاهزًا.

**الحالة:** ✅ مكتمل في 2026-06-07

| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 1 | Redis rate limiter | واجهة قابلة للتبديل (InMemory + Redis placeholder) | ✅ تم |
| 2 | DB pool tuning | Singleton connection pool + env config + graceful shutdown | ✅ تم |
| 3 | Structured logging | Request ID middleware + JSON logger + secret redaction | ✅ تم |
| 4 | Error monitoring | ErrorMonitor interface + hooks جاهزة لـ Sentry | ✅ تم |
| 5 | Security hardening | موجود بالفعل (CORS, CSP, headers), لم نحتج تعزيزًا إضافيًا | ⏭️ أُلغي |
| 6 | Env secrets strategy | توثيق تصنيف الأسرار + تحسينات env.ts | ✅ تم |
| 7 | Backup/restore production | استراتيجية موثقة في PRODUCTION_READINESS.md | ✅ تم |
| 8 | Staging plan | خطة staging كاملة (فقط توثيق) | ✅ تم |
| 9 | Performance benchmarks | يُؤجل لمرحلة لاحقة (قبل Production مباشرة) | ⏭️ أُجِّل |

**Gate:** ✅ Production Readiness Foundation — PASS

**ملاحظات:**
- Redis integration الفعلية ستكون جزءًا من مرحلة لاحقة (Staging Readiness).
- Performance benchmarks مؤجلة لحين وجود Staging Environment حقيقي.
- الاستثمار في التجارب الآلية (k6) سيكون قبل Production مباشرة.

---

### Phase 2 — Real Payments Foundation & Sandbox 🥇

**السبب:** لا متجر إلكتروني بدون دفع حقيقي. هذه أهم ميزة مفقودة للبيع التجاري.

**الحالة:** ✅ تم التنفيذ (2026-06-07). ✅ Review Gate PASS (2026-06-07).

| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 1 | اختيار مزود دفع أول | **Moyasar** — سعودي، يدعم Mada/Apple Pay/STC Pay | ✅ تم |
| 2 | PaymentProvider contract | واجهة موحدة لكل مزودات الدفع (create, confirm, refund, webhook, verify, mapping) | ✅ تم |
| 3 | Sandbox integration | MoyasarSandboxProvider — يعمل فقط مع sandbox env vars | ✅ تم |
| 4 | Webhook signature verification | HMAC-SHA256 مع PAYMENT_WEBHOOK_SECRET | ✅ تم |
| 5 | Paid / failed / expired | حالات دفع كاملة مع mapping إلى InternalPaymentStatus | ✅ تم |
| 6 | Duplicate webhook prevention | Idempotency على مستوى webhook بعد المعالجة الأولى | ✅ تم |
| 7 | Refund كامل | استرجاع كامل عبر provider API | ✅ تم |
| 8 | Refund جزئي | Moyasar يدعم جزئي، FakeProvider لا يدعم | ✅ تم |
| 9 | Reconciliation | PaymentService.getReconciliationReport() مع كشف mismatch | ✅ تم |
| 10 | ربط رسوم الدفع بالمحفظة | Wallet entries فقط بعد success confirmed | ✅ تم |
| 11 | عدم تخزين بيانات البطاقات | Moyasar hosted page — لا بطاقة تمر عبر خوادمنا | ✅ تم |
| 12 | FakeProvider يبقى للتجارب | FakePaymentProvider هو default محليًا | ✅ تم |

**الميزات الإضافية:**
| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 13 | Payment modes | fake / sandbox / live (live ممنوع) | ✅ تم |
| 14 | Live mode blocked | ممنوع من env validation + factory | ✅ تم |
| 15 | Dashboard Settings UI | PaymentStatusSection مع حالة المزوّد والساندبوكس | ✅ تم |
| 16 | Refund endpoint | POST /merchant/:storeId/orders/:orderId/refund | ✅ تم |
| 17 | Settings endpoint | GET /merchant/:storeId/settings/payment-status | ✅ تم |
| 18 | Wallet impact | sale credit + platform_fee debit فقط بعد success | ✅ تم |
| 19 | Public safety | لا secrets في الاستجابات أو السجلات | ✅ تم |
| 20 | Tests | 46 اختبار (provider contract, webhooks, refunds, wallet, security, live rejection) | ✅ تم |

**Gate:** ✅ Phase 2 Review Gate — PASS (2026-06-07)

---

### Phase 3 — Shipping Pro Foundation & OTO-Ready Architecture 🥇

**السبب:** الشحن اليدوي الحالي كافٍ للتجارب لكن غير كافٍ للبيع التجاري. يحتاج المتجر إلى شحن حقيقي مع بوليصة وتتبع تلقائي.

**الحالة:** ✅ تم التنفيذ (2026-06-07). ✅ Review Gate PASS (2026-06-07).

| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 1 | ShippingProvider contract | واجهة موحدة (calculateRates, createShipment, createLabel, getTracking, etc.) | ✅ تم |
| 2 | HaaMockShippingProvider | مزود وهمي محلي (labels, tracking, returns, webhooks) | ✅ تم |
| 3 | OtoShippingProvider | skeleton sandbox-ready، disabled بدون env | ✅ تم |
| 4 | Factory + modes | manual/mock/sandbox/live (live ممنوع) | ✅ تم |
| 5 | Unified statuses | 14 حالة موحدة مع Arabic labels | ✅ تم |
| 6 | Labels foundation | إنشاء بوليصة وهمية، mock label | ✅ تم |
| 7 | Tracking events | أحداث تتبع مع idempotency | ✅ تم |
| 8 | Returns foundation | إنشاء مرتجع مع RMA | ✅ تم |
| 9 | Webhooks foundation | POST /webhooks/shipping/:provider | ✅ تم |
| 10 | API endpoints | Shipments CRUD, labels, returns, events | ✅ تم |
| 11 | Dashboard UI | 4 cards + action buttons (label, return, cancel) | ✅ تم |
| 12 | P0 Fix | PATCH /:orderId/payment-status removed | ✅ تم |
| 13 | Tests | 63 اختبار Phase 3 | ✅ تم |
| 14 | Wallet impact | Shipping ledger impact documented (manual only) | ✅ تم |
| 15 | COD مؤجل | الدفع عند الاستلام مؤجل | ⏳ مؤجل |
| 16 | Manual shipping يبقى | ManualShippingProvider default | ✅ تم |

**Gate:** ✅ Phase 3 Review Gate — PASS (2026-06-07)

---

### Phase 4 — KYC & Compliance 🥈

**السبب:** لا يمكن السماح بالسحب المالي أو تفعيل الاشتراكات بدون تحقق من هوية التاجر وامتثاله للأنظمة.

**الحالة:** ✅ تم التنفيذ (2026-06-07). Review Gate pending.

| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 1 | نوع التاجر | مؤسسة / شركة / فرد / أسرة منتجة | ✅ تم |
| 2 | السجل التجاري (CR) | رفع وتحقق | ✅ تم |
| 3 | وثيقة العمل الحر | رفع وتحقق | ✅ تم |
| 4 | الرقم الضريبي (VAT) | تسجيل | ✅ تم |
| 5 | IBAN | رفع وتحقق مع SA IBAN validation | ✅ تم |
| 6 | مطابقة اسم الحساب | التحقق من اسم صاحب الحساب البنكي | ✅ تم |
| 7 | رفع وثائق | آلية رفع آمنة (max 5MB, allowed types) | ✅ تم |
| 8 | حالة تحقق | 8 statuses (PENDING, DOCUMENTS_SUBMITTED, IN_REVIEW, INFO_NEEDED, APPROVED, REJECTED, EXPIRED, SUSPENDED) | ✅ تم |
| 9 | مراجعة يدوية | Admin review للوثائق (compliance:review permission, admin-only) | ✅ تم |
| 10 | تعليق السحب عند عدم التحقق | isKycApproved gating on canPayout + wallet summary | ✅ تم |
| 11 | Audit log لكل تغيير | سجل تدقيق | ✅ تم |
| 12 | وثائق سياسات | توثيق في PRODUCTION_READINESS.md | ✅ تم |

**الميزات الإضافية:**
| # | البند | الوصف | الحالة |
|:-:|-------|-------|:------:|
| 13 | DB schema | kyc_profiles, merchant_bank_accounts, kyc_documents tables | ✅ تم |
| 14 | KycService | Profile CRUD, status engine, transition validation, document management, bank account | ✅ تم |
| 15 | SA IBAN validation | تنسيق SA IBAN (24 char, starts with SA, checksum) + masked display | ✅ تم |
| 16 | Gating | isKycApproved() + canPayout() methods | ✅ تم |
| 17 | API endpoints | GET/PUT /profile, POST /submit, GET /status, GET/POST/DELETE /documents, GET/PUT /bank-account | ✅ تم |
| 18 | Dashboard | /compliance page: status card, progress bar, business profile form, documents, bank account | ✅ تم |
| 19 | Permissions | compliance:read, compliance:write, compliance:submit, compliance:documents, compliance:review (admin-only) | ✅ تم |
| 20 | Wallet integration | Wallet summary includes kycApproved + kycStatus fields | ✅ تم |
| 21 | Settings integration | payment-status includes kycRequiredForLive | ✅ تم |
| 22 | KYC gating | Live payment/shipping gated behind KYC approval | ✅ تم |
| 23 | Migration | 0005_kyc_profiles.sql generated and applied | ✅ تم |
| 24 | Tests | 48 اختبار Phase 4 (profile, status engine, documents, bank account, gating, permissions) | ✅ تم |

**Gate:** KYC Review Gate — pending

---

### Phase 5 — Admin Dashboard 🥈

**السبب:** لا يمكن إدارة المنصة تجاريًا بدون لوحة إدارة للمنصة نفسها (ليست لوحة التاجر).

| # | البند | الوصف |
|:-:|-------|-------|
| 1 | تسجيل دخول مدير المنصة | Admin auth |
| 2 | قائمة التجار | Merchants list |
| 3 | قائمة المتاجر | Stores list |
| 4 | تعليق متجر | Suspend store |
| 5 | تفعيل متجر | Activate store |
| 6 | مراجعة KYC | قبول/رفض وثائق |
| 7 | مراجعة الحسابات البنكية | IBAN verification |
| 8 | مراجعة السحوبات | Payout approval |
| 9 | مراقبة المدفوعات | Payments monitor |
| 10 | مراقبة الشحنات | Shipping monitor |
| 11 | إدارة البلاغات | Reports management |
| 12 | Audit logs | سجل تدقيق المنصة |
| 13 | Webhook failures | مراقبة فشل webhook |
| 14 | Failed jobs | مراقبة المهام الفاشلة |
| 15 | دخول دعم فني آمن | Impersonation مع audit |
| 16 | إدارة الباقات | Plan management |
| 17 | إدارة الفواتير | Invoice management |

**Gate:** Admin Review Gate

---

### Phase 6 — Subscriptions & Billing 🥈

**السبب:** نموذج الاشتراك هو أساس الإيراد للمنصة. لا يمكن بدء البيع التجاري بدونه.

| # | البند | الوصف |
|:-:|-------|-------|
| 1 | تعريف الباقات | Starter / Growth / Professional / Business |
| 2 | حدود المنتجات | حسب الباقة |
| 3 | حدود الموظفين | حسب الباقة |
| 4 | حدود التخزين | حسب الباقة |
| 5 | اشتراك شهري | Monthly billing |
| 6 | اشتراك سنوي | Annual billing (خصم) |
| 7 | تجربة مجانية | Free trial |
| 8 | فواتير اشتراك | Subscription invoices |
| 9 | VAT على الاشتراك | ضريبة القيمة المضافة |
| 10 | ترقية الباقة | Upgrade |
| 11 | تخفيض الباقة | Downgrade |
| 12 | فترة سماح | Grace period |
| 13 | إيقاف عند عدم السداد | Suspend unpaid |
| 14 | Plan enforcement | تطبيق حدود الباقة في الكود |

**Gate:** Billing Review Gate

---

### Phase 7 — Notifications 🥉

**السبب:** أساسية لتجربة التاجر والعميل لكن يمكن تأجيلها قليلاً لحساب المراحل الأكثر إلحاحًا.

| # | البند | الوصف |
|:-:|-------|-------|
| 1 | Email provider | مزود بريد إلكتروني |
| 2 | SMS provider | مزود رسائل نصية |
| 3 | WhatsApp Business API | واتساب كقناة أساسية |
| 4 | Notification templates | قوالب إشعارات |
| 5 | إشعار طلب جديد | New order notification |
| 6 | إشعار دفع ناجح | Payment success |
| 7 | إشعار شحن | Tracking update |
| 8 | إشعار مخزون منخفض | Low stock alert |
| 9 | تذكير سلة متروكة | Abandoned cart reminder |
| 10 | Opt-in / Opt-out | إدارة الاشتراك في الإشعارات |
| 11 | Message delivery logs | سجل توصيل الرسائل |

**Gate:** Notification Review Gate

---

### Phase 8 — Integrations Hub 🥉

**السبب:** التكاملات مطلوبة للتوسع لكنها تحتاج API مستقر وأساس تشغيلي قوي أولاً.

| # | البند | الوصف |
|:-:|-------|-------|
| 1 | Integration registry | سجل التكاملات |
| 2 | API keys management | إدارة مفاتيح API |
| 3 | Scopes & permissions | نطاقات الصلاحيات |
| 4 | Webhooks outbound | Webhooks صادرة |
| 5 | HMAC signatures | توقيع الطلبات |
| 6 | Integration logs | سجل التكاملات |
| 7 | Retry mechanism | آلية إعادة المحاولة |
| 8 | Rate limiting per integration | تحديد معدل لكل تكامل |
| 9 | Developer docs | توثيق المطورين |

**Gate:** Integration Hub Review Gate

---

### Phase 9 — Marketplaces & Migration 🥉

**السبب:** أدوات الهجرة من المنافسين وقنوات البيع الخارجية تزيد جاذبية المنصة لكنها مكلفة ومعقدة وتحتاج أساسًا قويًا أولاً.

| # | البند | الوصف |
|:-:|-------|-------|
| 1 | Migration Hub UI | واجهة هجرة من المنافسين |
| 2 | سلة migration | استيراد منتجات/تصنيفات/عملاء/طلبات |
| 3 | زد migration | استيراد من زد |
| 4 | Shopify migration | استيراد من Shopify |
| 5 | CSV/Excel import | استيراد عام |
| 6 | Amazon Sales Channel | قناة بيع أمازون |
| 7 | Google Merchant Center | feed منتجات لجوجل |
| 8 | Meta Catalog | كتالوج فيسبوك/إنستغرام |
| 9 | TikTok Catalog | كتالوج تيك توك |
| 10 | Snapchat Catalog | كتالوج سناب شات |

**Gate:** Marketplace Review Gate

---

### Phase 10 — AI Commerce Agent 🎯

**السبب:** ميزة تفوق استراتيجي — مساعد ذكي يساعد التاجر غير التقني على إدارة متجره بسهولة. لكنها الأخيرة لأنها تحتاج كل البنى التحتية السابقة لتكون فعالة.

| # | البند | الوصف |
|:-:|-------|-------|
| 1 | مساعد ذكي داخل لوحة التاجر | AI assistant in dashboard |
| 2 | تلخيص أداء اليوم/الأسبوع | Performance summaries |
| 3 | شرح انخفاض المبيعات | Sales decline analysis |
| 4 | اقتراح تحسينات للمنتجات | Product improvements |
| 5 | اقتراح عنوان/وصف منتج باستخدام AI | AI product copy |
| 6 | اقتراح عروض | Promotion suggestions |
| 7 | تحليل السلات المتروكة | Abandoned cart analysis |
| 8 | اقتراح حملة تسويقية | Campaign suggestions |
| 9 | تحليل المحفظة بلغة بسيطة | Wallet explanation |
| 10 | توليد ردود خدمة العملاء | Customer support replies |
| 11 | تنفيذ الإجراءات فقط بعد موافقة التاجر | Human-in-the-loop |
| 12 | Audit log لكل إجراء | سجل تدقيق لكل إجراء AI |
| 13 | منع الوصول لبيانات متجر آخر | Cross-store isolation |

**Gate:** AI Review Gate

---

## خريطة الأولويات

```
Post-LC6 Roadmap
 │
  ├─ 🥇 Phase 1 — Production Readiness Foundation ✅
  │    (قبل أي شيء: أمان + تشغيل + أساس — مكتمل)
 │
  ├─ 🥇 Phase 2 — Real Payments Foundation & Sandbox ✅
  │    (الدفع الحقيقي = أهم ميزة تجارية مفقودة — تم)
 │
 ├─ 🥇 Phase 3 — Shipping Pro ✅
 │    (الشحن الحقيقي — تم)
 │
  ├─ 🥈 Phase 4 — KYC & Compliance ✅
  │    (لا سحب بدون تحقق، لا منصة بدون امتثال — تم)
 │
 ├─ 🥈 Phase 5 — Admin Dashboard
 │    (لا إدارة منصة بدون Admin)
 │
 ├─ 🥈 Phase 6 — Subscriptions & Billing
 │    (لا إيراد بدون اشتراكات)
 │
 ├─ 🥉 Phase 7 — Notifications
 │    (تحسين تجربة المستخدم)
 │
 ├─ 🥉 Phase 8 — Integrations Hub
 │    (توسع المنصة)
 │
 ├─ 🥉 Phase 9 — Marketplaces & Migration
 │    (جذب المتاجر من المنافسين)
 │
 └─ 🎯 Phase 10 — AI Commerce Agent
      (ميزة التفوق الاستراتيجي)
```

**مبدأ الترتيب:**
1. الأمان والتشغيل أولاً (لا دفع بدون أساس آمن)
2. الدفع الحقيقي (شرط أساسي للبيع التجاري)
3. الشحن الحقيقي (شرط أساسي للبيع التجاري)
4. الامتثال والتحقق (KYC قبل السحب)
5. إدارة المنصة (Admin قبل الاشتراكات)
6. نموذج الإيراد (الاشتراكات)
7. تحسين التجربة (الإشعارات)
8. التوسع (التكاملات)
9. جذب المتاجر من المنافسين (الهجرة)
10. التفوق الاستراتيجي (AI)

---

## Post-LC6 Decision

```txt
هاء متاجر مكتمل محليًا:                    ✅ نعم
يتم نشره الآن:                             ❌ لا
يتم ربطه بهاء الآن:                        ❌ لا
يتم فتح دفع حقيقي الآن:                     ❌ لا
يتم فتح شحن حقيقي الآن:                     ❌ لا
No Deploy Policy:                          ✅ Active
المرحلة الحالية:                           ✅ جميع المراحل العشر مكتملة (PASS 2026-06-07)
المرحلة التالية:                           إكمال المتبقي من التشيك ليست الإنتاجية محليًا
```

## Deployment is the Final Step

- النشر ليس ضمن التطوير الحالي.
- النشر لا يبدأ قبل اكتمال المتبقي من التشيك ليست الإنتاجية.
- Staging لا يبدأ إلا بعد Deployment Readiness Gate + Owner GO.
- Production لا يبدأ إلا بعد نجاح Staging + Smoke + Security + Load Test.
- أي ملفات نشر أو دومينات أو مفاتيح إنتاج ممنوعة الآن.
- كل التطوير الحالي يبقى على الجهاز المحلي فقط.
- أي طلب مستقبلي للتطوير لا يعني نشرًا تلقائيًا.

أي مرحلة قبل اعتماد Post-LC6 Roadmap والموافقة عليها تعتبر **خارج الخطة** وتحتاج قرارًا استثنائيًا.

---

## الملفات المرجعية

- `docs/MASTER_CHECKLIST.md` — القائمة الشاملة
- `docs/LOCAL_COMPLETION_ROADMAP.md` — خطة الإكمال المحلي
- `docs/NO_DEPLOY_POLICY.md` — سياسة عدم النشر (مفعلة)
- `docs/PRODUCT_STRATEGY.md` — استراتيجية التفوق
- `README.md` — التوثيق الرئيسي

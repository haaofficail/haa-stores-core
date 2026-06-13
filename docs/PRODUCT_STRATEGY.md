# استراتيجية تفوق هاء متاجر / Haa Stores Differentiation Strategy

> **⛔ No Deploy Policy = Active. النشر آخر خطوة، وليس الآن.**
> ✅ **جميع المراحل العشر مكتملة (PASS 2026-06-07).**
> ✅ **Local Completion: 100%.**
> **المرحلة التالية:** إكمال المتبقي من التشيك ليست الإنتاجية محليًا.
> **النشر:** لا يبدأ إلا بعد Staging + Smoke + Security + Load Test + Owner GO.
> انظر `docs/NO_DEPLOY_POLICY.md` و `docs/MIGRATION_CHECKLIST.md`.

## الرؤية

هدف هاء متاجر ليس نسخ سلة وزد بعدد المزايا، بل بناء منصة متاجر سعودية **أسهل وأوضح ماليًا وتشغيليًا**.

ليست المنافسة في كثرة الخصائص، بل في **وضوح المال، بساطة التشغيل، وسرعة الإطلاق**.

---

## الأولويات الأساسية (Stack Ranked)

| الأولوية | الوصف |
|:---------|-------|
| 1 | **إطلاق متجر بسرعة** — من التسجيل إلى أول طلب في أقل وقت |
| 2 | **إدارة المنتجات والطلبات بسهولة** — واجهة واضحة، إجراءات قصيرة |
| 3 | **Checkout واضح ومختصر** — لا تشتيت، لا خطوات زائدة |
| 4 | **شحن مفهوم وسهل** — مناطق، أسعار، تتبع بسيط |
| 5 | **محفظة مالية دقيقة وواضحة** — كل ريال مسجل، كشف مفهوم |
| 6 | **تجربة عربية سعودية ممتازة** — عربي RTL أولاً، تجربة تاجر غير تقني |

أي ميزة لا تخدم هذه الأولويات **تؤجل** ولا تدخل في الخريطة الحالية.

---

## قاعدة قرار المنتج

> إذا كانت الميزة لا تساعد التاجر على:
> - إطلاق متجره **أسرع**
> - بيع منتجاته **أوضح**
> - إدارة طلباته **أسهل**
> - فهم أمواله **بدقة**
> - شحن طلباته **ببساطة**
> - تحسين تجربة عميله
>
> **فهي تؤجل** ولا تدخل في الأولويات الحالية.

---

## ممنوع في هذه المرحلة

- ❌ لا إضافة كود لميزات جديدة خارج الأولويات
- ❌ لا REST API مزدحمة
- ❌ لا DB Schema تعقيدية
- ❌ لا Dashboard محشو بخيارات
- ❌ لا Storefront مثقل

---

## خارطة التفوق (Excellence Roadmap)

### المرحلة الحالية — Local MVP

```
Local MVP قوي ومستقل ✅
  ├── Auth + Multi-tenancy
  ├── منتجات + تصنيفات
  ├── سلة + Checkout
  ├── طلبات + State Machine
  ├── شحن يدوي (مناطق + أسعار + تتبع)
  ├── محفظة مالية (دفتر أستاذ)
  ├── رفع صور المنتجات ✅
  ├── Security Foundation ✅
  └── Dashboard + Storefront
```

### ⛔ مسار النشر — مؤجل

```
P0A — Staging Security Foundation ✅
P0B — S3/R2 Storage Adapter ✅
P0C — Staging Environment Prep ⛔ مؤجل بقرار
Staging Deploy ⛔ مؤجل بقرار
Staging Review Gate ⛔ مؤجل بقرار
```

> **القرار**: المشروع سيبقى Local-only حتى اكتماله محليًا 100%.
> انظر `docs/LOCAL_COMPLETION_ROADMAP.md` لخطة الإكمال المحلية.

### بعد الاكتمال المحلي — مراحل التطوير

---

#### 1. Demo Polish — تحسين التجربة

| البند | الوصف |
|-------|--------|
| تحسين واجهة المتجر | Storefront UI refinements |
| تحسين صفحة المنتج | Product page layout, images, variants |
| تحسين Checkout | تقليل الخطوات، تحسين التدفق |
| تحسين المحفظة | Wallet UI clarity |
| تحسين الشحن اليدوي | Manual shipping UX |
| تحسين تجربة رفع الصور | Image upload feedback |

---

#### 2. Wallet Pro — محفظة متقدمة

| البند | الوصف |
|-------|--------|
| كشف حساب أوضح | تفصيل الإيداعات والسحوبات |
| تفريق الكاش عن الإلكتروني | Cash vs card separation |
| رسوم الدفع | Payment gateway fees |
| عمولة المنصة | Platform commission |
| رسوم الشحن | Shipping cost tracking |
| صافي مستحق التاجر | Net merchant balance |
| تصدير Excel | Wallet entries export |
| كشف شهري PDF | Monthly statement (لاحقًا) |

---

#### 3. Shipping Pro — شحن متقدم

| البند | الوصف |
|-------|--------|
| شحن يدوي مبسط | Manual shipping simplified |
| مناطق وأسعار أوضح | Shipping zones/rates UX |
| مدة توصيل | Delivery time estimates |
| شحن مجاني فوق مبلغ | Free shipping threshold |
| مزود شحن حقيقي واحد لاحقًا | Real carrier integration (SMSA, etc.) |
| مقارنة أسعار شركات لاحقًا | Carrier rate comparison |

---

#### 4. Payment Integration — دفع حقيقي

| البند | الوصف |
|-------|--------|
| مزود دفع واحد فقط في البداية | Single provider (Moyasar, etc.) |
| fake provider يبقى للتجارب | Keep FakePaymentProvider for dev |
| لا تخزين لبيانات البطاقات | No card data storage |
| Webhooks آمنة | Secure webhook signature verification |
| Refund rules لاحقًا | Refund workflow and rules |

---

#### 5. Saudi Commerce Experience — تجربة سعودية

| البند | الوصف |
|-------|--------|
| عربي RTL أولًا | Arabic-first, RTL by default ✅ |
| واتساب كقناة أساسية لاحقًا | WhatsApp as primary channel |
| مدن ومناطق السعودية | Saudi cities and regions presets |
| دعم الأسر المنتجة والمتاجر الصغيرة | Support for small merchants |
| تجربة تاجر غير تقني | Non-technical merchant experience |

---

## ملخص القرارات الاستراتيجية

| القرار | المنطق |
|--------|--------|
| **لا نقارن بعدد المزايا** | الكثرة تُربك التاجر غير التقني |
| **الوضوح أهم من القوة** | تاجر يفهم أمواله = تاجر يثق بالمنصة |
| **البساطة قبل المرونة** | 80% من المتاجر تحتاج 20% من الميزات |
| **سعودي أولاً** | التجربة العربية ليست ترجمة، هي تصميم أصلي |
| **المنصة مستقلة** | لا تبعية لمنصة هاء، الربط API لاحقًا اختياري |
| **Local-only أولًا** | لا نشر قبل اكتمال المنتج محليًا 100% |

# Privacy Policy — هاء متاجر (Haa Stores)

> **Last updated:** 2026-06-17
> **Effective date:** TBD (on live deployment)
> **Owner:** Haa Stores Platform Team
> **Compliance framework:** Saudi Personal Data Protection Law (PDPL — نظام حماية البيانات الشخصية) + SAMA Cybersecurity Framework + CITC regulations

---

## 1. مقدمة (Introduction)

هاء متاجر ("Haa Stores", "we", "us", "our") هي منصة تجارة إلكترونية سعودية متعددة المستأجرين (multi-tenant SaaS) تتيح للتجار فتح متاجرهم وإدارة منتجاتهم وطلباتهم وعملائهم. تلتزم المنصة بنظام حماية البيانات الشخصية في المملكة العربية السعودية (PDPL) الصادر بالمرسوم الملكي رقم (م/148) بتاريخ 5/9/1444هـ، وكذلك لائحة حماية البيانات الشخصية الصادرة عن سدايا.

تهدف هذه السياسة إلى شرح:

- ما البيانات التي نجمعها
- كيف نستخدمها
- مع من نشاركها
- كيف نحميها
- ما حقوقك وكيف تمارسها

---

## 2. البيانات التي نجمعها (Data We Collect)

### 2.1 بيانات التاجر (Merchant Data)

عند تسجيل تاجر جديد على المنصة، نجمع:

| Data | Purpose | Legal basis |
|------|---------|-------------|
| Name (الاسم) | Account identification, contracts | Contract performance |
| Email (البريد الإلكتروني) | Login, notifications, password recovery | Contract performance |
| Phone number (رقم الجوال) | OTP verification, notifications, support | Contract performance |
| Password (hashed) | Authentication | Contract performance |
| Store name + slug | Public storefront URL | Consent (merchant publishes) |
| Commercial Registration (السجل التجاري) | ZATCA + SAMA compliance | Legal obligation |
| VAT number (الرقم الضريبي) | Tax invoice generation | Legal obligation |
| Bank account details (للصرف) | Payout execution | Contract performance |
| National ID / Iqama (للتحقق من الهوية) | KYC for payment providers | Legal obligation |

### 2.2 بيانات العميل (Customer Data)

عند تسجيل عميل أو إتمام طلب شراء، نجمع:

| Data | Purpose | Legal basis |
|------|---------|-------------|
| Name (الاسم) | Order fulfillment, shipping | Contract performance |
| Phone number (رقم الجوال) | Shipping, delivery notifications | Contract performance |
| Email (optional) | Order confirmation, marketing (with consent) | Consent |
| Shipping address (عنوان الشحن) | Order delivery | Contract performance |
| Order history (سجل الطلبات) | Support, returns, analytics | Contract performance |
| Payment method token (مرجع، بدون بيانات البطاقة الكاملة) | Recurring payments | Contract performance |

**Important:** Haa Stores **never** stores full credit card numbers. Payment is processed by certified providers (Moyasar, Geidea, Tabby, Tamara) using tokenization. We only store the provider's payment reference ID.

### 2.3 بيانات تلقائية (Automatically Collected)

| Data | Purpose | Legal basis |
|------|---------|-------------|
| IP address | Fraud detection, security, localization | Legitimate interest |
| Browser user-agent | Compatibility, security | Legitimate interest |
| Device fingerprint (optional) | Fraud prevention | Consent |
| Session cookies | Authentication | Strictly necessary |
| Analytics events (page views, etc.) | Product improvement, merchant analytics | Consent |

### 2.4 بيانات السوق العام (Public Marketplace Data)

> **TASK-0042 Phase 3 — P0-6 marketplace disclosure.** Engineering
> draft; subject to Data Protection Officer (DPO) and legal review
> before publication. See `docs/SFDA_DISCLAIMER.md` for SFDA-specific
> disclaimers.

When you use the Haa public marketplace (`/marketplace/*`), additional data flows occur:

| Data | Purpose | Legal basis | Shared with |
|------|---------|-------------|-------------|
| Unified marketplace order number | Order tracking across multiple merchants | Contract performance | All merchants in your cart |
| Customer name + phone + shipping address | Order fulfillment per merchant | Contract performance | Each merchant in your order |
| Marketplace search history | Product discovery, recommendations | Consent | Aggregated, anonymized only |
| Marketplace analytics events | Platform improvement, fraud detection | Legitimate interest | None (Haa internal only) |
| Order tracking accessToken | Secure order lookup (replaces phone-based enumeration) | Contract performance | None (proof of ownership only) |

**Multi-merchant disclosure:**

When you place a marketplace order, your data (name, phone, shipping address, order items) is shared with **EACH independent merchant** in your cart. Each merchant becomes a separate data controller for their portion of the order. Haa is the platform operator and unified order creator; merchants are responsible for their own data handling.

**Marketplace seller disclosure:**

Products on the Haa public marketplace are sold by **INDEPENDENT MERCHANTS**, not by Haa Stores directly. Haa is the platform operator and is **not a party** to the sale contract between you and the merchant. The merchant is the seller of record.

**Aggregated analytics exclusion:**

Demo stores (per `docs/CURRENT_STATE.md` and `packages/shared/src/demo/demo-rules.ts`) are excluded from marketplace analytics to avoid polluting KPIs with synthetic data.

---

## 3. كيف نستخدم البيانات (How We Use Data)

نستخدم البيانات للأغراض التالية فقط:

1. **Service delivery:** تقديم خدمات المنصة (إنشاء متجر، معالجة طلبات، شحن، دفع).
2. **Authentication & security:** التحقق من الهوية، منع الاحتيال، حماية الحسابات.
3. **Payment processing:** معالجة المدفوعات عبر مزودي الدفع المعتمدين.
4. **Tax compliance:** الامتثال لالتزامات ZATCA (إصدار فواتير ضريبية، تقارير).
5. **Customer support:** تقديم الدعم وحل المشاكل.
6. **Service improvement:** تحسين المنصة (aggregated, anonymized analytics).
7. **Legal compliance:** الامتثال لطلبات الجهات الحكومية المختصة (هيئة التجارة، SAMA، CITC، PDPL).

**نلتزم بـ:**
- مبدأ تقليل البيانات (Data minimization)
- مبدأ تحديد الغرض (Purpose limitation)
- مبدأ الاحتفاظ الضروري (Storage limitation)

---

## 4. مشاركة البيانات (Data Sharing)

### 4.1 مزودي الخدمات (Sub-processors)

نشارك البيانات مع الأطراف التالية فقط لتقديم الخدمة:

| Sub-processor | Purpose | Data shared | Location |
|---------------|---------|-------------|----------|
| Moyasar | Card payment processing | Payment intent + token | KSA |
| Geidea | Card payment processing | Payment intent + token | KSA |
| Tabby | BNPL | Order details | UAE |
| Tamara | BNPL | Order details | KSA |
| OTO | Shipping | Order + address | KSA |
| SMSA | Shipping | Order + address | KSA |
| Aramex | Shipping | Order + address | KSA |
| Cloudflare | CDN, DDoS protection | IP, request metadata | Global |
| Fly.io (planned) | Hosting | All server data | Global |
| Supabase (planned) | PostgreSQL hosting | All DB data | Global |

### 4.2 متى نشارك (When We Share)

نشارك البيانات فقط في الحالات التالية:

- **مع مزودي الخدمة** المذكورين أعلاه لأداء الخدمة (بموجب اتفاقية معالجة بيانات DPA).
- **مع الجهات الحكومية** عند صدور طلب رسمي بموجب القانون السعودي.
- **في حالات الطوارئ** لحماية الأرواح أو الممتلكات.
- **بموافقة صريحة** من صاحب البيانات (مثلاً لمشاركة بيانات مع تاجر آخر).

**نحن لا نبيع البيانات الشخصية أبداً.**

---

## 5. نقل البيانات خارج المملكة (Cross-border Data Transfer)

بموجب المادة 23 من نظام PDPL، يخضع نقل البيانات الشخصية خارج المملكة لقيود:

- **الافتراضي:** البيانات تُخزَّن وتُعالَج داخل المملكة العربية السعودية.
- **الاستثناء:** النقل مسموح فقط إلى دول/جهات توفر مستوى حماية كافٍ، أو بموافقة صريحة من سدايا.
- **مزودي الدفع الدوليين (Tabby في الإمارات):** تخضع لاتفاقيات DPA تتضمن البنود التعاقدية المعيارية (SCCs).

---

## 6. أمن البيانات (Data Security)

نطبق إجراءات أمنية متعددة الطبقات لحماية البيانات:

### 6.1 تشفير (Encryption)

- **At rest:** AES-256 لتشفير بيانات الدفع والبيانات الحساسة في الـ DB.
- **In transit:** TLS 1.3 لكل الاتصالات (HTTPS only).
- **Credentials:** تخزين آمن لكلمات المرور (bcrypt) ومفاتيح API (AES-256 مع مفتاح في `PAYMENT_CREDENTIALS_ENCRYPTION_KEY`).

### 6.2 صلاحيات الوصول (Access Control)

- **Authentication:** JWT-based authentication مع tenant scoping.
- **RBAC:** نظام صلاحيات متعدد الأدوار (8 أدوار، 50+ صلاحية).
- **Defense-in-depth:** `requireAuth()` + `requireStoreAccess()` + `requirePermission()` على كل route.
- **Audit logging:** كل عملية حساسة تُسجَّل في `audit_logs` (login, payment, refund, role change).

### 6.3 حماية البنية التحتية (Infrastructure Security)

- **CSRF protection:** Origin header check على كل mutating request.
- **Rate limiting:** حماية من DDoS و brute-force.
- **SQL injection prevention:** Drizzle ORM parameterized queries.
- **XSS protection:** Content Security Policy + input sanitization.
- **Webhook signature verification:** HMAC-SHA256 على كل webhook.

### 6.4 نسخ احتياطي (Backups)

- نسخ احتياطي يومي للـ DB (retention: 30 يوم)
- اختبارات استعادة دورية (quarterly)
- تشفير الـ backups

---

## 7. الاحتفاظ بالبيانات (Data Retention)

| Data type | Retention period |
|-----------|-----------------|
| حساب تاجر نشط | طوال فترة النشاط + 7 سنوات (التزام محاسبي) |
| حساب تاجر محذوف | 30 يوم (soft delete) ثم حذف نهائي |
| سجلات الطلبات | 10 سنوات (نظام التجارة الإلكترونية السعودي) |
| الفواتير الضريبية | 7 سنوات (ZATCA) |
| سجلات التدقيق (audit logs) | 5 سنوات |
| Support tickets | 3 سنوات |
| Marketing events | 1 سنة |
| Session logs | 90 يوم |
| Error logs (support-error-events) | 30 يوم |

---

## 8. حقوقك (Your Rights)

بموجب نظام PDPL، لك الحقوق التالية:

| الحق | الوصف | كيف تمارسه |
|------|-------|-----------|
| **Right to be informed** (الحق في العلم) | معرفة ما نجمع وكيف نستخدم | هذه السياسة + privacy notice داخل التطبيق |
| **Right to access** (الحق في الوصول) | الحصول على نسخة من بياناتك | `GET /merchant/:storeId/data-export` |
| **Right to rectification** (الحق في التصحيح) | تصحيح بيانات خاطئة | داخل إعدادات الحساب |
| **Right to erasure** (الحق في الحذف — "الحق في النسيان") | حذف بياناتك | `DELETE /merchant/:storeId/account` (30-day soft delete) |
| **Right to restrict processing** (الحق في تقييد المعالجة) | إيقاف معالجة معينة | تواصل معنا |
| **Right to data portability** (الحق في نقل البيانات) | استلام بياناتك بصيغة منظمة | `GET /merchant/:storeId/data-export` (JSON + CSV) |
| **Right to object** (الحق في الاعتراض) | الاعتراض على معالجة معينة | تواصل معنا |
| **Right to withdraw consent** (الحق في سحب الموافقة) | سحب موافقة سبق منحها | داخل إعدادات الخصوصية |

**للتواصل:** `privacy@haastores.sa` — نرد خلال 30 يوماً كحد أقصى (متطلب PDPL).

---

## 9. خصوصية الأطفال (Children's Privacy)

المنصة غير موجهة للأطفال دون 18 سنة. لا نجمع بيانات شخصية منهم عمداً. إذا اكتشفنا ذلك، نحذفها فوراً.

---

## 10. ملفات تعريف الارتباط (Cookies)

نستخدم cookies للأغراض التالية:

| Cookie | Purpose | Type | Duration |
|--------|---------|------|----------|
| `haa_session` | Authentication | Strictly necessary | Session |
| `haa_cart` | Shopping cart | Strictly necessary | 30 days |
| `haa_brand` | Theme primary color | Strictly necessary | 90 days |
| `haa_analytics` | Usage analytics (anonymized) | Consent | 1 year |
| `haa_marketing` | Marketing attribution | Consent | 30 days |

يمكنك إدارة تفضيلات cookies من إعدادات المتصفح.

---

## 11. التغييرات على السياسة (Changes to This Policy)

نُحدّث هذه السياسة عند:

- إضافة بيانات جديدة نجمعها
- تغيير في أغراض المعالجة
- تغيير في مزودي الخدمة
- متطلب قانوني جديد

سنُخطرك عبر:
- إشعار داخل التطبيق (30 يوماً قبل السريان)
- بريد إلكتروني (للتغييرات الجوهرية)

---

## 12. التواصل والشكاوى (Contact & Complaints)

**Data Controller:** Haa Stores
**Email:** `privacy@haastores.sa`
**Address:** [TBD — العنوان البريدي للسجل التجاري]

**شكوى إلى الجهة التنظيمية:**

إذا لم نتمكن من حل مخاوفك، يحق لك تقديم شكوى إلى:

**Saudi Data & AI Authority (سدايا) — البيانات الشخصية**
https://sdaia.gov.sa

---

## 13. Cross-references

- `docs/security/SECURITY_BASELINE.md` — security controls
- `docs/security/DATA_ISOLATION_AUDIT.md` — tenant + store isolation
- `docs/security/LOGGING_PRIVACY_AUDIT.md` — PII handling in logs
- `docs/SAUDI_COMPLIANCE_CHECKLIST.md` — overall Saudi compliance status
- TASK-0034 (sub-item 8) — PDPL data export + account deletion endpoints
- TASK-0042 — marketplace data flows (§2.4) and SFDA disclaimers
- `docs/SFDA_DISCLAIMER.md` — SFDA-specific disclaimers (regulated products)
- `docs/TERMS_OF_SERVICE.md §8.5` — independent sellers on Haa Marketplace

---

**Document version:** 1.0
**Next review:** 2026-12-17 (every 6 months)
**Approved by:** [TBD — requires Owner + Legal review before live]

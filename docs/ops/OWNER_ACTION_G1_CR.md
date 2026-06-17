# G1 — Commercial Registration (CR) Checklist

> **Owner action required.** Engineering prepared this checklist to
> help you obtain your Commercial Registration from MoCI (Ministry of
> Commerce and Industry). This is **G1 of TASK-0038** — the first
> of 10 owner action items.
>
> **Cross-references:**
> - `docs/ops/TASK_TRACKER.md` TASK-0038 (G1)
> - `docs/SAUDI_COMPLIANCE_CHECKLIST.md` §2 (CR status)
> - `docs/ops/BETA_LAUNCH_CHECKLIST.md` §0 (G1 prerequisite)
> - MoCI: https://mc.gov.sa/

---

## 1. What is the Commercial Registration (CR)?

The **السجل التجاري** (Commercial Registration, or CR) is the official
government-issued license that authorizes your company to conduct
business in Saudi Arabia. It's issued by MoCI and is **mandatory**
for any business operating in KSA — including e-commerce platforms.

**For Haa Stores:** Without a CR, you cannot:
- Open a corporate bank account
- Apply for VAT registration (G2 — depends on G1)
- Get an e-commerce license (G3)
- Sign a Tabby DPA (G9 — requires legal entity)
- Hire employees legally
- Sign B2B contracts (pen-test firm, payment gateways, etc.)

**Status:** This is the **first legal entity step**. Most other compliance items depend on having a CR first.

---

## 2. Prerequisites before you apply

Gather these documents BEFORE starting the MoCI application:

### 2.1 Identity documents

- [ ] **Saudi national ID** (الهوية الوطنية) — for Saudi founder
- [ ] **Iqama** (إقامة) + passport — for non-Saudi founder
- [ ] **National address** (العنوان الوطني) — registered with SPL (Saudi Post)

### 2.2 Founding documents (depends on entity type)

For a **Single Shareholder LLC** (شركة الشخص الواحد — most common for solo founders):

- [ ] **Articles of Association** (عقد التأسيس) — drafted by a lawyer
- [ ] **Commercial name reservation** (حجز الاسم التجاري) — must be unique
- [ ] **Capital declaration** (رأس المال) — minimum SAR 5,000 (recommended: SAR 50,000-100,000)
- [ ] **Bank certificate** (شهادة بنكية) — proof of capital deposit
- [ ] **Office address** — physical address in KSA (can be virtual office for e-commerce)

For **other entity types** (joint stock, branch of foreign company, etc.) — consult a lawyer.

### 2.3 Activity licensing

- [ ] **ISIC code selection** — for e-commerce: `4791` (Retail sale via mail order or internet)
- [ ] **Additional activities** if applicable (e.g., `6201` for software publishing, `6311` for data processing)

### 2.4 Optional but recommended

- [ ] **Trademark search** (بحث علامة تجارية) — check uniqueness of "هاء" + "Haa"
- [ ] **Tax advisor consultation** — for optimal entity structure

---

## 3. Application process (step-by-step)

### Step 1: Reserve your commercial name (1-2 days)

**Channel:** MoCI online portal: https://mc.gov.sa/ar/eservices

1. Create an account on the MoCI portal using your national ID / Iqama.
2. Navigate to "Commercial Name Reservation" (حجز اسم تجاري).
3. Search for "هاء متاجر" / "Haa Stores" — verify it's available.
4. Submit reservation + pay the small fee (~SAR 200).
5. Wait for MoCI approval (typically 1-2 business days).
6. Name is reserved for 60 days.

### Step 2: Draft Articles of Association (3-5 days)

**Channel:** Hire a Saudi business lawyer.

- Cost: SAR 3,000-10,000 (depending on complexity)
- The lawyer drafts the عقد التأسيس following MoCI templates
- Includes: company name, capital, activities, shareholder info, management structure
- For LLC: relatively simple (1-2 pages typically)

### Step 3: Get a bank certificate (1-2 days)

1. Open a temporary bank account at any Saudi bank (NCB, Al Rajhi, Riyad Bank).
2. Deposit the declared capital (SAR 50,000-100,000).
3. Get the bank certificate (شهادة بنكية) confirming the deposit.
4. This certificate is required for the CR application.

### Step 4: Submit the CR application (1-3 days processing)

**Channel:** MoCI online portal.

Required uploads:
- [ ] Articles of Association (PDF, signed)
- [ ] Bank certificate
- [ ] National ID / Iqama copy
- [ ] National address proof
- [ ] Activity classification (ISIC codes)
- [ ] Office address proof (utility bill or lease)

Steps:
1. Log in to MoCI portal.
2. Navigate to "Issue Commercial Registration" (إصدار سجل تجاري).
3. Fill in all forms + upload documents.
4. Pay the CR fee (~SAR 200-500).
5. Submit for review.

### Step 5: Receive your CR (1-3 business days)

- MoCI reviews the application
- If approved: CR is issued electronically (PDF + رقم السجل)
- If rejected: review reason, fix, resubmit
- You'll receive a unique **رقم السجل التجاري** (CR number) — e.g., `1010123456`

### Step 6: Post-registration actions (immediately)

After receiving your CR:

- [ ] **Add CR number to Haa platform**: Update `tenants.cr_number` in DB.
- [ ] **Update KYC forms** to require CR for merchant onboarding.
- [ ] **Backup CR document** to secure storage.
- [ ] **Apply for Chamber of Commerce membership** (الغرفة التجارية) — often auto with CR.
- [ ] **Notify bank** to upgrade account to corporate status.

---

## 4. Timeline summary

| Step | Duration | Dependency |
|------|----------|------------|
| Prerequisites (ID + address) | 0-7 days | None |
| Name reservation | 1-2 days | National ID |
| Lawyer + Articles of Association | 3-5 days | Name reserved |
| Bank account + deposit | 1-2 days | Articles + ID |
| CR application | 1-3 days | All above |
| **Total from scratch** | **7-19 days** | If you have ID + address ready |
| **Total (urgent)** | **3-5 days** | If lawyer + bank + MoCI all expedite |

---

## 5. Cost estimate

| Item | Cost (SAR) |
|------|-----------|
| Lawyer (Articles of Association) | 3,000 - 10,000 |
| CR application fee | 200 - 500 |
| Bank capital deposit (refundable) | 50,000 - 100,000 |
| Chamber of Commerce membership | 500 - 2,000 / year |
| **Total out-of-pocket (excluding capital)** | **~4,000 - 12,000** |

**Capital is refundable** when you close the company. The deposit is the company's, not yours personally (for an LLC).

---

## 6. Recommended service providers (KSA)

> **Disclaimer:** These are research-grade suggestions based on public
> information. Engineering has **NOT engaged with any of these firms**.
> Verify credentials independently.

### Business lawyers (Riyadh-based)

| Firm | Specialty | Estimated cost |
|------|-----------|----------------|
| **Al Tamimi & Company** | Full-service, KSA presence | Premium (SAR 10k+) |
| **BSA Law** | Tech/startup focus | Mid-range |
| **Counsel Saudi** | Boutique, English/Arabic | Mid-range |

### Banks (for capital deposit + corporate account)

| Bank | Pros | Cons |
|------|------|------|
| **NCB (Saudi National Bank)** | Largest, full services | Slower onboarding |
| **Al Rajhi Bank** | Widest branch network | Less tech-focused |
| **Riyad Bank** | Tech-friendly, startup programs | Smaller network |
| **SAB (Saudi Awwal Bank)** | Startup-focused, digital-first | Newer |

---

## 7. Common mistakes to avoid

- ❌ **Choosing a complex entity type** (joint stock when LLC suffices) — pays more in fees and taxes.
- ❌ **Skipping the lawyer** — DIY Articles of Association have errors that cause MoCI rejection.
- ❌ **Choosing a commercial name too similar to a registered one** — MoCI rejects and you restart (lost 1-2 days).
- ❌ **Wrong ISIC code** — for e-commerce, use `4791`. Other codes may trigger extra licensing requirements.
- ❌ **Not registering the National Address first** — required for the CR application.
- ❌ **Forgetting the CR number on invoices** — illegal without it (PDPL + ZATCA requirement).

---

## 8. After G1: enable next owner actions

Once you have your CR number, these become immediately actionable:

| Item | Why CR is required |
|------|---------------------|
| **G2 VAT** | ZATCA requires a registered CR for VAT application |
| **G3 E-commerce license** | MoCI issues e-commerce license only to entities with valid CR |
| **G4 DPO** | DPO must be employed by a legally registered entity |
| **G6 PCI-DSS ASV** | ASV scan requires legal entity + CR number on attestation |
| **G7 Pen-test** | Vendor contract requires legal entity |
| **G9 Tabby DPA** | DPA must be between two legal entities |

**G1 is the bottleneck for 5 of the remaining 9 owner items.**

---

## 9. Communication templates

### Email to lawyer (initial inquiry)

```
Subject: طلب تأسيس شركة شخص واحد — نشاط تجارة إلكترونية

مرحباً [اسم المحامي]،

أحتاج خدماتكم لتأسيس شركة شخص واحد (LLC) في السعودية
للنشاط التالي:
- [4791] Retail sale via mail order or internet
- [6201] Software publishing (إن لزم)
- [6311] Data processing (إن لزم)

التفاصيل:
- المؤسس: [اسمك]، رقم الهوية [رقم]
- رأس المال المقترح: SAR [مبلغ]
- النشاط الرئيسي: منصة SaaS للتجارة الإلكترونية (هاء متاجر)

أحتاج:
1. حجز اسم تجاري
2. صياغة عقد التأسيس
3. استشارة ضريبية مختصرة

هل يمكن إبلاغي بالميزانية والجدول الزمني؟

مع الشكر،
[اسمك]
```

### Email to bank (corporate account)

```
Subject: طلب فتح حساب شركة — شركة شخص واحد

مرحباً [اسم الفرع]،

أحتاج فتح حساب شركة لـ [اسم الشركة] (شركة شخص واحد — قيد التأسيس).
التفاصيل:
- المؤسس: [اسمك]، الهوية: [رقم]
- رأس المال: SAR [مبلغ]
- النشاط: تجارة إلكترونية
- الاستخدام المتوقع: استقبال مدفوعات، دفع تجار، رواتب

هل يمكن إبلاغي بالمتطلبات والرسوم والجدول الزمني؟

مع الشكر،
[اسمك]
```

---

## 10. References

- **MoCI:** https://mc.gov.sa/
- **MoCI e-services:** https://mc.gov.sa/ar/eservices (CR + name reservation)
- **SPL National Address:** https://splonline.com.sa/ar
- **ISIC codes:** https://unstats.un.org/unsd/classifications
- **ZATCA (next: G2):** https://zatca.gov.sa/
- **Lawyer directory:** https://www.moj.gov.sa/

---

**Last Updated:** 2026-06-17 (TASK-0038 G1 engineering brief — Session T)
**Owner Action:** Apply for CR at MoCI
**Engineering Effort:** 30 min to update `tenants.cr_number` schema + KYC validation after CR received
**Estimated Total Time:** 3-19 days from ID-ready
**Estimated Cost:** SAR 4k-12k out-of-pocket + SAR 50k-100k refundable capital deposit

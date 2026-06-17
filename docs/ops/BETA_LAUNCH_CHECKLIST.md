# Beta Launch Checklist — TASK-0045 §8.4

> **Owner decision required.** Engineering prepared this checklist to
> make controlled-beta launch faster + safer. You (the founder) make
> the final call on go/no-go.
>
> **Cross-references:**
> - `docs/ops/MARKETPLACE_HARDENING_PLAN.md` §8 Phase 6 §8.4
> - `docs/ops/TASK_TRACKER.md` TASK-0045 (Phase 6 — final step)
> - `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` (must complete pen-test first)

---

## 0. Prerequisites (must all be ✅)

- [ ] **Pen-test report signed off** as PASS, OR all Critical/High findings fixed (TASK-0045 §8.3).
- [ ] **All 10 TASK-0038 owner action items closed** (G1-G10).
- [ ] **Legal review of drafts complete**:
  - `docs/PRIVACY_POLICY.md §2.4` (marketplace data flows)
  - `docs/TERMS_OF_SERVICE.md §8.5` (independent sellers)
  - `docs/SFDA_DISCLAIMER.md` (SFDA disclaimers)
- [ ] **DPO appointed + contact published** in PRIVACY header (per PDPL Article 22).
- [ ] **PCI-DSS ASV scan passed** (G6).
- [ ] **DR plan documented + tabletop exercise run** (G10).
- [ ] **`pnpm preflight:pentest`** runs clean against staging (TASK-0045 §8.1).

---

## 1. Pre-launch (T-7 days)

### 1.1 Merchant cohort selection (10-20 merchants)

**Target profile:**
- Active Instagram/TikTok presence (KSA e-commerce ready).
- Existing CR + VAT + bank account (G1 + G2 already closed).
- 1-50 SKUs per store (manageable for soft-launch review).
- Willing to provide weekly feedback for 1 month.
- Mix of categories: food (1-2), cosmetics (1-2), electronics (2-3), apparel (2-3), other (2-3).

**Selection criteria:**
| Criterion | Weight | Pass threshold |
|-----------|--------|----------------|
| CR + VAT active | Required | ✅ |
| KYC verified in Haa | Required | ✅ |
| Willing to do KYC review + sign DPA | Required | ✅ |
| Active social media presence | 15% | ≥1000 followers |
| Product variety | 10% | ≥10 SKUs |
| Geographic coverage | 10% | Multi-city |
| Prior e-commerce experience | 10% | ≥1 year |
| Technical capability (basic) | 10% | Can upload products |
| Reference from existing merchant | 5% | Bonus |

### 1.2 Invitation email template

> **Subject:** [دعوة] الانضمام للسوق التجريبي العام لـ هاء متاجر — جاهز للإطلاق
>
> مرحباً [اسم التاجر]،
>
> ندعوك للانضمام إلى **السوق التجريبي لسوق هاء العام** — المرحلة الأولى من الإطلاق التجاري العام.
>
> **ما هو سوق هاء؟**
> منصة تجمع منتجات عدة تجار في **سوق عام موحد** (`/marketplace`) حيث يمكن للعملاء اكتشاف منتجاتك مع الحفاظ على هويتك التجارية الكاملة.
>
> **لماذا ندعوك؟**
> - عندك سجل تجاري وضريبة قيمة مضافة فعّال
> - عندك منتجات أصيلة تلبي معايير SFDA (إن لزم)
> - عندك حضور نشط على وسائل التواصل
>
> **ما الذي ستحصل عليه؟**
> - متجر إلكتروني بـ `/s/[اسمك]` + ظهور تلقائي في `/marketplace`
> - نظام طلبات موحد مع تتبع مركزي
> - تكامل مع بوابات الدفع المحلية (Moyasar/Geidea/Tabby/Tamara)
> - محفظة إلكترونية مع تقارير فورية
>
> **التزاماتك خلال الفترة التجريبية (شهر واحد):**
> - شحن + تسليم الطلبات خلال 48 ساعة
> - الرد على استفسارات العملاء خلال 24 ساعة
> - تقديم ملاحظات أسبوعية (نصف ساعة مكالمة)
>
> **شروط الاشتراك:**
> - رسوم المنصة: 5% من قيمة الطلب (نفس النسبة الحالية في متجرك)
> - الدفع: أسبوعي عبر حسابك البنكي المسجل
> - الإنهاء: يحق لك الانسحاب بأي وقت
>
> **الخطوات التالية:**
> إذا كنت مهتماً، أجب على هذا الإيميل خلال 48 ساعة وسأرسل لك:
> 1. رابط تسجيل الدخول التجريبي
> 2. دليل البدء السريع (15 دقيقة)
> 3. مكالمة تعريفية مع فريق هندسة هاء
>
> مع أطيب التحيات،
> [اسمك]
> المؤسس — هاء متاجر

### 1.3 Onboarding checklist (per merchant)

When a merchant accepts:

- [ ] **KYC re-verification** (CR + VAT + bank + signing authority on file)
- [ ] **DPA signed** (Data Processing Agreement per PDPL Article 25)
- [ ] **Merchant agreement signed** (10 pages, includes marketplace terms, returns policy, SFDA compliance, dispute escalation)
- [ ] **Demo session** (45-min walkthrough of marketplace features)
- [ ] **5-10 products uploaded** + admin review + approval
- [ ] **First test order** (we send a test order, merchant processes it end-to-end)
- [ ] **Welcome packet** (PDF: policies, support contacts, escalation paths)
- [ ] **Slack/email group** added for ongoing feedback

---

## 2. Launch day (T-0)

### 2.1 Engineering pre-flight (T-1 hour)

- [ ] **All commits pushed** to main + deployed to production.
- [ ] **Database migrations applied** (0058 accessToken, 0059 categories, 0060 SFDA).
- [ ] **`pnpm preflight`** runs clean on production smoke test.
- [ ] **`pnpm preflight:pentest`** runs clean against production.
- [ ] **All 4 baseline test failures** are documented as known-accepted (NOT regressions).
- [ ] **`MARKETPLACE_PUBLIC_ENABLED=true`** in production env (default false → set to true for launch).
- [ ] **Rate limits verified** at production thresholds (600 browse, 30 order).
- [ ] **Monitoring dashboards** running (ops:monitor:report last 24h clean).
- [ ] **Incident response runbook** reviewed (docs/INCIDENT_RESPONSE.md).
- [ ] **Rollback plan rehearsed** (see §3 below).

### 2.2 Launch actions (T-0)

- [ ] **Email sent** to all 10-20 merchants with `/marketplace` link + KYC re-verification link.
- [ ] **Slack/email announcement** to existing merchants (NOT in cohort): "Marketplace launching as beta — you can opt in by contacting us."
- [ ] **Press release** (if applicable): drafted by founder, sent to media list.
- [ ] **Social media announcement**: LinkedIn + Twitter + Instagram.
- [ ] **DPO contact** verified in PRIVACY_POLICY header (Article 22 compliance).
- [ ] **Monitor dashboard** at 15-min intervals for first 4 hours.

### 2.3 First-day monitoring (T+0 to T+24h)

Track these metrics every 15 minutes:

| Metric | Threshold | Action if breached |
|--------|-----------|---------------------|
| Error rate (5xx) | <0.5% | Investigate immediately |
| Order creation rate | >0 baseline | If 0 in first 4h: merchants may not have started |
| Payment success rate | >95% | Investigate gateway integration |
| API p95 latency | <500ms | Investigate slow query |
| Marketplace signups | >5/day | If 0: marketing issue, not product |
| Customer support tickets | <10/day | If spike: rollback trigger |

---

## 3. Rollback plan (T+0 to T+30 days)

### 3.1 Rollback triggers (auto + manual)

**Automatic rollback** (system enforces):
- Error rate >5% for 5 consecutive minutes → set `MARKETPLACE_PUBLIC_ENABLED=false`.
- Order fraud score >threshold → suspend that merchant's listings.

**Manual rollback** (you call it):
- Critical security finding from pen-test follow-up.
- Regulator (MoCI/SAMA/NCA) requires immediate shutdown.
- Cohort merchant reports systematic issue affecting >10% of customers.
- Data breach detected (PDPL Article 17 incident).

### 3.2 Rollback procedure (5-minute execution)

```bash
# 1. Disable marketplace public visibility (instant)
kubectl set env deployment/api MARKETPLACE_PUBLIC_ENABLED=false

# 2. Verify marketplace returns 404 for new visitors
curl -sS -o /dev/null -w "%{http_code}\n" https://haastores.sa/marketplace
# Expected: 404

# 3. Existing orders continue normally (no data loss)
# 4. Notify cohort merchants via Slack (template in §3.4)
# 5. Post-mortem within 48h
```

### 3.3 Data preservation during rollback

- **All orders preserved**: completed + in-flight orders continue normally.
- **Merchant products preserved**: catalog + inventory intact.
- **Customer data preserved**: PDPL Article 17 (data breach response) — no data deleted.
- **Audit logs preserved**: every action timestamped + traceable.

### 3.4 Rollback communication templates

#### To merchants
> **Subject:** [هام] تحديث على السوق التجريبي — صيانة مؤقتة
>
> زملاءنا التجار،
>
> نواجه حالياً [technical issue / security review / regulator request] يتطلب منا إيقاف السوق مؤقتاً.
>
> **ماذا يحدث:**
> - `/marketplace` لن يكون متاحاً للعملاء الجدد
> - الطلبات الحالية ستكتمل بشكل طبيعي
> - متاجركم الفردية `/s/[اسمك]` تعمل بدون تغيير
>
> **الجدول الزمني:**
> متوقعون عودة السوق خلال [24-72 ساعة] بعد اكتمال [root cause fix].
>
> سنوافيك بتحديث كل [4 ساعات].
>
> مع أطيب التحيات،
> فريق هاء

#### To customers
> **Subject:** [هام] تحديث على طلبات سوق هاء
>
> عميلنا العزيز،
>
> نواجه حالياً [issue] يتطلب منا إيقاف السوق مؤقتاً.
>
> **ماذا يحدث لطلبك:**
> - إذا كان طلبك **مكتمل**: لا تغيير.
> - إذا كان طلبك **قيد الشحن**: سيكتمل بشكل طبيعي.
> - إذا كان طلبك **لم يُشحن بعد**: سنتواصل معك خلال 24 ساعة.
>
> نعتذر عن الإزعاج. خدمة العملاء متاحة 24/7 على `support@haastores.sa`.

---

## 4. Soft-launch monitoring (T+0 to T+7 days)

### 4.1 Daily standup agenda (15 min)

| Duration | Topic | Owner |
|----------|-------|-------|
| 2 min | Yesterday's metrics (orders, errors, support tickets) | Engineering |
| 3 min | Merchant feedback (any blockers, complaints) | Cohort lead |
| 5 min | Top 3 issues + mitigation plan | Engineering |
| 3 min | Today's planned changes (if any) | Engineering |
| 2 min | Decision needed from founder | You |

### 4.2 Weekly review (T+7, T+14, T+21, T+30)

**Metrics dashboard:**
- Total orders, GMV, average order value
- New merchant signups, churn
- Customer NPS (1-question survey after order delivery)
- Top 3 product categories
- Support tickets per merchant

**Decision gates:**
- T+7: Cohort feedback gathered → continue / pause / adjust
- T+14: NPS ≥30 → expand cohort
- T+21: NPS ≥40 + no Critical issues → prepare for general launch
- T+30: All green → general availability

---

## 5. Soft-launch success criteria

Beta is successful if (by T+30):

- [ ] **≥80%** of cohort merchants active (≥1 product + ≥1 order/week)
- [ ] **NPS ≥40** from customer post-order surveys
- [ ] **Error rate <0.5%** sustained
- [ ] **Zero Critical/High pen-test findings** outstanding
- [ ] **Zero PDPL complaints** from data subjects
- [ ] **Zero regulator actions** (MoCI/SAMA/NCA)
- [ ] **Cohort NPS ≥7/10** ("would you recommend this to a colleague?")

---

## 6. General availability decision (T+30 to T+60)

If soft-launch success criteria are met, plan general availability:

- [ ] **Press release** (wider distribution)
- [ ] **Self-serve onboarding** for new merchants (no manual approval)
- [ ] **Marketing campaign** (paid ads + content)
- [ ] **Customer acquisition** (KSA-targeted ads)
- [ ] **Public marketplace** visible to all (no invitation gate)

---

## 7. References

- `docs/ops/MARKETPLACE_HARDENING_PLAN.md` §8 §8.4
- `docs/ops/INCIDENT_RESPONSE.md` — incident handling playbook
- `docs/ops/TASK_TRACKER.md` TASK-0045 §8.4
- `docs/PRIVACY_POLICY.md §2.4` — marketplace data flows
- `docs/TERMS_OF_SERVICE.md §8.5` — independent sellers
- `docs/SFDA_DISCLAIMER.md` — SFDA disclaimers
- `docs/ops/PEN_TEST_VENDOR_SHORTLIST.md` — pen-test vendor brief
- `docs/ops/TASK_TRACKER.md` TASK-0038 (10 owner action items G1-G10)

---

**Last Updated:** 2026-06-17 (TASK-0045 §8.4 + Session R engineering prep)
**Owner Action Required:** Final go/no-go decision after pen-test + G1-G10 closure
**Engineering Effort:** 3-5 days launch execution + ongoing monitoring

# No Deploy Policy — هاء متاجر

## Deployment is the Final Step

- النشر ليس ضمن التطوير الحالي.
- النشر لا يبدأ قبل اكتمال المتبقي من التشيك ليست الإنتاجية.
- Staging لا يبدأ إلا بعد Deployment Readiness Gate + Owner GO.
- Production لا يبدأ إلا بعد نجاح Staging + Smoke + Security + Load Test.
- أي ملفات نشر أو دومينات أو مفاتيح إنتاج ممنوعة الآن.
- كل التطوير الحالي يبقى على الجهاز المحلي فقط.
- أي طلب مستقبلي للتطوير لا يعني نشرًا تلقائيًا.
- No Deploy Policy = Active حتى إشعار آخر.

---

## القرار

> **هاء متاجر مشروع Local-Only Development حتى إشعار آخر.**

لا يُسمح بأي نشر خارجي حتى يكتمل المنتج محليًا 100%.

---

## الممنوعات

| البند | الحالة |
|-------|:------:|
| Fly.io | ⛔ ممنوع |
| Cloudflare R2 فعلي | ⛔ ممنوع |
| AWS S3 فعلي | ⛔ ممنوع |
| دومينات خارجية | ⛔ ممنوع |
| أسرار حقيقية | ⛔ ممنوع |
| Payment حقيقي | ⛔ ممنوع |
| Shipping حقيقي | ⛔ ممنوع |
| ربط مع هاء | ⛔ ممنوع |
| Production config | ⛔ ممنوع |
| Staging config فعلي | ⛔ ممنوع |
| git push | ⛔ ممنوع |

---

## المسموح

| البند | الحالة |
|-------|:------:|
| التطوير المحلي | ✅ مسموح |
| الاختبار المحلي | ✅ مسموح |
| LocalStorageAdapter | ✅ للتطوير |
| FakePaymentProvider | ✅ للتجارب |
| Manual Shipping | ✅ للتجارب |
| بيانات تجريبية | ✅ seed محلي |
| توثيق خطة النشر | ✅ بدون تنفيذ |

---

## متى نفتح ملف النشر؟

~~بعد اكتمال **LC6 — Local Full Product Gate** بنجاح.~~ ✅ LC6 مكتمل.

**الوضع الحالي:** جميع المراحل العشر مكتملة ✅. Deployment Readiness Gate ⏳ قيد المراجعة.

**القرار:** No Deploy Policy لا يزال مفعّلاً. يرفع بقرار GO صريح من المالك فقط.

الشروط المحدثة (2026-06-07):
1. ✅ LC6 — Local Full Product Gate: PASS
2. ✅ Phase 1 — Production Readiness Foundation: PASS
3. ✅ Phase 2 — Real Payments Foundation & Sandbox: PASS
4. ✅ Phase 3 — Shipping Pro Foundation: PASS
5. ✅ Phase 4 — KYC & Compliance Foundation: PASS
6. ✅ Phase 5 — Admin Dashboard: PASS
7. ✅ Phase 6 — Subscriptions & Billing: PASS
8. ✅ Phase 7 — Notifications: PASS
9. ✅ Phase 8 — Integrations Hub: PASS
10. ✅ Phase 9 — Marketplaces & Migration: PASS
11. ✅ Phase 10 — AI Commerce Agent: PASS
12. ✅ Tests: 696 (668 unit + 28 smoke)
13. ⬜ Deployment Readiness Gate: ⏳ قيد التنفيذ
14. ⬜ قرار GO من المالك: معلق

---

## الملفات المحظورة

لا تُنشئ هذه الملفات حتى يُفتح ملف النشر:

- `fly.toml`
- `Dockerfile` (للنشر)
- `.env.staging`
- `.env.production`
- `nginx.conf` (للنشر)
- أي ملف يحتوي أسرار حقيقية

---

## الاستثناءات

لا توجد استثناءات. أي نشر خارجي يحتاج قرار صريح بفتح ملف النشر.

---

## المراجع

- `docs/LOCAL_COMPLETION_ROADMAP.md` — خطة الإكمال المحلية
- `DEPLOYMENT_READINESS_PLAN.md` — خطة النشر (مؤجلة)

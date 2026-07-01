import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

const app = read('apps/admin-dashboard/src/App.tsx');
const dashboard = read('apps/admin-dashboard/src/pages/Dashboard.tsx');
const emptyState = read('apps/admin-dashboard/src/components/ui/AdminEmptyState.tsx');
const settlementReadiness = read('apps/admin-dashboard/src/pages/SettlementReadiness.tsx');
const storePaymentSettings = read('apps/admin-dashboard/src/pages/StorePaymentSettings.tsx');
const compliance = read('apps/admin-dashboard/src/pages/Compliance.tsx');
const bankAccounts = read('apps/admin-dashboard/src/pages/BankAccounts.tsx');
const kycReview = read('apps/admin-dashboard/src/pages/KycReview.tsx');
const auditLogs = read('apps/admin-dashboard/src/pages/AuditLogs.tsx');
const payments = read('apps/admin-dashboard/src/pages/Payments.tsx');
const financeReports = read('apps/admin-dashboard/src/pages/FinanceReports.tsx');
const settlementBatches = read('apps/admin-dashboard/src/pages/SettlementBatches.tsx');
const operationalWebhooks = read('apps/admin-dashboard/src/pages/OperationalWebhooks.tsx');

describe('admin dashboard SaaS operations UX', () => {
  it('groups sidebar IA by admin journeys instead of a mixed technical list', () => {
    expect(app).toContain("navGroup('التجار والمتاجر'");
    expect(app).toContain("navGroup('الماليات'");
    expect(app).toContain("navGroup('السوق'");
    expect(app).toContain("navGroup('نظام'");
    expect(app).toContain('/compliance|توثيق المتاجر|CheckSquare|tenants.read');
    expect(app).toContain('/settlement-readiness|جاهزية التسوية|CheckSquare|wallet.payout.view_all');
    expect(app).toContain('/store-payment-settings|إعدادات الدفع|CreditCard|stores.read');
  });

  it('turns the home page into a command center with next actions and launch blockers', () => {
    expect(dashboard).toContain('أولويات اليوم');
    expect(dashboard).toContain('صحة التشغيل والإطلاق');
    expect(dashboard).toContain('/bank-accounts');
    expect(dashboard).toContain('/settlement-readiness');
    expect(dashboard).toContain('لا تعرض الصفحة حالة live كحقيقة إلا من مصدر موثوق');
  });

  it('uses smart empty states on decision-heavy admin pages', () => {
    expect(emptyState).toContain('ماذا يعني');
    expect(bankAccounts).toContain('قد يعني ذلك أن التجار لم يضيفوا حساباتهم البنكية بعد');
    expect(kycReview).toContain('قد يعني أن التجار لم يبدؤوا التوثيق');
    expect(auditLogs).toContain('إذا كانت هناك تعديلات حديثة');
    expect(payments).toContain('بوابات الدفع ما زالت في وضع تجربة أو غير مهيأة');
    expect(financeReports).toContain('لا توجد فترة تسوية مغلقة');
    expect(settlementBatches).toContain('لا توجد تسويات جاهزة للتحويل');
    expect(operationalWebhooks).toContain('Webhook health: لا توجد أحداث');
  });

  it('presents settlement readiness as a financial decision dashboard', () => {
    expect(settlementReadiness).toContain('function settlementDecision(readiness: ReadinessData)');
    expect(settlementReadiness).toContain('القرار المالي');
    expect(settlementReadiness).toContain('السحب');
    expect(settlementReadiness).toContain('الموانع');
    expect(settlementReadiness).toContain('المسؤول');
    expect(settlementReadiness).toContain('السحب محظور حتى إغلاق الموانع');
  });

  it('separates payment configured, enabled, mode, and readiness states', () => {
    expect(storePaymentSettings).toContain('function isProviderConfigured(row: RowState)');
    expect(storePaymentSettings).toContain('function paymentDecision(row: RowState)');
    expect(storePaymentSettings).toContain('enabled: safeEnabled');
    expect(storePaymentSettings).toContain('التفعيل: {decision.enabledLabel}');
    expect(storePaymentSettings).toContain('وضع التجربة مناسب للاختبار فقط');
  });

  it('separates risk from incomplete onboarding in merchant verification labels', () => {
    expect(compliance).toContain("not_ready: 'غير جاهز'");
    expect(compliance).toContain("incomplete: 'ناقص بيانات'");
    expect(compliance).toContain("unknown: 'غير مصنفة'");
    expect(compliance).toContain('مخاطر فعلية');
    expect(compliance).not.toContain('MetricCard label="عالية الخطورة"');
  });
});

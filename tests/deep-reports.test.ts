import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const reportsService = readFileSync(new URL('../packages/commerce-core/src/reports.ts', import.meta.url), 'utf-8');
const reportsRoutes = readFileSync(new URL('../apps/api/src/routes/reports.ts', import.meta.url), 'utf-8');
const reportsPage = readFileSync(new URL('../apps/merchant-dashboard/src/pages/Reports.tsx', import.meta.url), 'utf-8');
const merchantApi = readFileSync(new URL('../apps/merchant-dashboard/src/lib/api.ts', import.meta.url), 'utf-8');

describe('Deep reports', () => {
  it('adds backend deep report sections for accounting and operations', () => {
    for (const method of [
      'deepReport',
      'financialBreakdown',
      'orderDetails',
      'productPerformance',
      'settlementReconciliation',
      'customerInsights',
      'refundsAndDisputes',
      'codAndShipping',
    ]) {
      expect(reportsService).toContain(`async ${method}`);
    }
    expect(reportsService).toContain('chargeback');
    expect(reportsService).toContain('paymentProviderTransactions');
    expect(reportsService).toContain('merchantPayable');
  });

  it('exposes deep reports through merchant reports API', () => {
    expect(reportsRoutes).toContain("reportsRouter.get('/deep'");
    expect(reportsRoutes).toContain('new ReportsService().deepReport');
    expect(merchantApi).toContain('export interface DeepReport');
    expect(merchantApi).toContain('/reports/deep');
  });

  it('renders deep report tables and CSV exports in merchant dashboard', () => {
    expect(reportsPage).toContain('التقارير العميقة');
    expect(reportsPage).toContain('تفاصيل الطلبات');
    expect(reportsPage).toContain('أداء المنتجات حسب SKU والتصنيف');
    expect(reportsPage).toContain('التسويات والمطابقة');
    expect(reportsPage).toContain('تحليل العملاء');
    expect(reportsPage).toContain('الاستردادات والنزاعات');
    expect(reportsPage).toContain('exportRecordRows');
    expect(reportsPage).toContain('DeepTable');
  });
});

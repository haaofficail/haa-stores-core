import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const settlementBatches = readFileSync(new URL('../apps/admin-dashboard/src/pages/SettlementBatches.tsx', import.meta.url), 'utf-8');
const settlementBatchDetail = readFileSync(new URL('../apps/admin-dashboard/src/pages/SettlementBatchDetail.tsx', import.meta.url), 'utf-8');
const errorState = readFileSync(new URL('../apps/admin-dashboard/src/components/ui/ErrorState.tsx', import.meta.url), 'utf-8');
const adminApp = readFileSync(new URL('../apps/admin-dashboard/src/App.tsx', import.meta.url), 'utf-8');
const adminApi = readFileSync(new URL('../apps/admin-dashboard/src/lib/api.ts', import.meta.url), 'utf-8');

describe('Admin Settlement Batches UI', () => {
  it('batches page has header and table', () => {
    expect(settlementBatches).toContain('دفعات التسوية');
    expect(settlementBatches).toContain('<table');
    expect(settlementBatches).toContain('الحالة');
  });

  it('batches page has status filters', () => {
    expect(settlementBatches).toContain('filter');
    expect(settlementBatches).toContain('status');
  });

  it('batches page has loading state', () => {
    expect(settlementBatches).toContain('animate-pulse');
    expect(settlementBatches).toContain('loading');
  });

  it('batches page has empty state', () => {
    expect(settlementBatches).toContain('لا توجد دفعات تسوية');
  });

  it('batches page has error state with retry', () => {
    expect(settlementBatches).toContain('ErrorState');
    expect(settlementBatches).toContain('<ErrorState message="فشل تحميل دفعات التسوية" onRetry={load} />');
    expect(errorState).toContain('إعادة المحاولة');
    expect(settlementBatches).toContain('error');
  });

  it('batch detail shows summary section', () => {
    expect(settlementBatchDetail).toContain('إجمالي الرسوم');
    expect(settlementBatchDetail).toContain('صافي الدفعة');
  });

  it('batch detail shows stores table', () => {
    expect(settlementBatchDetail).toContain('storeId');
    expect(settlementBatchDetail).toContain('عدد الطلبات');
    expect(settlementBatchDetail).toContain('صافي المستحق');
  });

  it('batch detail shows orders table', () => {
    expect(settlementBatchDetail).toContain('رقم الطلب');
    expect(settlementBatchDetail).toContain('إجمالي الطلب');
    expect(settlementBatchDetail).toContain('عمولة المنصة');
  });

  it('batch detail has action buttons', () => {
    expect(settlementBatchDetail).toContain('بدء المراجعة');
    expect(settlementBatchDetail).toContain('اعتماد');
    expect(settlementBatchDetail).toContain('رفض');
  });

  it('batch detail has transfer proof form', () => {
    expect(settlementBatchDetail).toContain('bankReference');
    expect(settlementBatchDetail).toContain('bankName');
    expect(settlementBatchDetail).toContain('transferredAt');
    expect(settlementBatchDetail).toContain('beneficiaryName');
    expect(settlementBatchDetail).toContain('beneficiaryIbanMasked');
  });

  it('transfer proof form does not accept full IBAN', () => {
    expect(settlementBatchDetail).toContain('أدخل آخر 4 أرقام من IBAN فقط');
    expect(settlementBatchDetail).toContain('maxLength={4}');
  });

  it('batch detail shows timeline section', () => {
    expect(settlementBatchDetail).toContain('تم إنشاء الدفعة');
    expect(settlementBatchDetail).toContain('تمت الموافقة');
  });

  it('batch detail does NOT expose full IBAN', () => {
    expect(settlementBatchDetail).not.toContain('fullIban');
    expect(settlementBatchDetail).not.toContain('full_iban');
  });

  it('admin dashboard has route for settlement batches list', () => {
    expect(adminApp).toContain('SettlementBatches');
    expect(adminApp).toContain('/payments/settlements');
  });

  it('admin dashboard has route for batch detail', () => {
    expect(adminApp).toContain('SettlementBatchDetail');
    expect(adminApp).toContain('/payments/settlements/:batchId');
  });

  it('admin API has payout action methods', () => {
    expect(adminApi).toContain('reviewPayout');
    expect(adminApi).toContain('approvePayout');
    expect(adminApi).toContain('rejectPayout');
    expect(adminApi).toContain('markTransferred');
    expect(adminApi).toContain('uploadProof');
    expect(adminApi).toContain('verifyTransfer');
    expect(adminApi).toContain('cancelPayout');
    expect(adminApi).toContain('reversePayout');
  });

  it('batch detail has loading state', () => {
    expect(settlementBatchDetail).toContain('loading');
    expect(settlementBatchDetail).toContain('animate-pulse');
  });

  it('batch detail has error state', () => {
    expect(settlementBatchDetail).toContain('فشل تحميل');
  });
});

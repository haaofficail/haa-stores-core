import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const merchantOverview = readFileSync(new URL('../apps/merchant-dashboard/src/pages/SettlementOverview.tsx', import.meta.url), 'utf-8');
const merchantApi = readFileSync(new URL('../apps/merchant-dashboard/src/lib/api.ts', import.meta.url), 'utf-8');
const adminList = readFileSync(new URL('../apps/admin-dashboard/src/pages/SettlementBatches.tsx', import.meta.url), 'utf-8');
const adminDetail = readFileSync(new URL('../apps/admin-dashboard/src/pages/SettlementBatchDetail.tsx', import.meta.url), 'utf-8');
const adminApi = readFileSync(new URL('../apps/admin-dashboard/src/lib/api.ts', import.meta.url), 'utf-8');

describe('Manual settlement dashboard UX', () => {
  it('merchant dashboard can request manual payout and shows risk blockers', () => {
    expect(merchantOverview).toContain('طلب تسوية');
    expect(merchantOverview).toContain('handleRequestPayout');
    expect(merchantOverview).toContain('requestModalOpen');
    expect(merchantOverview).toContain('walletApi.requestPayout');
    expect(merchantOverview).toContain('طلبات التسوية اليدوية');
    expect(merchantOverview).toContain('storeActive');
    expect(merchantOverview).toContain('refundRiskClear');
    expect(merchantOverview).toContain('disputeRiskClear');
    expect(merchantApi).toContain('requestPayout');
  });

  it('admin dashboard lists manual payouts with status filtering and detail links', () => {
    expect(adminList).toContain('التسويات اليدوية');
    expect(adminList).toContain('payoutStatusFilter');
    expect(adminList).toContain('adminApi.listPayouts');
    expect(adminList).toContain('?manual=1');
    expect(adminApi).toContain('listPayouts');
    expect(adminApi).toContain('getAdminPermissions');
    expect(adminApi).toContain('hasAdminPermission');
  });

  it('admin detail supports manual payout mode, action buttons, audit timeline, and transfer proof cards', () => {
    expect(adminDetail).toContain("searchParams.get('manual') === '1'");
    expect(adminDetail).toContain('adminApi.getPayout');
    expect(adminDetail).toContain('hasAdminPermission');
    expect(adminDetail).toContain('إجراءات الدفعة اليدوية');
    expect(adminDetail).toContain('سجل المراجعة');
    expect(adminDetail).toContain('إثبات التحويل');
    expect(adminDetail).toContain('IBAN masked');
    expect(adminDetail).toContain('handleProofFileUpload');
    expect(adminApi).toContain('uploadFile');
    expect(adminDetail).toContain('proofFileKey');
    expect(adminDetail).toContain('cancelModalOpen');
    expect(adminDetail).toContain('reverseModalOpen');
    expect(adminDetail).toContain('renderTimeline');
  });

  it('settlement screens do not use blocking browser prompts for financial actions', () => {
    expect(merchantOverview).not.toContain('window.prompt');
    expect(merchantOverview).not.toContain('prompt(');
    expect(adminDetail).not.toContain('window.prompt');
    expect(adminDetail).not.toContain('prompt(');
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');

const storePaymentSettings = read('apps/admin-dashboard/src/pages/StorePaymentSettings.tsx');
const settlementBatchDetail = read('apps/admin-dashboard/src/pages/SettlementBatchDetail.tsx');

describe('admin React Query cache review guards', () => {
  it('updates the saved payment-provider cache without reseeding sibling unsaved rows', () => {
    expect(storePaymentSettings).toContain('useQueryClient');
    expect(storePaymentSettings).toContain('replaceProviderSettingInCache');
    expect(storePaymentSettings).toContain('queryClient.setQueryData([...queryKeys.storePaymentSettings, storeId]');
    expect(storePaymentSettings).toContain('seededStoreIdRef.current === selectedId');
    expect(storePaymentSettings).toContain('unsaved edits in other rows');
    expect(storePaymentSettings).not.toContain('queryClient.invalidateQueries({ queryKey: settingsQueryKey');
  });

  it('invalidates settlement-batch lists after manual payout actions', () => {
    expect(settlementBatchDetail).toContain('queryClient.invalidateQueries({ queryKey: queryKeys.settlementBatches })');
    expect(settlementBatchDetail).toContain("queryClient.invalidateQueries({ queryKey: ['admin', 'settlementBatchPayout', payoutId] })");
  });
});

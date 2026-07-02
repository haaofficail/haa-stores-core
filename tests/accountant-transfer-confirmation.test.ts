// P1-7 audit fix — markTransferPending/markTransferred (the accountant's
// primary financial action) fired directly on click with no confirmation,
// while every other dangerous payout action in SettlementBatchDetail.tsx
// already goes through a modal-confirm step. This locks the gate in.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const PAGE = readFileSync(
  resolve(__dirname, '../apps/admin-dashboard/src/pages/AccountantSettlementDetail.tsx'),
  'utf-8',
);

describe('AccountantSettlementDetail — transfer action confirmation', () => {
  it('startTransfer opens a confirmation modal instead of mutating directly', () => {
    const startTransferBody = PAGE.slice(
      PAGE.indexOf('const startTransfer = useCallback'),
      PAGE.indexOf('const confirmTransfer = useCallback'),
    );
    expect(startTransferBody).toMatch(/setConfirmTransferAction\(/);
    expect(startTransferBody).not.toMatch(/transferMutation\.mutate\(/);
  });

  it('the mutation only fires from confirmTransfer, after the modal confirms', () => {
    const confirmTransferBody = PAGE.slice(
      PAGE.indexOf('const confirmTransfer = useCallback'),
      PAGE.indexOf('const confirmTransfer = useCallback') + 400,
    );
    expect(confirmTransferBody).toMatch(/transferMutation\.mutate\(status\)/);
  });

  it('renders a confirmation dialog with distinct copy for each transfer stage', () => {
    expect(PAGE).toMatch(/confirmTransferAction[\s\S]{0,50}\(/);
    expect(PAGE).toMatch(/تأكيد بدء التحويل البنكي/);
    expect(PAGE).toMatch(/تأكيد تسجيل التحويل البنكي/);
  });

  it('surfaces transfer errors persistently, not just as a toast', () => {
    expect(PAGE).toMatch(/setTransferError\(/);
    expect(PAGE).toMatch(/\{transferError\s*&&/);
  });
});

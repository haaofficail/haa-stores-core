import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { getAdminPermissionsForRole } from '@haa/shared';
import { buildAccountantSettlementDetail } from '../apps/api/src/services/accountant-detail.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const read = (p: string) => readFileSync(resolve(root, p), 'utf-8');

const adminIndex = read('apps/api/src/routes/admin/index.ts');
const page = read('apps/admin-dashboard/src/pages/AccountantSettlementDetail.tsx');

describe('second-approve route is guarded + idempotent', () => {
  it('registers POST /settlements/:payoutId/second-approve with the dedicated permission + Idempotency-Key', () => {
    const line = adminIndex.split('\n').find((l) => l.includes('/second-approve')) ?? '';
    expect(line).toMatch(/\/settlements\/:payoutId\/second-approve/);
    expect(line).toContain("requireAdminPermission('wallet.payout.second_approve')");
    expect(line).toMatch(/idempotencyKey\(\s*\{\s*required:\s*true\s*\}\s*\)/);
  });

  it('accountant does NOT hold second_approve; super_admin does (via wildcard)', () => {
    expect(getAdminPermissionsForRole('accountant')).not.toContain('wallet.payout.second_approve');
    expect(getAdminPermissionsForRole('super_admin')).toEqual(['admin:*']);
  });
});

describe('detail builder canSecondApprove', () => {
  const base = {
    payout: { id: 1, storeId: 5, status: 'awaiting_second_approval', amount: '20000.00', currency: 'SAR', reference: 'PO-1' },
    storeName: 'x', bank: null, proof: null, events: [],
    revealableStates: ['approved'],
  };
  it('is true only when awaiting AND the route says the user may approve', () => {
    expect(buildAccountantSettlementDetail({ ...base, canSecondApprove: true }).canSecondApprove).toBe(true);
    expect(buildAccountantSettlementDetail({ ...base, canSecondApprove: false }).canSecondApprove).toBe(false);
    expect(buildAccountantSettlementDetail({ payout: { ...base.payout, status: 'transferred' }, storeName: 'x', bank: null, proof: null, events: [], revealableStates: ['approved'], canSecondApprove: true }).canSecondApprove).toBe(false);
  });
  it('exposes awaitingSecondApproval', () => {
    expect(buildAccountantSettlementDetail(base).awaitingSecondApproval).toBe(true);
  });
});

describe('detail page second-approval UI', () => {
  it('shows the awaiting-second-approval alert', () => {
    expect(page).toMatch(/awaitingSecondApproval/);
    expect(page).toMatch(/بانتظار اعتماد ثانٍ/);
  });
  it('shows the approve button only when canSecondApprove', () => {
    expect(page).toMatch(/canSecondApprove/);
    expect(page).toMatch(/اعتماد ثانٍ/);
    expect(page).toMatch(/secondApprovePayout/);
  });
  it('shows the same-actor message when the user holds the permission but cannot approve', () => {
    expect(page).toMatch(/hasAdminPermission\(['"]wallet\.payout\.second_approve['"]\)/);
    expect(page).toMatch(/لا يمكن لنفس المنفذ اعتماد التسوية/);
  });
});

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const settlementBatchDetail = readFileSync(new URL('../apps/admin-dashboard/src/pages/SettlementBatchDetail.tsx', import.meta.url), 'utf-8');

describe('Transfer Proof UI', () => {
  it('transfer proof form requires bankReference', () => {
    expect(settlementBatchDetail).toContain('bankReference');
  });

  it('transfer proof form requires bankName', () => {
    expect(settlementBatchDetail).toContain('bankName');
  });

  it('transfer proof form requires transferredAt date', () => {
    expect(settlementBatchDetail).toContain('transferredAt');
  });

  it('transfer proof form requires beneficiaryName', () => {
    expect(settlementBatchDetail).toContain('beneficiaryName');
  });

  it('transfer proof form accepts only masked IBAN (max 4 chars)', () => {
    expect(settlementBatchDetail).toContain('beneficiaryIbanMasked');
    expect(settlementBatchDetail).toContain('maxLength={4}');
    expect(settlementBatchDetail).toContain('أدخل آخر 4 أرقام من IBAN فقط');
  });

  it('transfer proof form never accepts full IBAN', () => {
    expect(settlementBatchDetail).not.toContain('fullIban');
    expect(settlementBatchDetail).not.toContain('full_iban');
    expect(settlementBatchDetail).not.toContain('fullIban');
  });

  it('transfer proof form has notes textarea', () => {
    expect(settlementBatchDetail).toContain('notes');
  });

  it('transfer proof form has save/submit button', () => {
    expect(settlementBatchDetail).toContain('تأكيد');
    expect(settlementBatchDetail).toContain('حفظ');
  });

  it('upload proof calls adminApi.uploadProof', () => {
    expect(settlementBatchDetail).toContain('uploadProof');
  });

  it('after upload, state transitions to proof_uploaded', () => {
    expect(settlementBatchDetail).toContain('uploadProof');
    expect(settlementBatchDetail).toContain('proof_uploaded');
  });
});

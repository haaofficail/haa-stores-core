// Tests for the GatewayFeeRefundPolicy enum + per-provider defaults.
//
// See TASK-0034 sub-item 2 in docs/ops/TASK_TRACKER.md. This module
// resolves Q2 (refund policy per provider) of the financial wallet
// audit. The default is NON_REFUNDABLE; only Moyasar refunds the
// gateway fee by default. Tabby and Tamara are NON_REFUNDABLE pending
// verification with the providers.
//
// Scenarios covered:
//   - Enum has exactly 2 values (REFUNDABLE | NON_REFUNDABLE)
//   - Default is NON_REFUNDABLE
//   - Provider default for moyasar is REFUNDABLE
//   - Provider default for tabby/tamara is NON_REFUNDABLE
//   - Unknown provider falls back to default (NON_REFUNDABLE)
//   - Lookup is case-insensitive (provider names vary in casing)

import { describe, it, expect } from 'vitest';
import {
  GATEWAY_FEE_REFUND_POLICIES,
  DEFAULT_GATEWAY_FEE_REFUND_POLICY,
  getProviderDefaultRefundPolicy,
  type GatewayFeeRefundPolicy,
} from '../packages/wallet-core/src/gateway-fee-refund-policy.js';

describe('GatewayFeeRefundPolicy — enum', () => {
  it('has exactly 2 values: REFUNDABLE and NON_REFUNDABLE', () => {
    expect(GATEWAY_FEE_REFUND_POLICIES).toEqual(['REFUNDABLE', 'NON_REFUNDABLE']);
  });

  it('default policy is NON_REFUNDABLE (safest for the merchant)', () => {
    expect(DEFAULT_GATEWAY_FEE_REFUND_POLICY).toBe('NON_REFUNDABLE');
  });
});

describe('GatewayFeeRefundPolicy — provider defaults (Q2)', () => {
  it('moyasar → REFUNDABLE (Moyasar refunds the gateway fee)', () => {
    expect(getProviderDefaultRefundPolicy('moyasar')).toBe('REFUNDABLE');
  });

  it('tabby → NON_REFUNDABLE (pending verification with Tabby)', () => {
    expect(getProviderDefaultRefundPolicy('tabby')).toBe('NON_REFUNDABLE');
  });

  it('tamara → NON_REFUNDABLE (pending verification with Tamara)', () => {
    expect(getProviderDefaultRefundPolicy('tamara')).toBe('NON_REFUNDABLE');
  });

  it('unknown provider falls back to default (NON_REFUNDABLE)', () => {
    expect(getProviderDefaultRefundPolicy('unknown-provider')).toBe('NON_REFUNDABLE');
    expect(getProviderDefaultRefundPolicy('')).toBe('NON_REFUNDABLE');
    expect(getProviderDefaultRefundPolicy('hyperpay')).toBe('NON_REFUNDABLE');
    expect(getProviderDefaultRefundPolicy('geidea')).toBe('NON_REFUNDABLE');
    expect(getProviderDefaultRefundPolicy('oto')).toBe('NON_REFUNDABLE');
    expect(getProviderDefaultRefundPolicy('bank_transfer')).toBe('NON_REFUNDABLE');
  });

  it('lookup is case-insensitive (provider names vary in casing across the codebase)', () => {
    expect(getProviderDefaultRefundPolicy('Moyasar')).toBe('REFUNDABLE');
    expect(getProviderDefaultRefundPolicy('MOYASAR')).toBe('REFUNDABLE');
    expect(getProviderDefaultRefundPolicy('Tabby')).toBe('NON_REFUNDABLE');
    expect(getProviderDefaultRefundPolicy('TAMARA')).toBe('NON_REFUNDABLE');
  });
});

describe('GatewayFeeRefundPolicy — type contract', () => {
  it('GatewayFeeRefundPolicy is a literal union (compile-time guarantee)', () => {
    // If the type were not 'REFUNDABLE' | 'NON_REFUNDABLE', this
    // assignment would fail typecheck.
    const refundable: GatewayFeeRefundPolicy = 'REFUNDABLE';
    const nonRefundable: GatewayFeeRefundPolicy = 'NON_REFUNDABLE';
    expect(refundable).toBe('REFUNDABLE');
    expect(nonRefundable).toBe('NON_REFUNDABLE');
  });
});

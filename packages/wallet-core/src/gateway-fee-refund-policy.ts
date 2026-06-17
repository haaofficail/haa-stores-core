// GatewayFeeRefundPolicy — per-provider refund policy for the gateway
// fee (the cut the payment processor takes, e.g. Moyasar 2.5%).
//
// See TASK-0034 sub-item 2 in docs/ops/TASK_TRACKER.md. This module
// resolves Q2 (refund policy per provider) of the financial wallet
// audit (TASK-0031). When a merchant issues a refund, the question
// is: does the gateway return the gateway fee, or is it kept by the
// gateway?
//
// The default answer is **NON_REFUNDABLE** — the safest for the
// merchant, because assuming REFUNDABLE when it's actually kept
// would create a wallet shortfall. Only Moyasar refunds the gateway
// fee by default. Tabby and Tamara are NON_REFUNDABLE pending
// verification with the providers (the Q2 owner decision recorded
// 2026-06-16).
//
// A future iteration (not in TASK-0034 scope) can add a
// `storeGatewayFeePolicy` table for per-merchant overrides. For now
// the policy is provider-level only.
//
// Pure module (no I/O). Mirrors the `platform-fees.ts` and
// `cod-fees.ts` shape so the same test patterns apply.

export type GatewayFeeRefundPolicy = 'REFUNDABLE' | 'NON_REFUNDABLE';

export const GATEWAY_FEE_REFUND_POLICIES: readonly GatewayFeeRefundPolicy[] = [
  'REFUNDABLE',
  'NON_REFUNDABLE',
] as const;

export const DEFAULT_GATEWAY_FEE_REFUND_POLICY: GatewayFeeRefundPolicy = 'NON_REFUNDABLE';

/**
 * Per-provider default refund policy. The values below reflect the
 * Q2 owner decision (2026-06-16):
 *   - Moyasar: REFUNDABLE (Moyasar refunds the gateway fee)
 *   - Tabby:   NON_REFUNDABLE (pending verification)
 *   - Tamara:  NON_REFUNDABLE (pending verification)
 *   - All other providers (hyperpay, geidea, oto, bank_transfer,
 *     fake, etc.): NON_REFUNDABLE (default — safest)
 *
 * Lookup is case-insensitive because provider names appear with
 * different casing across the codebase (Moyasar, moyasar, MOYASAR).
 */
const PROVIDER_DEFAULTS: Readonly<Record<string, GatewayFeeRefundPolicy>> = {
  moyasar: 'REFUNDABLE',
  tabby: 'NON_REFUNDABLE',
  tamara: 'NON_REFUNDABLE',
};

export function getProviderDefaultRefundPolicy(provider: string): GatewayFeeRefundPolicy {
  if (!provider) return DEFAULT_GATEWAY_FEE_REFUND_POLICY;
  const normalized = provider.trim().toLowerCase();
  return PROVIDER_DEFAULTS[normalized] ?? DEFAULT_GATEWAY_FEE_REFUND_POLICY;
}

/**
 * Validate a candidate refund policy string. Returns the policy
 * if it matches one of the enum values, otherwise returns the
 * default. Used by the admin override endpoints (future).
 */
export function normalizeGatewayFeeRefundPolicy(
  input: string | null | undefined,
): GatewayFeeRefundPolicy {
  if (input == null) return DEFAULT_GATEWAY_FEE_REFUND_POLICY;
  const upper = String(input).trim().toUpperCase();
  return (GATEWAY_FEE_REFUND_POLICIES as readonly string[]).includes(upper)
    ? (upper as GatewayFeeRefundPolicy)
    : DEFAULT_GATEWAY_FEE_REFUND_POLICY;
}

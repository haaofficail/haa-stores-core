// Configurable COD (Cash on Delivery) Fee Policy.
//
// Each store owns a `storeBillingSettings` row that defines BOTH the
// platform-fee policy (see `./platform-fees.ts`) and the COD-fee policy
// (this module). The two are intentionally decoupled — a merchant may
// want a 1% platform fee on card payments but a 3% COD fee, because COD
// carries different cost (cash handling, manual reconciliation, return
// risk) than card payments.
//
// The policy is read at order creation time (specifically when COD is
// collected via `collectCOD` in `packages/commerce-core/src/orders.ts`)
// and snapshotted into the `cod_fee` wallet entry. Changing a store's
// COD policy never retroactively re-prices historical COD orders —
// their wallet entries are immutable.
//
// This module is pure (no I/O). It owns the calculation and the policy
// shape, so it can be unit-tested without a database. See
// `tests/cod-fees.test.ts`.

export type CodFeeMode =
  | 'none'
  | 'percentage'
  | 'fixed'
  | 'percentage_plus_fixed';

export const COD_FEE_MODES: readonly CodFeeMode[] = [
  'none',
  'percentage',
  'fixed',
  'percentage_plus_fixed',
] as const;

export type CodFeePolicy = {
  mode: CodFeeMode;
  pct: number | null;
  fixed: number | null;
  enabled: boolean;
};

/**
 * Default policy preserves the legacy behavior (2% COD fee on all
 * orders, no fixed component) so existing merchants see no change at
 * the moment this column is added.
 */
export const DEFAULT_COD_FEE_POLICY: CodFeePolicy = {
  mode: 'percentage',
  pct: 0.02,
  fixed: 0,
  enabled: true,
};

/**
 * Normalize a raw database row (or partial input) into a strict
 * `CodFeePolicy`. Treats missing/zero/invalid values sensibly.
 *
 * **Distinction from `platform-fees.ts`:** when a field is OMITTED
 * entirely (key not present in the input), we fall back to the legacy
 * 2% default — this preserves the existing merchant behavior at the
 * moment the column is introduced. When a field is EXPLICITLY null,
 * we keep it as null (the merchant wants no value).
 *
 * The input type is intentionally permissive: callers pass the full
 * `storeBillingSettings` row (which includes both platform-fee and
 * COD-fee columns). We extract only the COD-fee fields we need.
 */
export function normalizeCodFeePolicy(input: {
  codFeeMode?: string | null;
  codFeePct?: string | number | null;
  codFeeFixed?: string | number | null;
  isCodFeeEnabled?: boolean | null;
  // Allow extra fields (e.g. the full DB row that also has platform-fee
  // fields) without TypeScript "no properties in common" errors.
  [key: string]: unknown;
}): CodFeePolicy {
  const rawMode = (input.codFeeMode ?? 'percentage') as CodFeeMode;
  const mode: CodFeeMode = COD_FEE_MODES.includes(rawMode) ? rawMode : 'percentage';

  const pctProvided = 'codFeePct' in input;
  const fixedProvided = 'codFeeFixed' in input;

  const pctNum = !pctProvided
    ? DEFAULT_COD_FEE_POLICY.pct
    : input.codFeePct == null
      ? null
      : Number(input.codFeePct);
  const fixedNum = !fixedProvided
    ? DEFAULT_COD_FEE_POLICY.fixed
    : input.codFeeFixed == null
      ? null
      : Number(input.codFeeFixed);

  return {
    mode,
    pct: pctNum != null && Number.isFinite(pctNum) ? pctNum : null,
    fixed: fixedNum != null && Number.isFinite(fixedNum) ? fixedNum : null,
    enabled: input.isCodFeeEnabled !== false,
  };
}

/**
 * Calculate the COD fee for an order total, given a policy.
 *
 * Rounds to 2 decimal places (cents) to match currency display and ledger
 * storage. Returns 0 if the policy is disabled or mode is 'none'.
 *
 * Negative or non-finite pct/fixed values are clamped to 0 (defensive —
 * the DB CHECK constraints on `store_billing_settings` should already
 * prevent negatives, but this is the last line of defense).
 */
export function calcCodFee(
  orderTotal: number,
  policy: CodFeePolicy,
): number {
  if (!policy.enabled) return 0;
  if (!Number.isFinite(orderTotal) || orderTotal <= 0) return 0;
  if (policy.mode === 'none') return 0;

  const safePct = policy.pct != null && policy.pct > 0 ? policy.pct : 0;
  const safeFixed = policy.fixed != null && policy.fixed > 0 ? policy.fixed : 0;

  const pctFee =
    policy.mode === 'percentage' || policy.mode === 'percentage_plus_fixed'
      ? orderTotal * safePct
      : 0;

  const fixedFee =
    policy.mode === 'fixed' || policy.mode === 'percentage_plus_fixed'
      ? safeFixed
      : 0;

  return Math.round((pctFee + fixedFee) * 100) / 100;
}

/**
 * Human-readable label for the policy. Used by the merchant wallet UI
 * (read-only) and the admin "Store Billing Settings" page.
 *
 * Example outputs:
 *   "2%"
 *   "1.50 ر.س"
 *   "2% + 1.00 ر.س"
 *   "معفى"
 *   "معطّلة"
 */
export function describeCodFeePolicy(policy: CodFeePolicy): string {
  if (!policy.enabled) return 'معطّلة';
  switch (policy.mode) {
    case 'none':
      return 'معفى';
    case 'percentage':
      return `${formatPct(policy.pct ?? 0)}`;
    case 'fixed':
      return `${formatFixed(policy.fixed ?? 0)}`;
    case 'percentage_plus_fixed':
      return `${formatPct(policy.pct ?? 0)} + ${formatFixed(policy.fixed ?? 0)}`;
    default:
      return '—';
  }
}

function formatPct(pct: number): string {
  // Strip trailing zeros so 2% stays "2%", not "2.0%". Use a clean numeric
  // format: e.g. 0.005 → 0.5%, 0.025 → 2.5%, 0.2 → 20%.
  const v = pct * 100;
  let s: string;
  if (v >= 10) s = v.toFixed(0);
  else if (v >= 1) s = v.toFixed(1);
  else s = v.toFixed(2);
  // Strip trailing zeros after the decimal point, and a trailing dot.
  if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
  return `${s}%`;
}

function formatFixed(amount: number): string {
  return `${amount.toFixed(2)} ر.س`;
}

/**
 * Maximum allowed COD-fee percentage (50%).
 *
 * Hard cap. Mirrored at three layers:
 *   1. This constant is the source of truth in code.
 *   2. Zod schema in `apps/api/src/routes/admin/billing-settings.ts`
 *      rejects pct > MAX_COD_FEE_PCT.
 *   3. PostgreSQL CHECK constraint in migration 0053
 *      `store_billing_settings_cod_pct_cap` enforces pct <= 0.5 at the
 *      DB level as a last line of defense.
 *
 * Rationale: protects merchants from an admin error that would zero
 * out their COD wallet. 50% is generous enough for legitimate cash-
 * on-delivery business models and tight enough to prevent accidental
 * catastrophic billing.
 */
export const MAX_COD_FEE_PCT = 0.5;

/**
 * Validate a candidate policy for the admin PATCH endpoint.
 * Returns either `{ ok: true, policy }` (normalized) or
 * `{ ok: false, error }` (Arabic message).
 */
export function validateCodFeePolicyInput(input: {
  codFeeMode?: string;
  codFeePct?: number | string | null;
  codFeeFixed?: number | string | null;
  isCodFeeEnabled?: boolean | null;
}): { ok: true; policy: CodFeePolicy } | { ok: false; error: string } {
  const mode = input.codFeeMode ?? 'percentage';
  if (!COD_FEE_MODES.includes(mode as CodFeeMode)) {
    return { ok: false, error: `وضع رسوم الدفع عند الاستلام غير صالح: ${mode}` };
  }
  const pctNum = input.codFeePct == null ? null : Number(input.codFeePct);
  const fixedNum = input.codFeeFixed == null ? null : Number(input.codFeeFixed);

  if (pctNum != null && (!Number.isFinite(pctNum) || pctNum < 0)) {
    return { ok: false, error: 'نسبة رسوم الدفع عند الاستلام لا يمكن أن تكون سالبة' };
  }
  // Hard cap: defense-in-depth with DB CHECK constraint.
  if (pctNum != null && pctNum > MAX_COD_FEE_PCT) {
    return {
      ok: false,
      error: `نسبة رسوم الدفع عند الاستلام تتجاوز الحد الأقصى (${MAX_COD_FEE_PCT * 100}%)`,
    };
  }
  if (fixedNum != null && (!Number.isFinite(fixedNum) || fixedNum < 0)) {
    return { ok: false, error: 'الرسم الثابت للدفع عند الاستلام لا يمكن أن يكون سالبًا' };
  }

  if (mode === 'percentage' && (pctNum == null || pctNum === 0)) {
    return { ok: false, error: 'وضع النسبة يتطلب تحديد codFeePct أكبر من صفر' };
  }
  if (mode === 'fixed' && (fixedNum == null || fixedNum === 0)) {
    return { ok: false, error: 'وضع الرسم الثابت يتطلب تحديد codFeeFixed أكبر من صفر' };
  }
  if (mode === 'percentage_plus_fixed') {
    if ((pctNum == null || pctNum === 0) && (fixedNum == null || fixedNum === 0)) {
      return { ok: false, error: 'وضع النسبة + الرسم الثابت يتطلب تحديد قيمة واحدة على الأقل' };
    }
  }

  return {
    ok: true,
    policy: normalizeCodFeePolicy({
      codFeeMode: mode,
      codFeePct: pctNum,
      codFeeFixed: fixedNum,
      isCodFeeEnabled: input.isCodFeeEnabled !== false,
    }),
  };
}

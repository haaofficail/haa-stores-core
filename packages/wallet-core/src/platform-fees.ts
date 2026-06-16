// Configurable Platform Fee Policy.
//
// Each store owns exactly one `storeBillingSettings` row that defines the
// platform-fee policy applied at order creation time. The policy is then
// snapshotted into the `platform_fee` wallet entry (feeRatePct, feeFixed,
// feeSource). Changing a store's policy never retroactively re-prices
// historical orders — their fee entries are immutable.
//
// This module is pure (no I/O). It owns the calculation and the policy
// shape, so it can be unit-tested without a database.

export type PlatformFeeMode =
  | 'none'
  | 'percentage'
  | 'fixed'
  | 'percentage_plus_fixed';

export const PLATFORM_FEE_MODES: readonly PlatformFeeMode[] = [
  'none',
  'percentage',
  'fixed',
  'percentage_plus_fixed',
] as const;

export type PlatformFeePolicy = {
  mode: PlatformFeeMode;
  pct: number | null;
  fixed: number | null;
  enabled: boolean;
};

export const DEFAULT_PLATFORM_FEE_POLICY: PlatformFeePolicy = {
  mode: 'percentage',
  pct: 0.02,
  fixed: 0,
  enabled: true,
};

/**
 * Normalize a raw database row (or partial input) into a strict
 * `PlatformFeePolicy`. Treats missing/zero/invalid values sensibly.
 */
export function normalizePlatformFeePolicy(input: {
  platformFeeMode?: string | null;
  platformFeePct?: string | number | null;
  platformFeeFixed?: string | number | null;
  isPlatformFeeEnabled?: boolean | null;
}): PlatformFeePolicy {
  const rawMode = (input.platformFeeMode ?? 'percentage') as PlatformFeeMode;
  const mode: PlatformFeeMode = PLATFORM_FEE_MODES.includes(rawMode) ? rawMode : 'percentage';
  const pctNum = input.platformFeePct == null ? null : Number(input.platformFeePct);
  const fixedNum = input.platformFeeFixed == null ? null : Number(input.platformFeeFixed);
  return {
    mode,
    pct: pctNum != null && Number.isFinite(pctNum) ? pctNum : null,
    fixed: fixedNum != null && Number.isFinite(fixedNum) ? fixedNum : null,
    enabled: input.isPlatformFeeEnabled !== false,
  };
}

/**
 * Calculate the platform fee for an order total, given a policy.
 *
 * Rounds to 2 decimal places (cents) to match currency display and ledger
 * storage. Returns 0 if the policy is disabled or mode is 'none'.
 *
 * Negative or non-finite pct/fixed values are clamped to 0 (defensive — the
 * DB CHECK constraints on `store_billing_settings` should already prevent
 * negatives, but this is the last line of defense).
 */
export function calcPlatformFee(
  orderTotal: number,
  policy: PlatformFeePolicy,
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
 */
export function describePlatformFeePolicy(policy: PlatformFeePolicy): string {
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
 * Maximum allowed platform-fee percentage (50%).
 *
 * Hard cap. Mirrored at three layers:
 *   1. This constant is the source of truth in code.
 *   2. Zod schema in `apps/api/src/routes/admin/billing-settings.ts`
 *      rejects pct > MAX_PLATFORM_FEE_PCT.
 *   3. PostgreSQL CHECK constraint in migration 0052
 *      `store_billing_settings_pct_cap` enforces pct <= 0.5 at the DB
 *      level as a last line of defense.
 *
 * Rationale: protects merchants from an admin error that would zero
 * out their wallet. 50% is generous enough for legitimate business
 * models (commission, fixed fees, hybrid) and tight enough to prevent
 * accidental catastrophic billing.
 */
export const MAX_PLATFORM_FEE_PCT = 0.5;

/**
 * Validate a candidate policy for the admin PATCH endpoint.
 * Returns either `{ ok: true, policy }` (normalized) or
 * `{ ok: false, error }` (Arabic message).
 */
export function validatePlatformFeePolicyInput(input: {
  platformFeeMode?: string;
  platformFeePct?: number | string | null;
  platformFeeFixed?: number | string | null;
  isPlatformFeeEnabled?: boolean | null;
}): { ok: true; policy: PlatformFeePolicy } | { ok: false; error: string } {
  const mode = input.platformFeeMode ?? 'percentage';
  if (!PLATFORM_FEE_MODES.includes(mode as PlatformFeeMode)) {
    return { ok: false, error: `وضع رسوم المنصة غير صالح: ${mode}` };
  }
  const pctNum = input.platformFeePct == null ? null : Number(input.platformFeePct);
  const fixedNum = input.platformFeeFixed == null ? null : Number(input.platformFeeFixed);

  if (pctNum != null && (!Number.isFinite(pctNum) || pctNum < 0)) {
    return { ok: false, error: 'نسبة رسوم المنصة لا يمكن أن تكون سالبة' };
  }
  // Hard cap: defense-in-depth with DB CHECK constraint.
  if (pctNum != null && pctNum > MAX_PLATFORM_FEE_PCT) {
    return {
      ok: false,
      error: `نسبة رسوم المنصة تتجاوز الحد الأقصى (${MAX_PLATFORM_FEE_PCT * 100}%)`,
    };
  }
  if (fixedNum != null && (!Number.isFinite(fixedNum) || fixedNum < 0)) {
    return { ok: false, error: 'الرسم الثابت لا يمكن أن يكون سالبًا' };
  }

  if (mode === 'percentage' && (pctNum == null || pctNum === 0)) {
    return { ok: false, error: 'وضع النسبة يتطلب تحديد platformFeePct أكبر من صفر' };
  }
  if (mode === 'fixed' && (fixedNum == null || fixedNum === 0)) {
    return { ok: false, error: 'وضع الرسم الثابت يتطلب تحديد platformFeeFixed أكبر من صفر' };
  }
  if (mode === 'percentage_plus_fixed') {
    if ((pctNum == null || pctNum === 0) && (fixedNum == null || fixedNum === 0)) {
      return { ok: false, error: 'وضع النسبة + الرسم الثابت يتطلب تحديد قيمة واحدة على الأقل' };
    }
  }

  return {
    ok: true,
    policy: normalizePlatformFeePolicy({
      platformFeeMode: mode,
      platformFeePct: pctNum,
      platformFeeFixed: fixedNum,
      isPlatformFeeEnabled: input.isPlatformFeeEnabled !== false,
    }),
  };
}

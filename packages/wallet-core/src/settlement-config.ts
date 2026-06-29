/**
 * Settlement second-approval configuration (Batch 5).
 *
 * TEMPORARY central constant + env override. Batch 6 should move the threshold
 * into the platform settings store; until then it is read from the env with a
 * clear, documented fallback (no business-logic hardcode without a fallback).
 */

export const DEFAULT_SECOND_APPROVAL_THRESHOLD_SAR = 10000;

/** Read an env var without depending on Node type globals (wallet-core is env-light). */
function readEnv(name: string): string | undefined {
  const g = globalThis as { process?: { env?: Record<string, string | undefined> } };
  return g.process?.env?.[name];
}

/** Resolve the configurable second-approval threshold (SAR). */
export function getSecondApprovalThresholdSar(): number {
  const v = Number(readEnv('SETTLEMENT_SECOND_APPROVAL_THRESHOLD_SAR'));
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_SECOND_APPROVAL_THRESHOLD_SAR;
}

/** True when a payout amount requires a second approval (decimal-safe, >=). */
export function needsSecondApproval(
  amount: string | number,
  threshold = getSecondApprovalThresholdSar(),
): boolean {
  return Number(amount) >= threshold;
}

/**
 * Batch 6: a settlement is "stuck" if it has sat in a non-final in-progress
 * state longer than this many hours. TEMPORARY central constant + env override;
 * Batch 7 should move it (and the second-approval threshold) into the platform
 * settings store — documented as tech debt.
 */
export const DEFAULT_STUCK_AFTER_HOURS = 48;

export function getStuckAfterHours(): number {
  const v = Number(readEnv('SETTLEMENT_STUCK_AFTER_HOURS'));
  return Number.isFinite(v) && v > 0 ? v : DEFAULT_STUCK_AFTER_HOURS;
}

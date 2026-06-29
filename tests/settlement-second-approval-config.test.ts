import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SECOND_APPROVAL_THRESHOLD_SAR,
  getSecondApprovalThresholdSar,
  needsSecondApproval,
} from '@haa/wallet-core';

/**
 * Batch 5 — second-approval threshold (configurable, decimal-safe).
 */
describe('second-approval threshold', () => {
  it('defaults to 10000 SAR', () => {
    expect(DEFAULT_SECOND_APPROVAL_THRESHOLD_SAR).toBe(10000);
    expect(getSecondApprovalThresholdSar()).toBe(10000);
  });

  it('does NOT require a second approval below the threshold', () => {
    expect(needsSecondApproval('9999.99', 10000)).toBe(false);
  });

  it('DOES require a second approval at the threshold', () => {
    expect(needsSecondApproval('10000', 10000)).toBe(true);
    expect(needsSecondApproval('10000.00', 10000)).toBe(true);
  });

  it('DOES require a second approval above the threshold', () => {
    expect(needsSecondApproval('10000.01', 10000)).toBe(true);
    expect(needsSecondApproval('50000', 10000)).toBe(true);
  });
});

/**
 * Loading state standards — T3.5.
 *
 * AGENTS.md §9.2 + design plan T3.5: define a single source of truth for
 * loading UI across all apps.
 *
 * Three patterns, chosen by predicted load time:
 *
 *   1. < 300ms     → inline spinner (Loader2) on the trigger button only
 *   2. 300ms-2s    → skeleton placeholders matching final layout shape
 *   3. > 2s        → skeleton + "لا يزال يتم التحميل..." fallback copy
 *
 * Never show a blank screen for any async fetch — always pick one of the
 * above three based on the predicted wait time. When unsure, default to
 * skeleton (pattern 2) — it always renders something.
 *
 * ## Usage
 *
 * ```tsx
 * import { Skeleton, Spinner, LoadingFallback, LOADING_DELAYS } from '@haa/ui';
 *
 * // Quick action (e.g. button submit)
 * <button disabled={loading}>
 *   {loading ? <Spinner size="sm" /> : null}
 *   Save
 * </button>
 *
 * // Page-level fetch (likely > 300ms)
 * if (loading) return <LoadingFallback variant="list" count={6} />;
 *
 * // Inline skeleton (replaces specific element)
 * <Skeleton className="h-4 w-32" />
 * ```
 */

export type LoadingVariant = 'card' | 'list' | 'detail' | 'page';

export const LOADING_DELAYS = {
  /** < this → use inline spinner on trigger */
  INLINE_SPINNER_MS: 300,
  /** >= this → use skeleton placeholders */
  SKELETON_MS: 300,
  /** >= this → also show "still loading" fallback copy after 2s */
  FALLBACK_COPY_MS: 2000,
} as const;

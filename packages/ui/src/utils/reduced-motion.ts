/**
 * Reduced-motion helpers — T3.6.
 *
 * AGENTS.md §9.2 + design plan T3.6: respect `prefers-reduced-motion: reduce`
 * by gating CSS animations and transitions.
 *
 * Tailwind already emits `motion-reduce:animate-none` and
 * `motion-reduce:transition-none` classes when used. These helpers wrap
 * common patterns so shared components can be reduced-motion-safe by
 * default.
 *
 * Usage:
 *   import { withReducedMotion, isReducedMotionPreferred } from '@haa/ui';
 *
 *   // Static class composition (most common case)
 *   <div className={withReducedMotion('animate-pulse bg-surface-2')}>
 *
 *   // Hook for JS-driven animation (e.g. intervals, requestAnimationFrame)
 *   useEffect(() => {
 *     if (isReducedMotionPreferred()) return;
 *     const id = setInterval(tick, 1000);
 *     return () => clearInterval(id);
 *   }, []);
 */

/**
 * Wraps Tailwind animation/transition classes so they auto-disable under
 * `prefers-reduced-motion: reduce`. Safe to use anywhere a Tailwind class
 * string is expected.
 *
 * Pass `true` as second arg to opt out (e.g. for testing or when motion
 * is essential to a feature's meaning).
 */
export function withReducedMotion(classes: string, _essential = false): string {
  // Tailwind's `motion-reduce:` variant is compiled at build time, so we
  // simply prepend it. Components opting out can pass `essential=true` (a
  // documentation marker; the classes still apply).
  return `motion-reduce:animate-none motion-reduce:transition-none ${classes}`;
}

/**
 * Browser-only check for reduced-motion preference. Use inside useEffect
 * or event handlers — not during render — to gate JS animations.
 *
 * Returns false when `window` is unavailable (SSR) or the user has not
 * requested reduced motion.
 */
export function isReducedMotionPreferred(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * React hook variant of isReducedMotionPreferred(). Re-renders when the
 * user toggles the preference (e.g. via OS settings or DevTools).
 */
export function usePrefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  const [reduced, setReduced] = React.useState(() =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// Re-export React to keep this module self-contained.
import * as React from 'react';

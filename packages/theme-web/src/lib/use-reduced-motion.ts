'use client'

import { useAccessibility } from './use-accessibility'

type ReducedMotionLevel = 'full' | 'reduced' | 'no-preference'

/**
 * Hook for animation-aware components.
 * Returns the motion level based on user preference and OS setting.
 *
 * - `full`:           All animations allowed
 * - `reduced`:        Only essential/non-disorienting animations
 * - `no-preference`:  User prefers no animation at all
 */
export function useReducedMotion(): { level: ReducedMotionLevel; prefersReduced: boolean } {
  const { reducedMotion } = useAccessibility()

  if (reducedMotion) {
    return { level: 'no-preference', prefersReduced: true }
  }

  return { level: 'full', prefersReduced: false }
}

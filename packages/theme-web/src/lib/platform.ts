'use client'

import { useEffect, useState } from 'react'

export type Platform = 'web' | 'ios' | 'macos' | 'visionos' | 'tvos' | 'unknown'

export type InteractionCapabilities = {
  /** Fine pointer (mouse) vs coarse (touch) */
  finePointer: boolean
  /** Supports hover pseudo-class */
  hover: boolean
  /** Touch support */
  touch: boolean
  /** High dynamic range display (visionOS/P3) */
  hdr: boolean
  /** Reduced motion preferred */
  reducedMotion: boolean
}

declare global {
  interface Window {
    webkit?: { messageHandlers?: Record<string, unknown> }
  }
}

export function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown'

  const ua = navigator.userAgent

  if (/Macintosh/.test(ua) && 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0) {
    if (/Chrome|Firefox|Safari/.test(ua) && !/iPad/.test(ua)) return 'macos'
  }

  if (/Mac OS/.test(ua) && !/iPhone|iPad/.test(ua)) return 'macos'
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios'
  if (/AppleTV/.test(ua)) return 'tvos'
  if (/CrKey/.test(ua)) return 'tvos'
  if (ua.includes('Vision')) return 'visionos'

  return 'web'
}

function getInteractionCaps(): InteractionCapabilities {
  if (typeof window === 'undefined') {
    return { finePointer: true, hover: false, touch: false, hdr: false, reducedMotion: false }
  }

  const fineMatch = window.matchMedia('(pointer: fine)')
  const coarseMatch = window.matchMedia('(pointer: coarse)')
  const hoverMatch = window.matchMedia('(hover: hover)')
  const hdrMatch = window.matchMedia('(dynamic-range: high)')
  const motionMatch = window.matchMedia('(prefers-reduced-motion: reduce)')

  return {
    finePointer: fineMatch.matches,
    hover: hoverMatch.matches,
    touch: coarseMatch.matches || 'maxTouchPoints' in navigator && navigator.maxTouchPoints > 0,
    hdr: hdrMatch.matches,
    reducedMotion: motionMatch.matches,
  }
}

export function usePlatform(): Platform {
  const [platform, setPlatform] = useState<Platform>('unknown')

  useEffect(() => {
    setPlatform(detectPlatform())
  }, [])

  return platform
}

export function useInteractionCaps(): InteractionCapabilities {
  const [caps, setCaps] = useState<InteractionCapabilities>(() => getInteractionCaps())

  useEffect(() => {
    const update = () => setCaps(getInteractionCaps())

    const queries = [
      '(pointer: fine)',
      '(pointer: coarse)',
      '(hover: hover)',
      '(dynamic-range: high)',
      '(prefers-reduced-motion: reduce)',
    ].map(q => {
      const mql = window.matchMedia(q)
      mql.addEventListener('change', update)
      return mql
    })

    return () => queries.forEach(mql => mql.removeEventListener('change', update))
  }, [])

  return caps
}

export function usePlatformAdaptation() {
  const platform = usePlatform()
  const interaction = useInteractionCaps()

  return {
    platform,
    interaction,
    /** iOS/touch → tap feedback only, macOS → hover + focus ring */
    buttonRadius: platform === 'ios' ? 'var(--radius-ios-btn)' : 'var(--radius-sm)',
    /** Show hover effects only if pointer is fine */
    showHover: interaction.hover && interaction.finePointer,
    /** visionOS → glass material */
    useGlass: platform === 'visionos',
    /** macOS → use smaller corner radius for buttons */
    useMacRadii: platform === 'macos',
    /** Animate only if user allows motion */
    animate: !interaction.reducedMotion,
  }
}

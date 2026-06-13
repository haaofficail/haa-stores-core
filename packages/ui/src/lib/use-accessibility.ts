'use client'

import { useState, useEffect } from 'react'

export interface AccessibilitySettings {
  /** User prefers reduced motion */
  reducedMotion: boolean
  /** User prefers high contrast (OS-level) */
  highContrast: boolean
  /** User decreased transparency setting */
  decreasedTransparency: boolean
  /** Current system font scale factor (iOS Dynamic Type) */
  fontScale: number
  /** Forced color scheme (null = no override) */
  forcedColorScheme: 'light' | 'dark' | null
}

function readSettings(): AccessibilitySettings {
  if (typeof window === 'undefined') {
    return {
      reducedMotion: false,
      highContrast: false,
      decreasedTransparency: false,
      fontScale: 1,
      forcedColorScheme: null,
    }
  }

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const contrast = window.matchMedia('(prefers-contrast: more)').matches
  const transparent = window.matchMedia('(prefers-reduced-transparency: reduce)').matches

  // Estimate font scale from root font-size
  const rootSize = parseFloat(getComputedStyle(document.documentElement).fontSize)
  const fontScale = rootSize / 16

  return {
    reducedMotion: reduced,
    highContrast: contrast,
    decreasedTransparency: transparent,
    fontScale: Math.round(fontScale * 100) / 100,
    forcedColorScheme: null,
  }
}

const listeners = new Set<(s: AccessibilitySettings) => void>()

if (typeof window !== 'undefined') {
  const update = () => {
    const s = readSettings()
    listeners.forEach(fn => fn(s))
  }
  window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', update)
  window.matchMedia('(prefers-contrast: more)').addEventListener('change', update)
  window.matchMedia('(prefers-reduced-transparency: reduce)').addEventListener('change', update)
}

export function useAccessibility(): AccessibilitySettings {
  const [settings, setSettings] = useState<AccessibilitySettings>(readSettings)

  useEffect(() => {
    listeners.add(setSettings)
    return () => { listeners.delete(setSettings) }
  }, [])

  return settings
}

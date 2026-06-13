'use client'

import { useState, useEffect } from 'react'

export interface SafeAreaInsets {
  top: number
  bottom: number
  left: number
  right: number
}

function readSafeArea(): SafeAreaInsets {
  if (typeof document === 'undefined') {
    return { top: 0, bottom: 0, left: 0, right: 0 }
  }

  const style = getComputedStyle(document.documentElement)

  const parseEnv = (value: string): number => {
    const match = value.match(/(\d+)px/)
    return match ? parseInt(match[1]) : 0
  }

  return {
    top: parseEnv(style.getPropertyValue('--safe-top')),
    bottom: parseEnv(style.getPropertyValue('--safe-bottom')),
    left: parseEnv(style.getPropertyValue('--safe-left')),
    right: parseEnv(style.getPropertyValue('--safe-right')),
  }
}

export function useSafeArea(): SafeAreaInsets {
  const [insets, setInsets] = useState<SafeAreaInsets>({ top: 0, bottom: 0, left: 0, right: 0 })

  useEffect(() => {
    setInsets(readSafeArea())

    const onResize = () => setInsets(readSafeArea())
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  return insets
}

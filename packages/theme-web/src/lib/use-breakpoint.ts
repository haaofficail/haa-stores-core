'use client'

import { useState, useEffect } from 'react'

const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const

type BreakpointName = keyof typeof breakpoints

export function useBreakpoint(): BreakpointName {
  const [bp, setBp] = useState<BreakpointName>('lg')

  useEffect(() => {
    const check = () => {
      const w = window.innerWidth
      if (w < breakpoints.sm) setBp('sm')
      else if (w < breakpoints.md) setBp('md')
      else if (w < breakpoints.lg) setBp('lg')
      else if (w < breakpoints.xl) setBp('xl')
      else setBp('2xl')
    }

    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  return bp
}

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(query)
    setMatches(mq.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [query])

  return matches
}

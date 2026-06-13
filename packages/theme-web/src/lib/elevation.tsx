'use client'

import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from 'react'

export type ElevationLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6

interface ElevationConfig {
  zIndex: string
  shadow: string
  material: string | null
  backdropFilter: string | null
}

const ELEVATION_MAP: Record<ElevationLevel, ElevationConfig> = {
  0: {
    zIndex: 'var(--z-base)',
    shadow: 'none',
    material: null,
    backdropFilter: null,
  },
  1: {
    zIndex: 'var(--z-dropdown)',
    shadow: 'var(--shadow-sm)',
    material: null,
    backdropFilter: null,
  },
  2: {
    zIndex: 'var(--z-sticky)',
    shadow: 'var(--shadow-md)',
    material: 'var(--material-thin-lightBackground)',
    backdropFilter: 'blur(60px)',
  },
  3: {
    zIndex: 'var(--z-overlay)',
    shadow: 'var(--shadow-lg)',
    material: 'var(--material-regular-lightBackground)',
    backdropFilter: 'blur(40px)',
  },
  4: {
    zIndex: 'var(--z-modal)',
    shadow: 'var(--shadow-lg)',
    material: 'var(--material-thick-lightBackground)',
    backdropFilter: 'blur(20px)',
  },
  5: {
    zIndex: 'var(--z-toast)',
    shadow: 'var(--shadow-xl)',
    material: null,
    backdropFilter: null,
  },
  6: {
    zIndex: 'var(--z-tooltip)',
    shadow: 'var(--shadow-xl)',
    material: 'var(--material-ultra-thick-lightBackground)',
    backdropFilter: 'blur(10px)',
  },
}

interface ElevationContextValue {
  level: ElevationLevel
  setLevel: (level: ElevationLevel) => void
  getStyles: (level?: ElevationLevel) => CSSProperties
}

const ElevationContext = createContext<ElevationContextValue | null>(null)

export function ElevationProvider({
  children,
  defaultLevel = 0,
}: {
  children: ReactNode
  defaultLevel?: ElevationLevel
}) {
  const value = useMemo<ElevationContextValue>(() => ({
    level: defaultLevel,
    setLevel: () => {},
    getStyles: (level?: ElevationLevel): CSSProperties => {
      const cfg = ELEVATION_MAP[level ?? defaultLevel] ?? ELEVATION_MAP[0]
      return {
        zIndex: cfg.zIndex,
        boxShadow: cfg.shadow,
        ...(cfg.material ? { background: cfg.material } : {}),
        ...(cfg.backdropFilter
          ? { backdropFilter: cfg.backdropFilter, WebkitBackdropFilter: cfg.backdropFilter }
          : {}),
      }
    },
  }), [defaultLevel])

  return (
    <ElevationContext.Provider value={value}>
      {children}
    </ElevationContext.Provider>
  )
}

export function useElevation(): ElevationContextValue {
  const ctx = useContext(ElevationContext)
  if (!ctx) {
    throw new Error('useElevation must be used within an ElevationProvider')
  }
  return ctx
}

export function getElevationStyle(level: ElevationLevel): CSSProperties {
  const cfg = ELEVATION_MAP[level] ?? ELEVATION_MAP[0]
  return {
    zIndex: cfg.zIndex,
    boxShadow: cfg.shadow,
    ...(cfg.material ? { background: cfg.material } : {}),
    ...(cfg.backdropFilter
      ? { backdropFilter: cfg.backdropFilter, WebkitBackdropFilter: cfg.backdropFilter }
      : {}),
  }
}

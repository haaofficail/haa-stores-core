import { useTheme } from '@haa/theme-react'
import { useDirection } from './direction-context'
import { usePlatformAdaptation, useInteractionCaps, usePlatform } from './platform'
import { useAccessibility } from './use-accessibility'
import { useSafeArea } from './use-safe-area'
import { useBreakpoint } from './use-breakpoint'
import { cn } from './cn'
import type { ReactNode, ComponentType } from 'react'

export function useHAA() {
  const theme = useTheme()
  const direction = useDirection()
  const platform = usePlatformAdaptation()
  const interaction = useInteractionCaps()
  const os = usePlatform()
  const a11y = useAccessibility()
  const safeArea = useSafeArea()
  const breakpoint = useBreakpoint()

  return {
    theme,
    direction,
    platform,
    interaction,
    os,
    a11y,
    safeArea,
    breakpoint,
    cn,
  }
}

export function withHAA<P extends object>(
  Component: ComponentType<P>,
  displayName?: string,
) {
  const Wrapped = (props: P) => {
    const haa = useHAA()
    return <Component {...props} haa={haa} />
  }
  Wrapped.displayName = displayName || `withHAA(${Component.displayName || Component.name})`
  return Wrapped
}

export type HAAContext = ReturnType<typeof useHAA>

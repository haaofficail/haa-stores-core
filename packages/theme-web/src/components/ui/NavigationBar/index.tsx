'use client'

import { type ReactNode } from 'react'
import { useDirection } from '@/lib/direction-context'
import { getElevationStyle } from '@/lib/elevation'

interface NavigationBarProps {
  title: string
  largeTitle?: boolean
  leftAction?: ReactNode
  rightAction?: ReactNode
}

export function NavigationBar({ title, largeTitle = true, leftAction, rightAction }: NavigationBarProps) {
  const { isRTL } = useDirection()

  return (
    <header
      style={{
        paddingTop: 'var(--safe-top, env(safe-area-inset-top, 0px))',
        borderBottom: '1px solid var(--border-default)',
        position: 'sticky' as const,
        top: 0,
        ...getElevationStyle(2),
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 var(--spacing-4)',
          minHeight: 44,
        }}
      >
        <div style={{ flex: 1 }}>{isRTL ? rightAction : leftAction}</div>
        <h1
          style={{
            fontSize: largeTitle ? 'var(--typography-large-title-size)' : 'var(--typography-title3-size)',
            fontWeight: largeTitle ? 400 : 600,
            lineHeight: largeTitle ? 'var(--typography-large-title-line-height)' : 'var(--typography-title3-line-height)',
            letterSpacing: largeTitle ? 'var(--typography-large-title-letter-spacing)' : 'var(--typography-title3-letter-spacing)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-sans)',
            margin: 0,
            textAlign: 'center' as const,
          }}
        >
          {title}
        </h1>
        <div style={{ flex: 1, display: 'flex', justifyContent: isRTL ? 'flex-start' : 'flex-end' }}>
          {isRTL ? leftAction : rightAction}
        </div>
      </div>
    </header>
  )
}

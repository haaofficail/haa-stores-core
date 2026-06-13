'use client'

import { type ReactNode } from 'react'
import { useDirection } from '@/lib/direction-context'
import { getElevationStyle } from '@/lib/elevation'

interface Tab {
  id: string
  label: string
  icon?: ReactNode
}

interface TabBarProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (id: string) => void
}

export function TabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  const { isRTL } = useDirection()

  return (
    <nav
      role="tablist"
      aria-label="Navigation"
      style={{
        display: 'flex',
        flexDirection: isRTL ? 'row-reverse' : 'row',
        paddingBottom: 'var(--safe-bottom, env(safe-area-inset-bottom, 0px))',
        borderTop: '1px solid var(--border-default)',
        position: 'sticky' as const,
        bottom: 0,
        ...getElevationStyle(2),
      }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab
        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 2,
              padding: 'var(--spacing-1) 0',
              minHeight: 'var(--touch-target-min)',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: isActive ? 'var(--color-primary-500)' : 'var(--text-tertiary)',
              fontSize: 'var(--typography-caption1-size)',
              fontWeight: isActive ? 600 : 400,
              fontFamily: 'var(--font-sans)',
              transition: 'color var(--duration-fast) var(--ease-spring-snappy)',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            {tab.icon && (
              <div style={{ width: 24, height: 24 }}>{tab.icon}</div>
            )}
            <span>{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}

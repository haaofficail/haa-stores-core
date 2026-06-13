'use client'

import type { ReactNode } from 'react'

interface BreadcrumbsProps {
  items: { label: string; href?: string }[]
  renderLink?: (item: { label: string; href?: string }, children: ReactNode) => ReactNode
}

export function Breadcrumbs({ items, renderLink }: BreadcrumbsProps) {
  const defaultRender = (_item: { label: string; href?: string }, children: ReactNode) => children

  return (
    <nav
      aria-label="Breadcrumb"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-1)',
        fontSize: 'var(--typography-footnote-size)',
        color: 'var(--text-tertiary)',
        marginBottom: 'var(--spacing-4)',
        overflowX: 'auto',
        whiteSpace: 'nowrap',
      }}
    >
      {items.map((item, idx) => {
        const isLast = idx === items.length - 1
        return (
          <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-1)', flexShrink: 0 }}>
            {idx > 0 && (
              <span style={{ color: 'var(--text-tertiary)', fontSize: '12px', margin: '0 2px' }}>/</span>
            )}
            {item.href && !isLast ? (
              (renderLink || defaultRender)(item, <span style={{ color: 'var(--color-primary-500)', cursor: 'pointer' }}>{item.label}</span>)
            ) : (
              <span style={{ color: isLast ? 'var(--text-primary)' : 'var(--text-tertiary)', fontWeight: isLast ? 600 : 400 }}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}

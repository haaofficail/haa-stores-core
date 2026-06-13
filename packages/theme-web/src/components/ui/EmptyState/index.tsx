'use client'

import { type ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--spacing-2)',
        padding: 'var(--spacing-6)',
        textAlign: 'center',
        color: 'var(--text-secondary)',
      }}
    >
      {icon && <div style={{ opacity: 0.4, marginBottom: 'var(--spacing-1)' }}>{icon}</div>}
      <h3
        style={{
          fontSize: 'var(--typography-title3-size)',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      {description && (
        <p style={{ fontSize: 'var(--typography-callout-size)', margin: 0, maxWidth: 320 }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: 'var(--spacing-2)' }}>{action}</div>}
    </div>
  )
}

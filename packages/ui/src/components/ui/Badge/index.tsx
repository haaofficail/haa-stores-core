'use client'

import { forwardRef, type ElementRef, type ComponentPropsWithoutRef } from 'react'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  variant?: BadgeVariant
  size?: 'sm' | 'md'
}

const badgeStyle = (v: BadgeVariant): React.CSSProperties => {
  switch (v) {
    case 'success':
      return {
        background: 'var(--color-success)',
        color: 'var(--color-success-text)',
      }
    case 'warning':
      return {
        background: 'var(--color-warning)',
        color: 'var(--color-warning-text)',
      }
    case 'danger':
      return {
        background: 'var(--color-danger)',
        color: 'var(--color-danger-text)',
      }
    case 'info':
      return {
        background: 'var(--color-info)',
        color: 'var(--color-info-text)',
      }
    case 'neutral':
      return {
        background: 'var(--color-neutral-200)',
        color: 'var(--text-primary)',
      }
  }
}

export const Badge = forwardRef<ElementRef<'span'>, BadgeProps>(
  ({ variant = 'neutral', size = 'md', style, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 'var(--spacing-1)',
          padding: size === 'sm' ? '2px var(--spacing-1)' : '4px var(--spacing-2)',
          borderRadius: 'var(--radius-pill)',
          fontSize: size === 'sm' ? 'var(--typography-caption2-size)' : 'var(--typography-footnote-size)',
          fontWeight: 600,
          lineHeight: 1.2,
          fontFamily: 'var(--font-sans)',
          whiteSpace: 'nowrap' as const,
          ...badgeStyle(variant),
          ...style,
        }}
        {...props}
      >
        {children}
      </span>
    )
  },
)

Badge.displayName = 'Badge'

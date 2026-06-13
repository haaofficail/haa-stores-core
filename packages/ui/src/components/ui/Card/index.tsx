'use client'

import { forwardRef, type ElementRef, type ComponentPropsWithoutRef } from 'react'
import { getElevationStyle } from '../../../lib/elevation'

type CardVariant = 'elevated' | 'filled' | 'outlined'

interface CardProps extends ComponentPropsWithoutRef<'div'> {
  variant?: CardVariant
  padding?: keyof typeof paddingMap
}

const paddingMap = {
  sm: 'var(--spacing-3)',
  md: 'var(--spacing-4)',
  lg: 'var(--spacing-5)',
  none: '0',
}

const variantCardStyle = (v: CardVariant): React.CSSProperties => {
  switch (v) {
    case 'elevated':
      return {
        background: 'var(--surface-1)',
        ...getElevationStyle(1),
      }
    case 'filled':
      return {
        background: 'var(--surface-2)',
      }
    case 'outlined':
      return {
        background: 'var(--surface-1)',
        boxShadow: '0 0 0 1px var(--border-default)',
      }
  }
}

export const Card = forwardRef<ElementRef<'div'>, CardProps>(
  ({ variant = 'elevated', padding = 'md', style, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        style={{
          borderRadius: 'var(--radius-md)',
          padding: paddingMap[padding],
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-primary)',
          ...variantCardStyle(variant),
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    )
  },
)

Card.displayName = 'Card'

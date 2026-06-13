'use client'

import { forwardRef, type ElementRef, type ComponentPropsWithoutRef } from 'react'

type DividerWeight = 'default' | 'heavy'

interface DividerProps extends ComponentPropsWithoutRef<'hr'> {
  weight?: DividerWeight
}

export const Divider = forwardRef<ElementRef<'hr'>, DividerProps>(
  ({ weight = 'default', style, ...props }, ref) => {
    return (
      <hr
        ref={ref}
        role="separator"
        aria-orientation="horizontal"
        style={{
          border: 'none',
          borderTop: `1px solid var(--border-default)`,
          margin: 'var(--spacing-3) 0',
          width: '100%',
          ...style,
        }}
        {...props}
      />
    )
  },
)

Divider.displayName = 'Divider'

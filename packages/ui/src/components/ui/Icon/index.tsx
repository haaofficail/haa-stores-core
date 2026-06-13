'use client'

import { forwardRef, type ElementRef, type ComponentPropsWithoutRef } from 'react'

type IconSize = 'sm' | 'md' | 'lg' | 'xl'

interface IconProps extends ComponentPropsWithoutRef<'svg'> {
  size?: IconSize
}

const iconSizeMap: Record<IconSize, number> = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
}

export const Icon = forwardRef<ElementRef<'svg'>, IconProps>(
  ({ size = 'md', width, height, viewBox = '0 0 24 24', fill = 'none', style, children, ...props }, ref) => {
    const dim = iconSizeMap[size]

    return (
      <svg
        ref={ref}
        aria-hidden="true"
        width={width ?? dim}
        height={height ?? dim}
        viewBox={viewBox}
        fill={fill}
        style={{
          flexShrink: 0,
          color: 'currentColor',
          ...style,
        }}
        {...props}
      >
        {children}
      </svg>
    )
  },
)

Icon.displayName = 'Icon'

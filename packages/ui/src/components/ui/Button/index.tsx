'use client'

import { forwardRef, type ElementRef, type ComponentPropsWithoutRef } from 'react'
import { usePlatformAdaptation } from '../../../lib/platform'
import { getElevationStyle } from '../../../lib/elevation'

const _variants = ['primary', 'secondary', 'ghost', 'danger'] as const
const _sizes = ['sm', 'md', 'lg'] as const

type ButtonVariant = (typeof _variants)[number]
type ButtonSize = (typeof _sizes)[number]

interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const sizeMap: Record<ButtonSize, { h: string; px: string; fs: string }> = {
  sm: { h: '32px', px: 'var(--spacing-3)', fs: 'var(--typography-footnote-size)' },
  md: { h: '44px', px: 'var(--spacing-4)', fs: 'var(--typography-callout-size)' },
  lg: { h: '52px', px: 'var(--spacing-5)', fs: 'var(--typography-body-size)' },
}

const variantStyle = (v: ButtonVariant): React.CSSProperties => {
  switch (v) {
    case 'primary':
      return { background: 'var(--color-primary-500)', color: 'var(--text-on-color, #fff)' }
    case 'secondary':
      return {
        background: 'var(--surface-2)',
        color: 'var(--text-primary)',
        border: '1px solid var(--border-default)',
      }
    case 'ghost':
      return { background: 'transparent', color: 'var(--color-primary-500)' }
    case 'danger':
      return { background: 'var(--color-danger)', color: 'var(--color-danger-text)' }
  }
}

export const Button = forwardRef<ElementRef<'button'>, ButtonProps>(
  ({ variant = 'primary', size = 'md', style, disabled, children, ...props }, ref) => {
    const platform = usePlatformAdaptation()
    const s = sizeMap[size]

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled}
        suppressHydrationWarning
        style={{
          height: s.h,
          paddingInline: s.px,
          fontSize: s.fs,
          fontWeight: 600,
          fontFamily: 'var(--font-sans)',
          borderRadius: platform.platform === 'macos'
            ? 'var(--radius-mac-btn)'
            : 'var(--radius-ios-btn)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          minHeight: 'var(--touch-target-min)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--spacing-1)',
          border: 'none',
          lineHeight: 1,
          textDecoration: 'none',
          whiteSpace: 'nowrap' as const,
          userSelect: 'none' as const,
          WebkitTapHighlightColor: 'transparent',
          transition: platform.animate
            ? 'all var(--duration-fast) var(--ease-spring-snappy)'
            : 'none',
          ...getElevationStyle(1),
          ...variantStyle(variant),
          ...(platform.useGlass
            ? {
                background: 'linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.05))',
                backdropFilter: 'blur(60px)',
                WebkitBackdropFilter: 'blur(60px)',
                border: '0.5px solid rgba(255,255,255,0.2)',
              }
            : {}),
          ...style,
        }}
        {...props}
      >
        {children}
      </button>
    )
  },
)

Button.displayName = 'Button'

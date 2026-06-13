'use client'

import { forwardRef, useCallback, useState, type ElementRef, type ComponentPropsWithoutRef } from 'react'

interface SwitchProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onChange'> {
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (checked: boolean) => void
}

export const Switch = forwardRef<ElementRef<'button'>, SwitchProps>(
  ({ checked: controlledChecked, defaultChecked = false, onChange, disabled, style, ...props }, ref) => {
    const isControlled = controlledChecked !== undefined
    const [internalChecked, setInternalChecked] = useState(defaultChecked)
    const checked = isControlled ? controlledChecked : internalChecked

    const handleClick = useCallback(() => {
      if (disabled) return
      const next = !checked
      if (!isControlled) setInternalChecked(next)
      onChange?.(next)
    }, [checked, disabled, isControlled, onChange])

    return (
      <button
        ref={ref}
        role="switch"
        aria-checked={checked}
        onClick={handleClick}
        disabled={disabled}
        style={{
          position: 'relative' as const,
          width: '51px',
          height: '31px',
          borderRadius: '16px',
          border: 'none',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          background: checked ? 'var(--color-primary-500)' : 'var(--color-neutral-300)',
          transition: 'background var(--duration-fast) var(--ease-spring-snappy)',
          flexShrink: 0,
          padding: 0,
          ...style,
        }}
        {...props}
      >
        <span
          style={{
            position: 'absolute' as const,
            top: '3px',
            insetInlineStart: checked ? '23px' : '3px',
            width: '25px',
            height: '25px',
            borderRadius: '50%',
            background: 'var(--surface-1, #fff)',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'inset-inline-start var(--duration-fast) var(--ease-spring-snappy)',
            pointerEvents: 'none' as const,
          }}
        />
      </button>
    )
  },
)

Switch.displayName = 'Switch'

'use client'

import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className, ...props }, ref) => {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-1)' }}>
        {label && (
          <label
            style={{
              fontSize: 'var(--typography-footnote-size)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {label}
          </label>
        )}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          {icon && (
            <span
              style={{
                position: 'absolute',
                insetInlineStart: 'var(--spacing-2)',
                color: 'var(--text-tertiary)',
                width: 20,
                height: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            style={{
              width: '100%',
              padding: icon
                ? 'var(--spacing-2) var(--spacing-2)'
                : 'var(--spacing-2) var(--spacing-3)',
              ...(icon ? { paddingInlineStart: 'var(--spacing-5)' } : {}),
              fontSize: 'var(--typography-body-size)',
              fontFamily: 'var(--font-sans)',
              color: 'var(--text-primary)',
              background: 'var(--surface-2)',
              border: error
                ? 'var(--border-width-2) solid var(--color-danger)'
                : 'var(--border-width-1) solid var(--border-default)',
              borderRadius: 'var(--radius-md)',
              outline: 'none',
              minHeight: 44,
              transition: 'border-color var(--duration-fast) var(--ease-spring-snappy)',
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${props.id}-error` : undefined}
            {...props}
          />
        </div>
        {error && (
          <span
            id={`${props.id}-error`}
            role="alert"
            style={{
              fontSize: 'var(--typography-caption1-size)',
              color: 'var(--color-danger)',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {error}
          </span>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

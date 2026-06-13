'use client'

import { type SelectHTMLAttributes, forwardRef } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: SelectOption[]
  placeholder?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, placeholder, ...props }, ref) => {
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
        <select
          ref={ref}
          style={{
            width: '100%',
            padding: 'var(--spacing-2) var(--spacing-3)',
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
            cursor: 'pointer',
            transition: 'border-color var(--duration-fast) var(--ease-spring-snappy)',
          }}
          aria-invalid={error ? true : undefined}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <span
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

Select.displayName = 'Select'

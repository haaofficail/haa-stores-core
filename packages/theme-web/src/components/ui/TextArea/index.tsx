'use client'

import { type TextareaHTMLAttributes, forwardRef } from 'react'

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, ...props }, ref) => {
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
        <textarea
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
            minHeight: 88,
            resize: 'vertical',
            transition: 'border-color var(--duration-fast) var(--ease-spring-snappy)',
          }}
          aria-invalid={error ? true : undefined}
          {...props}
        />
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

TextArea.displayName = 'TextArea'

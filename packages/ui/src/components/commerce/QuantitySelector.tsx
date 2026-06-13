'use client'

interface QuantitySelectorProps {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  disabled?: boolean
}

export function QuantitySelector({ value, onChange, min = 1, max = 99, disabled }: QuantitySelectorProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="إنقاص الكمية"
        style={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-1)',
          cursor: disabled || value <= min ? 'not-allowed' : 'pointer',
          opacity: disabled || value <= min ? 0.4 : 1,
          fontSize: '18px',
          color: 'var(--text-primary)',
          transition: 'all var(--duration-fast) var(--ease-spring-snappy)',
        }}
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value) || min
          onChange(Math.min(max, Math.max(min, v)))
        }}
        min={min}
        max={max}
        disabled={disabled}
        aria-label="الكمية"
        style={{
          width: 56,
          height: 40,
          textAlign: 'center',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--typography-callout-size)',
          fontWeight: 500,
          fontFamily: 'var(--font-sans)',
          color: 'var(--text-primary)',
          background: 'var(--surface-1)',
          outline: 'none',
          MozAppearance: 'textfield',
        }}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        aria-label="زيادة الكمية"
        style={{
          width: 40,
          height: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          background: 'var(--surface-1)',
          cursor: disabled || value >= max ? 'not-allowed' : 'pointer',
          opacity: disabled || value >= max ? 0.4 : 1,
          fontSize: '18px',
          color: 'var(--text-primary)',
          transition: 'all var(--duration-fast) var(--ease-spring-snappy)',
        }}
      >
        +
      </button>
    </div>
  )
}

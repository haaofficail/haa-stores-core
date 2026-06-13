'use client'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  placeholder?: string
}

export function SearchInput({ value, onChange, onSubmit, placeholder = 'بحث...' }: SearchInputProps) {
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit?.() }}
      style={{ position: 'relative' }}
    >
      <svg
        style={{
          position: 'absolute',
          insetInlineEnd: 'var(--spacing-2)',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 16,
          height: 16,
          color: 'var(--text-tertiary)',
          pointerEvents: 'none',
        }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          height: 44,
          paddingInline: 'var(--spacing-5) var(--spacing-2)',
          fontSize: 'var(--typography-callout-size)',
          fontFamily: 'var(--font-sans)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          outline: 'none',
          color: 'var(--text-primary)',
          transition: 'border-color var(--duration-fast) var(--ease-spring-snappy)',
        }}
      />
    </form>
  )
}

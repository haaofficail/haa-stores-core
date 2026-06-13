'use client'

interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md'
  variant?: 'primary' | 'success' | 'warning' | 'danger'
}

const progressColor = {
  primary: 'var(--color-primary-500)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
}

export function Progress({ value, max = 100, size = 'md', variant = 'primary' }: ProgressProps) {
  const pct = Math.min(Math.max((value / max) * 100, 0), 100)

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      style={{
        width: '100%',
        height: size === 'sm' ? 4 : 8,
        borderRadius: 4,
        background: 'var(--color-neutral-200)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${pct}%`,
          height: '100%',
          borderRadius: 4,
          background: progressColor[variant],
          transition: 'width var(--duration-normal) var(--ease-spring-smooth)',
        }}
      />
    </div>
  )
}

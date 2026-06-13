import { type ReactNode } from 'react'

interface GridProps {
  columns?: number
  gap?: string
  children: ReactNode
}

export function Grid({ columns = 2, gap = 'var(--spacing-2)', children }: GridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap,
      }}
    >
      {children}
    </div>
  )
}

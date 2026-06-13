import { type ReactNode } from 'react'

interface StackProps {
  direction?: 'column' | 'row'
  gap?: string
  align?: string
  justify?: string
  children: ReactNode
}

export function Stack({
  direction = 'column',
  gap = 'var(--spacing-2)',
  align,
  justify,
  children,
}: StackProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap,
        alignItems: align,
        justifyContent: justify,
      }}
    >
      {children}
    </div>
  )
}

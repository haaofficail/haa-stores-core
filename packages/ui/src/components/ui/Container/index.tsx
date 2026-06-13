import { type ReactNode } from 'react'

interface ContainerProps {
  maxWidth?: string
  padding?: string
  children: ReactNode
}

export function Container({
  maxWidth = 'var(--container-max-width, 1200px)',
  padding = 'var(--spacing-4)',
  children,
}: ContainerProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth,
        marginInline: 'auto',
        paddingInline: padding,
      }}
    >
      {children}
    </div>
  )
}

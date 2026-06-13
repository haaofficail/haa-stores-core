'use client'

interface SkeletonProps {
  width?: string | number
  height?: string | number
  borderRadius?: string
}

export function Skeleton({ width = '100%', height = 20, borderRadius = 'var(--radius-sm)' }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        width,
        height,
        borderRadius,
        background: 'var(--color-neutral-200)',
        animation: 'haaSkeletonPulse 1.5s ease-in-out infinite',
      }}
    />
  )
}

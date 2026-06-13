'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { getElevationStyle } from '@/lib/elevation'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div
      style={{
        position: 'fixed' as const,
        inset: 0,
        zIndex: 'var(--z-overlay)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: 'absolute' as const,
          inset: 0,
          background: 'var(--backdrop-color)',
          opacity: 0.4,
          animation: 'haaFadeIn 150ms ease-out',
        }}
      />
      <div
        style={{
          position: 'relative' as const,
          width: '100%',
          maxWidth: '640px',
          maxHeight: '85vh',
          background: 'var(--material-regular-lightBackground, var(--surface-1))',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          padding: 'var(--spacing-5)',
          overflow: 'auto',
          animation: 'haaSlideUp 300ms var(--ease-spring-smooth)',
          ...getElevationStyle(3),
        }}
      >
        {/* Drag indicator */}
        <div
          style={{
            width: 36,
            height: 5,
            borderRadius: 3,
            background: 'var(--color-neutral-300)',
            margin: '-8px auto var(--spacing-3)',
          }}
        />
        {title && (
          <h2
            style={{
              fontSize: 'var(--typography-title2-size)',
              fontWeight: 600,
              marginBottom: 'var(--spacing-3)',
              color: 'var(--text-primary)',
            }}
          >
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

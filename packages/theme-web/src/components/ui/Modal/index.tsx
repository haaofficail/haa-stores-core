'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { getElevationStyle } from '@/lib/elevation'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  const [mounted, setMounted] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

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
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed' as const,
        inset: 0,
        zIndex: 'var(--z-modal)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--backdrop-color)',
        opacity: 'var(--backdrop-opacity, 0.5)',
        backdropFilter: 'blur(var(--backdrop-blur, 8px))',
        WebkitBackdropFilter: 'blur(var(--backdrop-blur, 8px))',
        animation: 'haaFadeIn 150ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--surface-1)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-5)',
          maxWidth: '540px',
          width: '90vw',
          maxHeight: '80vh',
          overflow: 'auto',
          animation: 'haaScaleIn 200ms var(--ease-spring-smooth)',
          ...getElevationStyle(4),
        }}
      >
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

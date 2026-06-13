'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { getElevationStyle } from '../../../lib/elevation'

type ToastVariant = 'success' | 'warning' | 'danger' | 'info'

interface ToastProps {
  open: boolean
  onClose: () => void
  variant?: ToastVariant
  message: string
  duration?: number
  action?: { label: string; onClick: () => void }
}

const toastBg = {
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  danger: 'var(--color-danger)',
  info: 'var(--color-info)',
}

const toastText = {
  success: 'var(--color-success-text)',
  warning: 'var(--color-warning-text)',
  danger: 'var(--color-danger-text)',
  info: 'var(--color-info-text)',
}

export function Toast({ open, onClose, variant = 'info', message, duration = 3000, action }: ToastProps) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (open) {
      setVisible(true)
      if (duration > 0) {
        const timer = setTimeout(() => {
          setVisible(false)
          setTimeout(onClose, 200)
        }, duration)
        return () => clearTimeout(timer)
      }
    } else {
      setVisible(false)
    }
  }, [open, duration, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div
      role="alert"
      style={{
        position: 'fixed' as const,
        bottom: 'var(--safe-bottom, 24px)',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 'var(--z-toast)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-2)',
        padding: 'var(--spacing-3) var(--spacing-4)',
        borderRadius: 'var(--radius-lg)',
        background: toastBg[variant],
        color: toastText[variant],
        fontSize: 'var(--typography-callout-size)',
        fontWeight: 500,
        fontFamily: 'var(--font-sans)',
        maxWidth: '90vw',
        ...getElevationStyle(5),
        animation: visible ? 'haaSlideUpFade 200ms var(--ease-spring-snappy)' : 'haaFadeOut 200ms ease-in',
        pointerEvents: 'auto' as const,
      }}
    >
      <span style={{ flex: 1 }}>{message}</span>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            background: 'rgba(255,255,255,0.2)',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            padding: 'var(--spacing-1) var(--spacing-2)',
            color: 'inherit',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 'inherit',
          }}
        >
          {action.label}
        </button>
      )}
    </div>,
    document.body,
  )
}

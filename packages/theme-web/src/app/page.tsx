'use client'

import { useTheme } from '@haa/theme-react'
import { useAccessibility } from '@/lib/use-accessibility'
import { useReducedMotion } from '@/lib/use-reduced-motion'

export default function Home() {
  const { theme, setTheme, toggleTheme } = useTheme()
  const a11y = useAccessibility()
  const motion = useReducedMotion()

  return (
    <main
      style={{
        padding: 'var(--spacing-6)',
        fontFamily: 'var(--font-sans)',
        color: 'var(--text-primary)',
        backgroundColor: 'var(--surface-1)',
        minHeight: '100vh',
      }}
    >
      <section
        style={{
          maxWidth: '720px',
          margin: '0 auto',
        }}
      >
        <h1
          style={{
            fontSize: 'var(--typography-large-title-size)',
            fontWeight: 'var(--typography-large-title-font-weight)',
            lineHeight: 'var(--typography-large-title-line-height)',
            letterSpacing: 'var(--typography-large-title-letter-spacing)',
          }}
        >
          HAA Design System
        </h1>
        <p
          style={{
            fontSize: 'var(--typography-body-size)',
            color: 'var(--text-secondary)',
            marginTop: 'var(--spacing-2)',
          }}
        >
          Apple-grade · Philosophy-first · Accessible by default
        </p>

        <hr
          style={{
            border: 'none',
            borderTop: '1px solid var(--border-default)',
            margin: 'var(--spacing-4) 0',
          }}
        />

        {/* Theme Switcher */}
        <section style={{ marginBottom: 'var(--spacing-4)' }}>
          <h2 style={{ fontSize: 'var(--typography-title3-size)', fontWeight: 600 }}>Theme</h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
            {(['light', 'dark', 'high-contrast'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                style={{
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  borderRadius: 'var(--radius-ios-btn)',
                  border: `2px solid ${theme === t ? 'var(--color-primary-500)' : 'var(--border-default)'}`,
                  background: theme === t ? 'var(--color-primary-500)' : 'var(--surface-1)',
                  color: theme === t ? 'var(--text-on-color, #fff)' : 'var(--text-primary)',
                  fontFamily: 'inherit',
                  fontSize: 'var(--typography-callout-size)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all var(--duration-fast) var(--ease-spring-snappy)',
                  minHeight: 'var(--touch-target-min)',
                  minWidth: 120,
                }}
              >
                {t === 'high-contrast' ? 'High Contrast' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
          <p
            style={{
              fontSize: 'var(--typography-caption1-size)',
              color: 'var(--text-tertiary)',
              marginTop: 'var(--spacing-1)',
            }}
          >
            Active theme: {theme} · Toggle: <button onClick={toggleTheme} style={{ textDecoration: 'underline', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--color-primary-500)', font: 'inherit' }}>light/dark</button>
          </p>
        </section>

        {/* Accessibility Info */}
        <section style={{ marginBottom: 'var(--spacing-4)' }}>
          <h2 style={{ fontSize: 'var(--typography-title3-size)', fontWeight: 600 }}>Accessibility</h2>
          <pre
            style={{
              background: 'var(--surface-2)',
              padding: 'var(--spacing-3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--typography-footnote-size)',
              overflow: 'auto',
            }}
          >
{JSON.stringify({ ...a11y, motionLevel: motion.level }, null, 2)}
          </pre>
        </section>

        {/* Color Palette Preview */}
        <section style={{ marginBottom: 'var(--spacing-4)' }}>
          <h2 style={{ fontSize: 'var(--typography-title3-size)', fontWeight: 600 }}>Primary Palette</h2>
          <div style={{ display: 'flex', gap: 2, marginTop: 'var(--spacing-2)' }}>
            {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => (
              <div
                key={s}
                style={{
                  width: 48,
                  height: 48,
                  backgroundColor: `var(--color-primary-${s})`,
                  borderRadius: 'var(--radius-sm)',
                }}
                title={`primary-${s}`}
              />
            ))}
          </div>
        </section>

        {/* Typography Scale Preview */}
        <section style={{ marginBottom: 'var(--spacing-4)' }}>
          <h2 style={{ fontSize: 'var(--typography-title3-size)', fontWeight: 600 }}>Typography</h2>
          <div
            style={{
              display: 'grid',
              gap: 'var(--spacing-2)',
              marginTop: 'var(--spacing-2)',
            }}
          >
            {[
              'largeTitle', 'title1', 'title2', 'title3',
              'headline', 'body', 'callout', 'subhead',
              'footnote', 'caption1', 'caption2',
            ].map((name) => (
              <div key={name} style={{ display: 'flex', gap: 'var(--spacing-3)', alignItems: 'baseline' }}>
                <span
                  style={{
                    fontSize: `var(--typography-${name}-size)`,
                    fontWeight: `var(--typography-${name}-font-weight)`,
                    lineHeight: `var(--typography-${name}-line-height)`,
                    letterSpacing: `var(--typography-${name}-letter-spacing)`,
                    minWidth: 100,
                  }}
                >
                  {name}
                </span>
                <span style={{ fontSize: 'var(--typography-caption1-size)', color: 'var(--text-tertiary)' }}>
                  {`var(--typography-${name}-size)`}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Spacing Grid */}
        <section style={{ marginBottom: 'var(--spacing-4)' }}>
          <h2 style={{ fontSize: 'var(--typography-title3-size)', fontWeight: 600 }}>Spacing (8pt Grid)</h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', alignItems: 'flex-end', marginTop: 'var(--spacing-2)', flexWrap: 'wrap' }}>
            {[0, 1, 2, 3, 4, 5, 6, 8, 10, 12].map((s) => (
              <div key={s} style={{ textAlign: 'center' }}>
                <div
                  style={{
                    width: `var(--spacing-${s})`,
                    height: `var(--spacing-${s})`,
                    background: 'var(--color-primary-500)',
                    borderRadius: 'var(--radius-sm)',
                    minWidth: s === 0 ? 8 : undefined,
                    minHeight: s === 0 ? 8 : undefined,
                  }}
                />
                <span style={{ fontSize: 'var(--typography-caption1-size)' }}>{s}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Semantic Colors */}
        <section>
          <h2 style={{ fontSize: 'var(--typography-title3-size)', fontWeight: 600 }}>Semantic Colors</h2>
          <div style={{ display: 'flex', gap: 'var(--spacing-2)', marginTop: 'var(--spacing-2)' }}>
            {['success', 'warning', 'danger', 'info'].map((name) => (
              <div
                key={name}
                style={{
                  padding: 'var(--spacing-2) var(--spacing-3)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: `var(--color-${name})`,
                  color: `var(--color-${name}-text)`,
                  fontWeight: 600,
                  fontSize: 'var(--typography-callout-size)',
                }}
              >
                {name}
              </div>
            ))}
          </div>
        </section>
      </section>
    </main>
  )
}

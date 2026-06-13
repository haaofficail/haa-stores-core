import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, ThemeProvider, STORAGE_KEY } from './ThemeContext'
import { type ReactNode } from 'react'

const LIGHT_CSS = `
:root, [data-theme="light"] {
  --surface-1: #ffffff;
  --text-primary: #1d1d1f;
  --text-secondary: #86868b;
}
`

const DARK_CSS = `
[data-theme="dark"] {
  --surface-1: #1c1c1e;
  --text-primary: #f5f5f7;
  --text-secondary: #a1a1a6;
}
`

const HC_CSS = `
[data-theme="high-contrast"] {
  --surface-1: #ffffff;
  --text-primary: #000000;
  --text-secondary: #1d1d1f;
}
`

function injectCSS(css: string) {
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.colorScheme = ''
  document.head.querySelectorAll('style').forEach((s) => s.remove())
  injectCSS(LIGHT_CSS)
  injectCSS(DARK_CSS)
  injectCSS(HC_CSS)
})

function wrapper({ children }: { children: ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>
}

function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

describe('ThemeProvider', () => {
  it('sets data-theme attribute on the root element', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('dark'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    act(() => result.current.setTheme('light'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    act(() => result.current.setTheme('high-contrast'))
    expect(document.documentElement.getAttribute('data-theme')).toBe('high-contrast')
  })

  it('persists theme to localStorage', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('dark'))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark')

    act(() => result.current.setTheme('high-contrast'))
    expect(localStorage.getItem(STORAGE_KEY)).toBe('high-contrast')
  })

  it('toggleTheme switches between light and dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('light'))
    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('dark')

    act(() => result.current.toggleTheme())
    expect(result.current.theme).toBe('light')
  })

  it('sets colorScheme for high-contrast', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('high-contrast'))
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })
})

describe('CSS variable integration', () => {
  it('uses light theme values when data-theme is light', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('light'))
    expect(getCSSVar('--surface-1')).toBe('#ffffff')
    expect(getCSSVar('--text-primary')).toBe('#1d1d1f')
  })

  it('uses dark theme values when data-theme is dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('dark'))
    expect(getCSSVar('--surface-1')).toBe('#1c1c1e')
    expect(getCSSVar('--text-primary')).toBe('#f5f5f7')
  })

  it('uses high-contrast values when data-theme is high-contrast', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('high-contrast'))
    expect(getCSSVar('--surface-1')).toBe('#ffffff')
    expect(getCSSVar('--text-primary')).toBe('#000000')
    expect(getCSSVar('--text-secondary')).toBe('#1d1d1f')
  })

  it('transitions between themes correctly', () => {
    const { result } = renderHook(() => useTheme(), { wrapper })

    act(() => result.current.setTheme('light'))
    expect(getCSSVar('--surface-1')).toBe('#ffffff')

    act(() => result.current.setTheme('dark'))
    expect(getCSSVar('--surface-1')).toBe('#1c1c1e')

    act(() => result.current.setTheme('light'))
    expect(getCSSVar('--surface-1')).toBe('#ffffff')
  })
})

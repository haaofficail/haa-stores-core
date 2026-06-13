'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'

export type Theme = 'light' | 'dark' | 'high-contrast'

export interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  resolvedTheme: Theme
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'

  if (window.matchMedia('(prefers-contrast: more)').matches) {
    return 'high-contrast'
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  root.style.colorScheme = theme === 'high-contrast' ? 'dark' : theme
}

export function ThemeProvider({
  children,
  defaultTheme,
}: {
  children: ReactNode
  defaultTheme?: Theme
}) {
  const [theme, setThemeState] = useState<Theme>(defaultTheme ?? getSystemTheme)

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next)
    applyTheme(next)
    try {
      localStorage.setItem('haa-theme', next)
    } catch {}
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light')
  }, [theme, setTheme])

  // Resolved theme — high-contrast stays as-is
  const resolvedTheme = theme

  // Sync with system preference changes
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const contrast = window.matchMedia('(prefers-contrast: more)')

    const onSystemChange = () => {
      const stored = localStorage.getItem('haa-theme') as Theme | null
      if (!stored) {
        setThemeState(getSystemTheme())
      }
    }

    media.addEventListener('change', onSystemChange)
    contrast.addEventListener('change', onSystemChange)

    // Apply on mount
    applyTheme(theme)

    return () => {
      media.removeEventListener('change', onSystemChange)
      contrast.removeEventListener('change', onSystemChange)
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}

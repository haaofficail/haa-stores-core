import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { SystemThemeContextValue } from './tokens';

const SystemThemeContext = createContext<SystemThemeContextValue | null>(null);

function useSystemTheme(): SystemThemeContextValue {
  const ctx = useContext(SystemThemeContext);
  if (!ctx) {
    throw new Error('useSystemTheme must be used within SystemThemeProvider');
  }
  return ctx;
}

function detectSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

interface SystemThemeProviderProps {
  children: ReactNode;
  defaultMode?: 'light' | 'dark';
}

/**
 * SystemThemeProvider — wraps the merchant/admin dashboard.
 *
 * Rules:
 * - Applies .haa-system-theme class to its wrapper div
 * - Applies data-haa-theme="dark" when in dark mode
 * - NEVER writes to document.documentElement
 * - NEVER reads storefront theme variables
 * - Isolated from storefront theme scope
 */
export function SystemThemeProvider({ children, defaultMode }: SystemThemeProviderProps) {
  const [mode, setMode] = useState<'light' | 'dark'>(() => defaultMode ?? detectSystemPreference());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      setMode(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <SystemThemeContext.Provider value={{ mode, setMode }}>
      <div
        className="haa-system-theme"
        data-theme-scope="system"
        data-haa-theme={mode}
        style={{ minHeight: '100vh' }}
      >
        {children}
      </div>
    </SystemThemeContext.Provider>
  );
}

export { useSystemTheme };

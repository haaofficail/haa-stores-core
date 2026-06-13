import { createContext, useContext, type ReactNode } from 'react';
import { type ThemeConfig } from '@haa/storefront-themes';

const ThemeContext = createContext<ThemeConfig | null>(null);

export function ThemeProvider({ value, children }: { value: ThemeConfig | null; children: ReactNode }) {
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useStorefrontTheme() {
  return useContext(ThemeContext);
}

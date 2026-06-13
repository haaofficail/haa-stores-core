import type { Metadata } from 'next'
import { ThemeProvider } from '@haa/theme-react'
import '@/styles/globals.css'
import '@haa/tokens'

export const metadata: Metadata = {
  title: 'HAA Design System',
  description: 'Apple-grade, philosophy-first design system for web',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var theme = localStorage.getItem('haa-theme');
                if (!theme) {
                  theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  if (window.matchMedia('(prefers-contrast: more)').matches) theme = 'high-contrast';
                }
                document.documentElement.setAttribute('data-theme', theme);
                document.documentElement.style.colorScheme = theme === 'high-contrast' ? 'dark' : theme;
              })();
            `,
          }}
        />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}

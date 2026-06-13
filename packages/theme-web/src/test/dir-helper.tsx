import { type ReactNode } from 'react'
import { DirectionProvider } from '@/lib/direction-context'

export function withDir(ui: ReactNode, dir: 'ltr' | 'rtl' = 'ltr') {
  return <DirectionProvider defaultDir={dir}>{ui}</DirectionProvider>
}

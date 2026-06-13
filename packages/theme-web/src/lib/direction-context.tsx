'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  type ReactNode,
} from 'react'

type Direction = 'ltr' | 'rtl'

interface DirectionContextValue {
  dir: Direction
  isRTL: boolean
  setDir: (dir: Direction) => void
}

const DirectionContext = createContext<DirectionContextValue | null>(null)

export function DirectionProvider({
  children,
  defaultDir,
}: {
  children: ReactNode
  defaultDir?: Direction
}) {
  const [dir, setDir] = useState<Direction>(defaultDir ?? 'ltr')

  useEffect(() => {
    document.documentElement.dir = dir
  }, [dir])

  const value = useMemo(
    () => ({ dir, isRTL: dir === 'rtl', setDir }),
    [dir],
  )

  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  )
}

export function useDirection(): DirectionContextValue {
  const ctx = useContext(DirectionContext)
  if (!ctx) {
    throw new Error('useDirection must be used within a DirectionProvider')
  }
  return ctx
}

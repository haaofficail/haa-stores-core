import { describe, it, expect } from 'vitest'
import { getElevationStyle, ElevationProvider, useElevation } from './elevation'
import { render, screen } from '@testing-library/react'

describe('getElevationStyle', () => {
  it('returns level 0 with no shadow', () => {
    const styles = getElevationStyle(0)
    expect(styles.boxShadow).toBe('none')
  })

  it('returns a shadow for level 1', () => {
    const styles = getElevationStyle(1)
    expect(styles.boxShadow).not.toBe('none')
  })

  it('returns backdrop filter for level 2', () => {
    const styles = getElevationStyle(2)
    expect(styles.backdropFilter).toBe('blur(60px)')
  })

  it('returns proper zIndex for level 4 (modal)', () => {
    const styles = getElevationStyle(4)
    expect(styles.zIndex).toBe('var(--z-modal)')
  })

  it('returns proper zIndex for level 5 (toast)', () => {
    const styles = getElevationStyle(5)
    expect(styles.zIndex).toBe('var(--z-toast)')
  })
})

describe('ElevationProvider', () => {
  it('provides getStyles', () => {
    function Test() {
      const { getStyles } = useElevation()
      const s = getStyles(0)
      return <div data-testid="style">{s.boxShadow}</div>
    }
    render(<ElevationProvider><Test /></ElevationProvider>)
    expect(screen.getByTestId('style')).toBeInTheDocument()
  })

  it('throws without provider', () => {
    function Test() {
      useElevation()
      return null
    }
    expect(() => render(<Test />)).toThrow()
  })
})

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DirectionProvider, useDirection } from './direction-context'

function TestChild() {
  const { dir, isRTL, setDir } = useDirection()
  return (
    <div>
      <span data-testid="dir">{dir}</span>
      <span data-testid="isRTL">{String(isRTL)}</span>
      <button data-testid="set-rtl" onClick={() => setDir('rtl')}>Set RTL</button>
    </div>
  )
}

describe('DirectionProvider', () => {
  it('defaults to ltr', () => {
    const { getByTestId } = render(
      <DirectionProvider>
        <TestChild />
      </DirectionProvider>
    )
    expect(getByTestId('dir').textContent).toBe('ltr')
    expect(getByTestId('isRTL').textContent).toBe('false')
  })

  it('accepts defaultDir prop', () => {
    const { getByTestId } = render(
      <DirectionProvider defaultDir="rtl">
        <TestChild />
      </DirectionProvider>
    )
    expect(getByTestId('dir').textContent).toBe('rtl')
    expect(getByTestId('isRTL').textContent).toBe('true')
  })

  it('sets dir on document element', () => {
    render(
      <DirectionProvider defaultDir="rtl">
        <TestChild />
      </DirectionProvider>
    )
    expect(document.documentElement.dir).toBe('rtl')
  })

  it('throws without DirectionProvider', () => {
    expect(() => render(<TestChild />)).toThrow()
  })
})

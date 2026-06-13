import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Button } from '@/components/ui/Button'

describe('Button', () => {
  it('renders children', () => {
    const { getByText } = render(<Button>Click me</Button>)
    expect(getByText('Click me')).toBeInTheDocument()
  })

  it('has min-height for touch target', () => {
    const { container } = render(<Button>OK</Button>)
    const btn = container.firstChild as HTMLElement
    expect(btn.style.minHeight).toBe('var(--touch-target-min)')
  })

  it('is disabled when disabled prop is set', () => {
    const { container } = render(<Button disabled>Disabled</Button>)
    const btn = container.firstChild as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('renders all variants without error', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger'] as const
    for (const v of variants) {
      const { container } = render(<Button variant={v}>{v}</Button>)
      expect(container.firstChild).toBeInTheDocument()
    }
  })
})

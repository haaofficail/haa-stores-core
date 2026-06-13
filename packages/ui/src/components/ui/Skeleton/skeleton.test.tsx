import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Skeleton } from './index'

describe('Skeleton', () => {
  it('renders', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('has aria-hidden="true"', () => {
    const { container } = render(<Skeleton />)
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('accepts custom width and height', () => {
    const { container } = render(<Skeleton width={200} height={40} />)
    const el = container.firstChild as HTMLElement
    expect(el.style.width).toBe('200px')
    expect(el.style.height).toBe('40px')
  })
})

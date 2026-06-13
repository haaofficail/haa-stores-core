import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Icon } from './index'

describe('Icon', () => {
  it('renders with default props', () => {
    const { container } = render(<Icon><svg><circle /></svg></Icon>)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders all sizes', () => {
    const sizes = ['small', 'medium', 'large', 'xlarge'] as const
    for (const s of sizes) {
      const { container } = render(<Icon size={s}><svg><circle /></svg></Icon>)
      expect(container.firstChild).toBeInTheDocument()
    }
  })
})

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Divider } from './index'

describe('Divider', () => {
  it('renders', () => {
    const { container } = render(<Divider />)
    expect(container.firstChild).toBeInTheDocument()
  })

  it('renders all variants', () => {
    const variants = ['full', 'inset', 'thin'] as const
    for (const v of variants) {
      const { container } = render(<Divider variant={v} />)
      expect(container.firstChild).toBeInTheDocument()
    }
  })
})

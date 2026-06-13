import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Card } from '@/components/ui/Card'

describe('Card', () => {
  it('renders children', () => {
    const { getByText } = render(<Card>Content</Card>)
    expect(getByText('Content')).toBeInTheDocument()
  })

  it('renders all variants', () => {
    const variants = ['elevated', 'filled', 'outlined'] as const
    for (const v of variants) {
      const { container } = render(<Card variant={v}>{v}</Card>)
      expect(container.firstChild).toBeInTheDocument()
    }
  })
})

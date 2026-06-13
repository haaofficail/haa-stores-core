import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Badge } from '@/components/ui/Badge'

describe('Badge', () => {
  it('renders children', () => {
    const { getByText } = render(<Badge>New</Badge>)
    expect(getByText('New')).toBeInTheDocument()
  })

  it('renders all variants', () => {
    const variants = ['success', 'warning', 'danger', 'info', 'neutral'] as const
    for (const v of variants) {
      const { container } = render(<Badge variant={v}>{v}</Badge>)
      expect(container.firstChild).toBeInTheDocument()
    }
  })
})

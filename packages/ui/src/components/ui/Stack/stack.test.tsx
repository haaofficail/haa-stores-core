import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Stack } from './index'

describe('Stack', () => {
  it('renders children', () => {
    const { getByText } = render(<Stack><span>item</span></Stack>)
    expect(getByText('item')).toBeInTheDocument()
  })

  it('renders as column by default', () => {
    const { container } = render(<Stack>content</Stack>)
    expect(container.firstChild).toHaveStyle('flex-direction: column')
  })

  it('renders as row when specified', () => {
    const { container } = render(<Stack direction="row">content</Stack>)
    expect(container.firstChild).toHaveStyle('flex-direction: row')
  })
})

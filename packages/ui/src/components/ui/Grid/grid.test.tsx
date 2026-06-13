import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Grid } from './index'

describe('Grid', () => {
  it('renders children', () => {
    const { getByText } = render(<Grid><span>item</span></Grid>)
    expect(getByText('item')).toBeInTheDocument()
  })

  it('renders with 2 columns by default', () => {
    const { container } = render(<Grid>content</Grid>)
    expect(container.firstChild).toHaveStyle('grid-template-columns: repeat(2, 1fr)')
  })

  it('renders with custom columns', () => {
    const { container } = render(<Grid columns={3}>content</Grid>)
    expect(container.firstChild).toHaveStyle('grid-template-columns: repeat(3, 1fr)')
  })
})

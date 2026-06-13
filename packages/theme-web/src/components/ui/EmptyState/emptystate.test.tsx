import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { EmptyState } from './index'

describe('EmptyState', () => {
  it('renders title', () => {
    const { getByText } = render(<EmptyState title="No items" />)
    expect(getByText('No items')).toBeInTheDocument()
  })

  it('renders description', () => {
    const { getByText } = render(<EmptyState title="x" description="Nothing here yet" />)
    expect(getByText('Nothing here yet')).toBeInTheDocument()
  })

  it('renders action', () => {
    const { getByText } = render(<EmptyState title="x" action={<button>Add</button>} />)
    expect(getByText('Add')).toBeInTheDocument()
  })
})

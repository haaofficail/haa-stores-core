import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sheet } from './index'

describe('Sheet', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Sheet open={false} onClose={() => {}}>content</Sheet>)
    expect(container.innerHTML).toBe('')
  })

  it('renders content when open', () => {
    render(<Sheet open={true} onClose={() => {}}>hello sheet</Sheet>)
    expect(screen.getByText('hello sheet')).toBeInTheDocument()
  })

  it('renders title', () => {
    render(<Sheet open={true} onClose={() => {}} title="Sheet Title">x</Sheet>)
    expect(screen.getByText('Sheet Title')).toBeInTheDocument()
  })
})

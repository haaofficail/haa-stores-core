import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Toast } from './index'

describe('Toast', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Toast open={false} onClose={() => {}} message="hi" />)
    expect(container.innerHTML).toBe('')
  })

  it('renders message when open', () => {
    render(<Toast open={true} onClose={() => {}} message="hello" />)
    expect(screen.getByText('hello')).toBeInTheDocument()
  })

  it('has role="alert"', () => {
    render(<Toast open={true} onClose={() => {}} message="hi" />)
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  it.each(['success', 'warning', 'danger', 'info'] as const)('renders %s variant', (v) => {
    render(<Toast open={true} onClose={() => {}} message={v} variant={v} />)
    expect(screen.getByText(v)).toBeInTheDocument()
  })

  it('renders action button', () => {
    const action = { label: 'Undo', onClick: vi.fn() }
    render(<Toast open={true} onClose={() => {}} message="hi" action={action} />)
    expect(screen.getByText('Undo')).toBeInTheDocument()
  })
})

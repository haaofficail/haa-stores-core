import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Modal } from './index'

describe('Modal', () => {
  it('renders nothing when closed', () => {
    const { container } = render(<Modal open={false} onClose={() => {}}>content</Modal>)
    expect(container.innerHTML).toBe('')
  })

  it('renders content when open', () => {
    render(<Modal open={true} onClose={() => {}}>hello modal</Modal>)
    expect(screen.getByText('hello modal')).toBeInTheDocument()
  })

  it('has role="dialog"', () => {
    render(<Modal open={true} onClose={() => {}}>x</Modal>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('has aria-modal="true"', () => {
    const { baseElement } = render(<Modal open={true} onClose={() => {}}>x</Modal>)
    expect(baseElement.querySelector('[aria-modal="true"]')).toBeInTheDocument()
  })

  it('renders title', () => {
    render(<Modal open={true} onClose={() => {}} title="My Title">x</Modal>)
    expect(screen.getByText('My Title')).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { TextArea } from './index'

describe('TextArea', () => {
  it('renders textarea element', () => {
    const { container } = render(<TextArea />)
    expect(container.querySelector('textarea')).toBeInTheDocument()
  })

  it('renders label', () => {
    const { getByText } = render(<TextArea label="Bio" />)
    expect(getByText('Bio')).toBeInTheDocument()
  })

  it('renders error message', () => {
    const { getByText } = render(<TextArea error="Too long" />)
    expect(getByText('Too long')).toBeInTheDocument()
  })

  it('marks textarea as invalid when error exists', () => {
    const { container } = render(<TextArea error="Invalid" />)
    expect(container.querySelector('textarea')).toHaveAttribute('aria-invalid', 'true')
  })
})

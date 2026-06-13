import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Input } from './index'

describe('Input', () => {
  it('renders input element', () => {
    const { container } = render(<Input />)
    expect(container.querySelector('input')).toBeInTheDocument()
  })

  it('renders label', () => {
    const { getByText } = render(<Input label="Email" />)
    expect(getByText('Email')).toBeInTheDocument()
  })

  it('renders error message', () => {
    const { getByText } = render(<Input error="Required" />)
    expect(getByText('Required')).toBeInTheDocument()
  })

  it('marks input as invalid when error exists', () => {
    const { container } = render(<Input error="Invalid" id="test" />)
    expect(container.querySelector('input')).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders icon', () => {
    const { container } = render(<Input icon={<span>🔍</span>} />)
    expect(container.querySelector('span')).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Container } from './index'

describe('Container', () => {
  it('renders children', () => {
    const { getByText } = render(<Container>content</Container>)
    expect(getByText('content')).toBeInTheDocument()
  })

  it('has max-width', () => {
    const { container } = render(<Container>content</Container>)
    expect(container.firstChild).toHaveStyle('max-width: var(--container-max-width, 1200px)')
  })

  it('centers with marginInline auto', () => {
    const { container } = render(<Container>content</Container>)
    expect(container.firstChild).toHaveStyle('margin-inline: auto')
  })

  it('uses paddingInline', () => {
    const { container } = render(<Container>content</Container>)
    expect(container.firstChild).toHaveStyle('padding-inline: var(--spacing-4)')
  })
})

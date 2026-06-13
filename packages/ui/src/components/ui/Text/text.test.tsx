import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Text } from '@/components/ui/Text'

describe('Text', () => {
  it('renders children', () => {
    const { getByText } = render(<Text>Hello</Text>)
    expect(getByText('Hello')).toBeInTheDocument()
  })

  it('renders as specified element', () => {
    const { container } = render(<Text as="h1">Heading</Text>)
    expect(container.querySelector('h1')).toBeInTheDocument()
  })

  it('uses correct variant styles', () => {
    const { container } = render(<Text variant="largeTitle">Large</Text>)
    const el = container.firstChild as HTMLElement
    expect(el.style.fontSize).toBe('var(--typography-large-title-size)')
  })
})

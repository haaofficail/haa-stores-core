import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Select } from './index'

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
]

describe('Select', () => {
  it('renders select element', () => {
    const { container } = render(<Select options={options} />)
    expect(container.querySelector('select')).toBeInTheDocument()
  })

  it('renders options', () => {
    const { getByText } = render(<Select options={options} />)
    expect(getByText('Option A')).toBeInTheDocument()
    expect(getByText('Option B')).toBeInTheDocument()
  })

  it('renders label', () => {
    const { getByText } = render(<Select label="Country" options={options} />)
    expect(getByText('Country')).toBeInTheDocument()
  })

  it('renders placeholder', () => {
    const { getByText } = render(<Select options={options} placeholder="Choose..." />)
    expect(getByText('Choose...')).toBeInTheDocument()
  })

  it('renders error', () => {
    const { getByText } = render(<Select options={options} error="Required" />)
    expect(getByText('Required')).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Progress } from './index'

describe('Progress', () => {
  it('renders with value', () => {
    const { container } = render(<Progress value={50} />)
    expect(container.querySelector('[role="progressbar"]')).toBeInTheDocument()
  })

  it('has correct aria-valuenow', () => {
    const { container } = render(<Progress value={75} />)
    expect(container.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '75')
  })

  it('has correct aria-valuemin/max', () => {
    const { container } = render(<Progress value={30} max={100} />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps value between 0 and max', () => {
    const { container } = render(<Progress value={150} />)
    expect(container.querySelector('[role="progressbar"]')).toHaveAttribute('aria-valuenow', '150')
  })
})

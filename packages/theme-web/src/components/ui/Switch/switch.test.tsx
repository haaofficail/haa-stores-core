import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Switch } from '@/components/ui/Switch'

describe('Switch — accessibility', () => {
  it('has role="switch"', () => {
    const { container } = render(<Switch />)
    expect(container.querySelector('[role="switch"]')).toBeInTheDocument()
  })

  it('has aria-checked', () => {
    const { container } = render(<Switch defaultChecked />)
    expect(container.querySelector('[aria-checked="true"]')).toBeInTheDocument()
  })
})

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { withDir } from '@/test/dir-helper'
import { NavigationBar } from './index'

describe('NavigationBar', () => {
  it('renders title', () => {
    const { getByText } = render(withDir(<NavigationBar title="My App" />))
    expect(getByText('My App')).toBeInTheDocument()
  })

  it('renders as large title by default', () => {
    const { container } = render(withDir(<NavigationBar title="Large" />))
    const h1 = container.querySelector('h1')
    expect(h1).toBeInTheDocument()
    expect(h1?.style.fontSize).toBe('var(--typography-large-title-size)')
  })

  it('renders as small title when largeTitle=false', () => {
    const { container } = render(withDir(<NavigationBar title="Small" largeTitle={false} />))
    const title = container.querySelector('h1')
    expect(title?.style.fontSize).toBe('var(--typography-title3-size)')
  })
})

describe('NavigationBar (LTR)', () => {
  it('renders left action on the left', () => {
    const { container } = render(
      withDir(<NavigationBar title="x" leftAction={<span>Back</span>} />, 'ltr')
    )
    const flexDivs = container.querySelectorAll('div[style*="flex: 1"]')
    expect(flexDivs[0]?.textContent).toBe('Back')
  })

  it('renders right action on the right with flex-end', () => {
    const { container } = render(
      withDir(<NavigationBar title="x" rightAction={<span>Edit</span>} />, 'ltr')
    )
    const rightDiv = container.querySelector('div[style*="flex-end"]')
    expect(rightDiv?.textContent).toBe('Edit')
  })
})

describe('NavigationBar (RTL)', () => {
  it('renders right action on the left side', () => {
    const { container } = render(
      withDir(<NavigationBar title="x" rightAction={<span>رجوع</span>} />, 'rtl')
    )
    const flexDivs = container.querySelectorAll('div[style*="flex: 1"]')
    expect(flexDivs[0]?.textContent).toBe('رجوع')
  })

  it('renders left action on the right with flex-start', () => {
    const { container } = render(
      withDir(<NavigationBar title="x" leftAction={<span>تعديل</span>} />, 'rtl')
    )
    const rightDiv = container.querySelector('div[style*="flex-start"]')
    expect(rightDiv?.textContent).toBe('تعديل')
  })
})

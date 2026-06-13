import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { withDir } from '@/test/dir-helper'
import { TabBar } from './index'

const tabs = [
  { id: 'home', label: 'Home' },
  { id: 'search', label: 'Search' },
  { id: 'profile', label: 'Profile' },
]

describe('TabBar', () => {
  it('renders all tabs', () => {
    const { getByText } = render(withDir(<TabBar tabs={tabs} activeTab="home" onTabChange={() => {}} />))
    expect(getByText('Home')).toBeInTheDocument()
    expect(getByText('Search')).toBeInTheDocument()
    expect(getByText('Profile')).toBeInTheDocument()
  })

  it('has role="tablist"', () => {
    const { container } = render(withDir(<TabBar tabs={tabs} activeTab="home" onTabChange={() => {}} />))
    expect(container.querySelector('[role="tablist"]')).toBeInTheDocument()
  })

  it('marks active tab with aria-selected', () => {
    const { container } = render(withDir(<TabBar tabs={tabs} activeTab="search" onTabChange={() => {}} />))
    const active = container.querySelector('[aria-selected="true"]')
    expect(active).toBeInTheDocument()
    expect(active?.textContent).toBe('Search')
  })

  it('calls onTabChange on click', () => {
    const fn = vi.fn()
    const { getByText } = render(withDir(<TabBar tabs={tabs} activeTab="home" onTabChange={fn} />))
    fireEvent.click(getByText('Search'))
    expect(fn).toHaveBeenCalledWith('search')
  })
})

describe('TabBar (RTL)', () => {
  it('uses row-reverse flex direction', () => {
    const { container } = render(withDir(<TabBar tabs={tabs} activeTab="home" onTabChange={() => {}} />, 'rtl'))
    const nav = container.querySelector('[role="tablist"]') as HTMLElement
    expect(nav.style.flexDirection).toBe('row-reverse')
  })
})

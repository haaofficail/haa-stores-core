/**
 * Page Template Contract
 *
 * A page template describes which sections render on a page and how
 * the page is laid out (single column, sidebar, etc.).
 */

import type { SectionInstance } from './section'

export type SupportedPage =
  | 'home'
  | 'product'
  | 'category'
  | 'cart'
  | 'checkout'
  | 'account'
  | 'track'
  | 'about'
  | 'contact'

export type PageLayout =
  | '1col'
  | '2col-sidebar-left'
  | '2col-sidebar-right'
  | 'split-50-50'

export type PageDensity = 'compact' | 'regular' | 'comfy'

export interface PageTemplate {
  page: SupportedPage
  layout: PageLayout
  density: PageDensity
  sections: SectionInstance[]
}

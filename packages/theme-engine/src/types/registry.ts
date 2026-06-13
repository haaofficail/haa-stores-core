/**
 * Registry Contract
 *
 * The registry holds all installed themes and their full definitions.
 */

import type { ThemeExperienceContract } from './theme'
import type { ThemeTokens } from './tokens'
import type { PageTemplate } from './page'

export interface ThemeDefinition {
  /** Public-facing contract */
  contract: ThemeExperienceContract
  /** Visual tokens */
  tokens: ThemeTokens
  /** Page templates (one per supported page) */
  pages: Record<string, PageTemplate>
}

export interface RegistryEntry {
  key: string
  contract: ThemeExperienceContract
}

export interface RegistryManifest {
  total: number
  free: number
  premium: number
  byCategory: Record<string, number>
}

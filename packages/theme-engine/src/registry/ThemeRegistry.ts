/**
 * Theme Registry — the central catalog of installed themes.
 *
 * PR 1 (Foundation):
 *   - Pure data structure: register, get, list, has
 *   - No filesystem loading, no React, no UI
 *   - Tests verify registration, lookup, and uniqueness
 *
 * PR 2+ (Pure Commerce Theme Product):
 *   - File-based theme loading
 *   - Hot-reload in dev
 */

import type { ThemeDefinition, RegistryEntry, RegistryManifest } from '../types/registry'
import { validateThemeContract } from '../validation'

export class ThemeRegistry {
  private themes: Map<string, ThemeDefinition> = new Map()
  private registrationOrder: string[] = []

  /**
   * Register a theme. Throws if invalid or duplicate.
   */
  register(theme: ThemeDefinition): void {
    if (this.themes.has(theme.contract.key)) {
      throw new Error(
        `Theme with key "${theme.contract.key}" is already registered`
      )
    }

    // Validate before storing
    const result = validateThemeContract(theme.contract)
    if (!result.ok) {
      throw new Error(
        `Invalid theme contract for "${theme.contract.key}":\n` +
          result.errors!.map((e) => `  - ${e.path}: ${e.message}`).join('\n')
      )
    }

    this.themes.set(theme.contract.key, theme)
    this.registrationOrder.push(theme.contract.key)
  }

  /**
   * Unregister a theme. Returns true if removed, false if not found.
   */
  unregister(key: string): boolean {
    const removed = this.themes.delete(key)
    if (removed) {
      this.registrationOrder = this.registrationOrder.filter((k) => k !== key)
    }
    return removed
  }

  /**
   * Get a full theme definition by key.
   */
  get(key: string): ThemeDefinition | undefined {
    return this.themes.get(key)
  }

  /**
   * Get just the public contract by key.
   */
  getContract(key: string) {
    return this.themes.get(key)?.contract
  }

  /**
   * Check if a theme is registered.
   */
  has(key: string): boolean {
    return this.themes.has(key)
  }

  /**
   * List all registered themes (public contracts only).
   */
  list(): RegistryEntry[] {
    return this.registrationOrder.map((key) => {
      const theme = this.themes.get(key)!
      return { key, contract: theme.contract }
    })
  }

  /**
   * List full theme definitions.
   */
  listFull(): ThemeDefinition[] {
    return this.registrationOrder.map((key) => this.themes.get(key)!)
  }

  /**
   * Manifest with counts.
   */
  manifest(): RegistryManifest {
    const entries = this.list()
    const byCategory: Record<string, number> = {}
    let free = 0
    let premium = 0

    for (const { contract } of entries) {
      byCategory[contract.category] = (byCategory[contract.category] ?? 0) + 1
      if (contract.priceType === 'free') free++
      else premium++
    }

    return {
      total: entries.length,
      free,
      premium,
      byCategory,
    }
  }

  /**
   * Number of registered themes.
   */
  get size(): number {
    return this.themes.size
  }

  /**
   * Clear all registered themes. Useful in tests.
   */
  clear(): void {
    this.themes.clear()
    this.registrationOrder = []
  }
}

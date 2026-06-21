import type { CSSProperties } from 'react'

export type LogicalSide = 'start' | 'end'

/**
 * Maps a physical CSS value to its logical equivalent for the current direction.
 * Uses CSS logical properties which automatically respect the dir attribute.
 */

export function borderDirection(side: 'left' | 'right'): string {
  return side === 'left' ? 'inline-start' : 'inline-end'
}

/**
 * Style helper: converts marginLeft / marginRight to logical properties.
 */
export function marginInline(start: string | number, end?: string | number): CSSProperties {
  return {
    marginInline: end ? undefined : start,
    marginInlineStart: start,
    ...(end !== undefined ? { marginInlineEnd: end } : {}),
  }
}

/**
 * Style helper: converts paddingLeft / paddingRight to logical properties.
 */
export function paddingInline(start: string | number, end?: string | number): CSSProperties {
  return {
    paddingInline: end ? undefined : start,
    paddingInlineStart: start,
    ...(end !== undefined ? { paddingInlineEnd: end } : {}),
  }
}

/**
 * Style helper: converts left/right positioning to logical properties.
 */
export function insetInline(start: string | number, end?: string | number): CSSProperties {
  return {
    insetInlineStart: start,
    ...(end !== undefined ? { insetInlineEnd: end } : {}),
  }
}

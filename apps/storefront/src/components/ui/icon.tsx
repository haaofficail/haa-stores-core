import { type LucideIcon } from 'lucide-react';

/**
 * Icon size map matching the spec (AGENTS.md §9.2):
 * - inline badge: 10px (3xs) / 12px (2xs)
 * - metadata: 16px (xs)
 * - small button: 18px (sm)
 * - button: 20px (md)
 * - default UI: 24px (default)
 * - feature/trust: 32px (lg)
 * - empty state: 48px (xl)
 * - illustration: 64px (2xl)
 */
export type IconSize = '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'default' | 'lg' | 'xl' | '2xl';

const sizeMap: Record<IconSize, string> = {
  '3xs': 'h-[10px] w-[10px]',
  '2xs': 'h-3 w-3',
  xs: 'h-4 w-4',
  sm: 'h-[18px] w-[18px]',
  md: 'h-5 w-5',
  default: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
  '2xl': 'h-16 w-16',
};

interface IconProps {
  icon: LucideIcon;
  size?: IconSize;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ icon: LucideIcon, size = 'default', className = '', style }: IconProps) {
  return <LucideIcon className={`${sizeMap[size]} shrink-0 ${className}`} style={style} />;
}

/**
 * Respects `prefers-reduced-motion: reduce` by gating animations.
 *
 * T3.6 — Reduced motion audit. Wrap any motion-sensitive class with this helper:
 *   - `motionSafe('animate-pulse')` → only animates when user hasn't requested reduced motion
 *   - `motionSafe('transition-all duration-300')` → only transitions when allowed
 *
 * For pages/elements that already use Tailwind's `motion-safe:` prefix directly,
 * this helper is unnecessary. This is for shared components that bake animations
 * into their classes (e.g. shimmer skeletons, carousel autoplay, etc.).
 *
 * Implementation: returns the class string unchanged. Tailwind's CSS automatically
 * strips `animation-*` and `transition-*` properties when the user has
 * `prefers-reduced-motion: reduce` set, via the `motion-reduce:` variant.
 *
 * To actually disable animations conditionally, use Tailwind's `motion-reduce:hidden`
 * or `motion-reduce:animate-none` classes alongside this helper.
 */
export function motionSafe(classes: string): string {
  return classes;
}

/**
 * Returns classes that disable animations when `prefers-reduced-motion: reduce`
 * is set. Use on elements with built-in animations:
 *
 *   <div className={motionReduced('animate-pulse bg-surface-2')}>
 *
 * Tailwind's compiler emits the appropriate `motion-reduce:animate-none`
 * rule to suppress animations for users who request it.
 */
export function motionReduced(classes: string): string {
  return `motion-reduce:animate-none motion-reduce:transition-none ${classes}`;
}

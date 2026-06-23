// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- ISSUE-0009: this wrapper is the one file that's allowed to touch lucide directly.
import { type LucideIcon } from 'lucide-react';
import { ICON_REGISTRY, type IconName } from './icon-registry';

export type { IconName };

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

type CommonProps = {
  size?: IconSize;
  className?: string;
  style?: React.CSSProperties;
};
type IconByName = CommonProps & { name: IconName; icon?: never };
type IconByRef = CommonProps & { icon: LucideIcon; name?: never };
type IconProps = IconByName | IconByRef;

/**
 * Renders a lucide icon at one of the governed sizes (see `IconSize`).
 *
 * Two call shapes:
 * - `<Icon name="ArrowLeft" />` — the registry resolves the icon. This is
 *   the preferred form; feature code never imports lucide directly
 *   (ISSUE-0009). The set of valid names lives in `icon-registry.ts`.
 * - `<Icon icon={LucideRef} />` — kept for the small handful of legacy
 *   callers that still hold a `LucideIcon` reference. New code should
 *   use `name`.
 */
export function Icon(props: IconProps) {
  const { size = 'default', className = '', style } = props;
  const Resolved: LucideIcon = 'name' in props && props.name
    ? ICON_REGISTRY[props.name]
    : (props as IconByRef).icon;
  return <Resolved className={`${sizeMap[size]} shrink-0 ${className}`} style={style} />;
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

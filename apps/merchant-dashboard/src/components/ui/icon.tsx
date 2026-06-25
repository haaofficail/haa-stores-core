// Merchant dashboard Icon wrapper — mirrors the storefront pattern
// (apps/storefront/src/components/ui/icon.tsx) so the same icon size
// governance (AGENTS.md §9.2 + icon-standards.ts) applies here.
//
// SANCTIONED WRAPPER — ISSUE-0009. Going forward, new merchant-dashboard
// files MUST use this wrapper instead of importing `lucide-react`
// directly. This is the ONE permitted direct lucide import for the
// merchant-dashboard app — same convention as storefront. The
// `tests/lucide-migration-progress.test.ts` ceiling explicitly excludes
// this file from the count (WRAPPER_FILES set).
//
// Two call shapes:
//   <Icon name="Bell" />                  — registry name (preferred; new code)
//   <Icon icon={Bell} />                  — lucide ref (legacy; in-flight migration)
//   <Icon name="Bell" size="md" />
//   <Icon name="Bell" className="…" />
//
// Size tokens (matches storefront for cross-app consistency):
//   3xs  10px    inline badge
//   2xs  12px    tiny inline
//   xs   16px    metadata
//   sm   18px    small button
//   md   20px    button
//   default 24px most UI (default)
//   lg   32px    feature
//   xl   48px    empty state
//   2xl  64px    illustration

import { type LucideIcon } from 'lucide-react';
import { MERCHANT_ICON_REGISTRY, type MerchantIconName } from './icon-registry';

export type { MerchantIconName };

export type IconSize =
  | '3xs' | '2xs' | 'xs' | 'sm' | 'md' | 'default' | 'lg' | 'xl' | '2xl';

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
  'aria-hidden'?: boolean | 'true' | 'false';
  'aria-label'?: string;
};
type IconByName = CommonProps & { name: MerchantIconName; icon?: never };
type IconByRef = CommonProps & { icon: LucideIcon; name?: never };
type IconProps = IconByName | IconByRef;

export function Icon(props: IconProps) {
  const { size = 'default', className = '', style, ...rest } = props;
  const Resolved: LucideIcon = 'name' in props && props.name
    ? MERCHANT_ICON_REGISTRY[props.name]
    : (props as IconByRef).icon;
  // Strip discriminant props before spreading to the DOM element.
  const { name: _name, icon: _icon, ...domProps } = rest as Record<string, unknown>;
  void _name;
  void _icon;
  return (
    <Resolved
      className={`${sizeMap[size]} shrink-0 ${className}`}
      style={style}
      {...domProps}
    />
  );
}

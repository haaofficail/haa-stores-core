import { type LucideIcon } from 'lucide-react';

/**
 * Icon size map matching the spec:
 * - inline badge: 12px (2xs)
 * - metadata: 16px (xs)
 * - small button: 18px (sm)
 * - button: 20px (md)
 * - default UI: 24px (default)
 * - feature/trust: 32px (lg)
 * - empty state: 48px (xl)
 * - illustration: 64px (2xl)
 */
export type IconSize = '2xs' | 'xs' | 'sm' | 'md' | 'default' | 'lg' | 'xl' | '2xl';

const sizeMap: Record<IconSize, string> = {
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

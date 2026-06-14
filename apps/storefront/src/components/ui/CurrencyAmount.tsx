import { SarIcon } from './SarIcon';

interface CurrencyAmountProps {
  amount?: number | string;
  value?: number | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: string;
  className?: string;
  decimals?: number;
}

const sizeMap = {
  xs: 'text-[11px]',
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl',
  xl: 'text-2xl',
};

const weightMap = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
};

function formatAmount(amount: number | string, decimals: number): string {
  return Number(amount).toFixed(decimals);
}

export function CurrencyAmount({ amount, value, size = 'md', weight = 'bold', color = 'text-black', className = '', decimals = 0 }: CurrencyAmountProps) {
  const displayValue = value ?? amount ?? 0;
  return (
    <span
      dir="ltr"
      className={`inline-flex items-center gap-1 whitespace-nowrap leading-none ${sizeMap[size]} ${weightMap[weight]} ${color} ${className}`}
    >
      <SarIcon />
      <span>{formatAmount(displayValue, decimals)}</span>
    </span>
  );
}

interface CurrencyStrikeProps {
  amount: number | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
  decimals?: number;
}

const strikeSizeMap = {
  xs: 'text-[10px]',
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export function CurrencyStrike({ amount, size = 'sm', color = 'text-red-500', className = '', decimals = 0 }: CurrencyStrikeProps) {
  return (
    <span
      dir="ltr"
      className={`inline-flex items-center gap-0.5 whitespace-nowrap leading-none ${strikeSizeMap[size]} ${color} line-through ${className}`}
    >
      <SarIcon />
      <span>{formatAmount(amount, decimals)}</span>
    </span>
  );
}

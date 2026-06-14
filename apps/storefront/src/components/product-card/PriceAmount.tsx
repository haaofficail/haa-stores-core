import { CurrencyAmount, CurrencyStrike } from '@/components/ui/CurrencyAmount';

interface PriceAmountProps {
  amount: number | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: string;
  className?: string;
}

export function PriceAmount({ amount, size = 'md', weight = 'bold', color = 'text-black', className = '' }: PriceAmountProps) {
  return <CurrencyAmount amount={amount} size={size} weight={weight} color={color} className={className} />;
}

interface PriceStrikeProps {
  amount: number | string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export function PriceStrike({ amount, size = 'sm', color = 'text-red-500', className = '' }: PriceStrikeProps) {
  return <CurrencyStrike amount={amount} size={size} color={color} className={className} />;
}
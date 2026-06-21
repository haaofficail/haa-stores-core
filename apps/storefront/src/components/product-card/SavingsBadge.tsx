import { CurrencyAmount } from '@/components/ui/CurrencyAmount';

interface SavingsBadgeProps {
  value: number;
  className?: string;
}

export function SavingsBadge({ value, className = '' }: SavingsBadgeProps) {
  if (value <= 0) return null;

  return (
    <span
      className={`inline-flex h-[24px] w-[96px] shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md bg-success-soft px-1.5 text-xs font-semibold leading-none text-success ${className}`}
    >
      <span className="shrink-0">وفّر</span>
      <CurrencyAmount value={value} className="text-xs font-semibold text-success" decimals={0} />
    </span>
  );
}

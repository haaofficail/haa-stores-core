interface BNPLBadgesProps {
  size?: 'sm' | 'md';
}

export function BNPLBadges({ size = 'sm' }: BNPLBadgesProps) {
  const logoClassName = size === 'md' ? 'h-4 w-auto' : 'h-2.5 w-auto';

  return (
    <div className={size === 'md' ? 'flex items-center gap-2' : 'flex items-center gap-1.5'}>
      <img
        src="/assets/payment-logos/tabby.svg"
        alt="Tabby"
        className={logoClassName}
      />
      <img
        src="/assets/payment-logos/tamara.svg"
        alt="Tamara"
        className={logoClassName}
      />
    </div>
  );
}

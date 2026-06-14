import { useState, useCallback } from 'react';
import { Icon } from '@/components/ui/icon';
import { ShoppingBag, Check } from 'lucide-react';

type ButtonState = 'default' | 'loading' | 'added' | 'disabled' | 'outOfStock';

interface AddToCartButtonProps {
  onAddToCart?: (product: any) => Promise<void>;
  product?: any;
  isOutOfStock?: boolean;
  state?: ButtonState;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  children?: React.ReactNode;
}

const sizeMap = {
  sm: { height: 'min-h-[32px]', text: 'text-xs', icon: '2xs', gap: 'gap-1', padding: 'px-2' },
  md: { height: 'min-h-[44px]', text: 'text-sm', icon: 'sm', gap: 'gap-1.5', padding: 'px-3' },
  lg: { height: 'min-h-[44px]', text: 'text-base', icon: 'md', gap: 'gap-2', padding: 'px-4' },
};

const variantMap = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98]',
  secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:scale-[0.98]',
  ghost: 'bg-transparent text-primary-500 hover:bg-primary-50 active:scale-[0.98]',
};

export function AddToCartButton({ 
  onAddToCart, 
  product, 
  isOutOfStock = false,
  state: controlledState,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled: controlledDisabled,
  children
}: AddToCartButtonProps) {
  const [internalState, setInternalState] = useState<ButtonState>('default');
  const effectiveState = controlledState || internalState;
  const effectiveDisabled = controlledDisabled || effectiveState === 'loading' || effectiveState === 'added' || isOutOfStock;
  
  const sizes = sizeMap[size];
  const variantClass = variantMap[variant];

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!onAddToCart || !product || effectiveDisabled) return;
    
    setInternalState('loading');
    try {
      await onAddToCart(product);
      setInternalState('added');
      setTimeout(() => setInternalState('default'), 2000);
    } catch {
      setInternalState('default');
    }
  }, [onAddToCart, product, effectiveDisabled]);

  if (isOutOfStock || effectiveState === 'outOfStock') {
    return (
      <button
        type="button"
        disabled
        className={`w-full font-semibold flex items-center justify-center ${sizes.height} ${sizes.text} ${sizes.padding} rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed ${className}`}
      >
        {children || 'غير متوفر'}
      </button>
    );
  }

  if (effectiveState === 'loading') {
    return (
      <button
        type="button"
        disabled
        className={`w-full font-semibold flex items-center justify-center ${sizes.height} ${sizes.text} ${sizes.padding} rounded-xl ${variantClass.replace('hover:bg-primary-600', '').replace('active:scale-[0.98]', '')} ${className}`}
      >
        <span className="h-4 w-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
      </button>
    );
  }

  if (effectiveState === 'added') {
    return (
      <button
        type="button"
        disabled
        className={`w-full font-semibold flex items-center justify-center ${sizes.height} ${sizes.text} ${sizes.padding} rounded-xl bg-green-50 text-green-700 ${className}`}
      >
        <Icon icon={Check} size={sizes.icon as any} />
        <span>{children || 'تمت الإضافة'}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={effectiveDisabled}
      className={`w-full font-semibold flex items-center justify-center ${sizes.height} ${sizes.text} ${sizes.padding} ${sizes.gap} rounded-xl ${variantClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400/40 focus-visible:ring-offset-2 transition-[box-shadow,transform] duration-200 ${className}`}
    >
      <Icon icon={ShoppingBag} size={sizes.icon as any} />
      <span>{children || 'أضف للسلة'}</span>
    </button>
  );
}
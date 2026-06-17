import { useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { ShoppingBag } from 'lucide-react';

interface ProductImageFrameProps {
  src?: string | null;
  alt?: string;
  aspectRatio?: 'square' | '4:3' | '16:9';
  className?: string;
  children?: React.ReactNode;
  onError?: () => void;
}

const aspectMap = {
  square: 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
};

export function ProductImageFrame({ src, alt = '', aspectRatio = 'square', className = '', children, onError }: ProductImageFrameProps) {
  const [imgError, setImgError] = useState(false);
  const aspectClass = aspectMap[aspectRatio];

  return (
    <div className={`relative ${aspectClass} bg-white/50 overflow-hidden ${className}`}>
      {children}
      {src && !imgError ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-[1.02]"
          loading="lazy"
          onError={() => { setImgError(true); onError?.(); }}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Icon icon={ShoppingBag} size="lg" className="text-gray-300" />
        </div>
      )}
    </div>
  );
}

interface ProductBadgesProps {
  discountPercent?: number | null;
  isOutOfStock?: boolean;
  lowStockThreshold?: number;
  stockQuantity?: number;
  trackInventory?: boolean;
  featured?: boolean;
  className?: string;
}

export function ProductBadges({ 
  discountPercent, 
  isOutOfStock, 
  lowStockThreshold = 5,
  stockQuantity,
  trackInventory,
  featured,
  className = ''
}: ProductBadgesProps) {
  const showLowStock = trackInventory && stockQuantity != null && stockQuantity > 0 && stockQuantity <= lowStockThreshold;
  const hasDiscount = discountPercent != null && discountPercent > 0;
  
  if (!hasDiscount && !isOutOfStock && !showLowStock && !featured) return null;

  return (
    <div className={`absolute top-2 end-2 z-10 flex flex-col gap-1.5 ${className}`}>
      {hasDiscount && (
        <span className="inline-flex items-center rounded-[6px] bg-[#dc2626] px-2 py-0.5 text-[10px] font-bold text-white leading-none">
          -{discountPercent}%
        </span>
      )}
      {featured && (
        <span className="inline-flex items-center rounded-[6px] bg-primary-500 px-2 py-0.5 text-[10px] font-bold text-white leading-none">
          مختار
        </span>
      )}
      {showLowStock && (
        <span className="inline-flex items-center rounded-[6px] bg-[#f59e0b] px-2 py-0.5 text-[10px] font-bold text-white leading-none">
          مخزون قليل
        </span>
      )}
      {isOutOfStock && (
        <span className="inline-flex items-center rounded-[6px] bg-gray-500 px-2 py-0.5 text-[10px] font-bold text-white leading-none">
          نفد المخزون
        </span>
      )}
    </div>
  );
}

interface OutOfStockOverlayProps {
  isOutOfStock: boolean;
}

export function OutOfStockOverlay({ isOutOfStock }: OutOfStockOverlayProps) {
  if (!isOutOfStock) return null;
  
  return (
    <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-20">
      <span className="rounded-full bg-white px-3 py-1 text-[10px] font-bold text-black">
        نفد المخزون
      </span>
    </div>
  );
}
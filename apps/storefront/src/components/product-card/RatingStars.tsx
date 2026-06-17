import { Star } from 'lucide-react';
import { Icon } from '@/components/ui/icon';

interface RatingStarsProps {
  rating: number | null;
  count?: number | null;
  size?: '3xs' | '2xs' | 'xs';
  showValue?: boolean;
  showCount?: boolean;
  className?: string;
}

export function RatingStars({ rating, count, size = '3xs', showValue = true, showCount = true, className = '' }: RatingStarsProps) {
  const roundedRating = rating != null && rating > 0 ? Math.round(rating) : 0;

  return (
    <div className={`flex items-center gap-1 h-3 ${className}`}>
      <div className="flex items-center gap-0" aria-label={`تقييم ${rating ?? 0} من 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Icon
            key={star}
            icon={Star}
            size={size}
            className={star <= roundedRating ? 'text-amber-500 fill-amber-500' : 'text-gray-200'}
          />
        ))}
      </div>
      {showValue && rating != null && (
        <span className="text-xs font-bold text-gray-600">{rating.toFixed(1)}</span>
      )}
      {showCount && count != null && count > 0 && (
        <span className="text-xs text-gray-400">({count})</span>
      )}
    </div>
  );
}

/**
 * MerchantEmptyState — canonical empty state for merchant dashboard.
 *
 * T3.1 — Empty state library. Mirrors the storefront `StoreEmptyState` API
 * but tuned for the merchant dashboard audience (slightly more compact,
 * uses admin icon size scale).
 */
import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

interface MerchantEmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  /** When true, renders the compact mobile variant (tighter padding, smaller icon). */
  compact?: boolean;
}

export function MerchantEmptyState({
  icon: IconComponent,
  title,
  description,
  action,
  compact = false,
}: MerchantEmptyStateProps) {
  return (
    <div className={`text-center ${compact ? 'py-8' : 'py-12 sm:py-16'}`}>
      {IconComponent && (
        <div className={`mx-auto ${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-2xl bg-neutral-100 flex items-center justify-center mb-3`}>
          <IconComponent className={`${compact ? 'h-5 w-5' : 'h-7 w-7'} text-neutral-400`} aria-hidden="true" />
        </div>
      )}
      <h3 className={`${compact ? 'text-sm' : 'text-base'} font-bold text-neutral-900 mb-1`}>
        {title}
      </h3>
      {description && (
        <p className={`${compact ? 'text-xs' : 'text-sm'} text-neutral-500 max-w-sm mx-auto mb-4`}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

interface MerchantErrorStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  onRetry?: () => void;
}

export function MerchantErrorState({
  icon: IconComponent,
  title,
  description,
  onRetry,
}: MerchantErrorStateProps) {
  return (
    <div className="text-center py-12 sm:py-16">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
        {IconComponent && (
          <IconComponent className="h-7 w-7 text-red-500" aria-hidden="true" />
        )}
      </div>
      <h3 className="text-base font-bold text-neutral-900 mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-neutral-500 max-w-sm mx-auto mb-4">{description}</p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-xl bg-primary-500 text-white text-sm font-semibold hover:bg-primary-600 transition-colors"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

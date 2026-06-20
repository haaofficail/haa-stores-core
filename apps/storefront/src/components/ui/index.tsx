import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- this IS the icon barrel; lucide imports are permitted here so other files can import via @/components/ui
import { AlertTriangle, ArrowLeft, CreditCard, ExternalLink, MessageCircle, Palette, Search, Shield, ChevronLeft, Loader2, Info, CheckCircle, Truck, X, Zap, type LucideIcon } from 'lucide-react';
import { Icon } from './icon';
import { SarIcon } from './SarIcon';
import { CurrencyAmount, CurrencyStrike } from '@/components/product-card';

// Re-export from @haa/ui
export {
  Button as HaaButton,
  Card as HaaCard,
  Container as HaaContainer,
  Badge as HaaBadge,
  Skeleton as HaaSkeleton,
  EmptyState as HaaEmptyState,
  Input as HaaInput,
  Text as HaaText,
  Divider as HaaDivider,
  Progress as HaaProgress,
  Stack as HaaStack,
  Grid as HaaGrid,
} from '@haa/ui';

export {
  Price as HaaPrice,
  Breadcrumbs as HaaBreadcrumbs,
  SearchInput as HaaSearchInput,
  StepIndicator as HaaStepIndicator,
  QuantitySelector as HaaQuantitySelector,
} from '@haa/ui';

export { Icon, SarIcon, type LucideIcon };
export { ArrowLeft, CreditCard, ExternalLink, MessageCircle, Palette, Shield, Truck, X, Zap };

export function StoreContainer({ children, className = '', id }: { children: ReactNode; className?: string; id?: string }) {
  return (
    <div
      id={id}
      className={`mx-auto w-full max-w-[var(--container-max-width,1280px)] px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}

type CardVariant = 'default' | 'interactive' | 'highlight';

const cardVariantClasses: Record<CardVariant, string> = {
  default: 'shadow-card',
  interactive: 'shadow-card hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300',
  highlight: 'shadow-card border-primary-200',
};

export function StoreCard({ children, variant = 'default', className = '' }: { children: ReactNode; variant?: CardVariant; className?: string }) {
  return (
    <div className={`bg-surface-1 rounded-card ${cardVariantClasses[variant]} ${className}`}>
      {children}
    </div>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type IconButtonVariant = 'ghost' | 'outline' | 'soft' | 'danger';
type IconButtonSize = 'md' | 'lg';

interface StoreIconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  'aria-label': string;
  loading?: boolean;
}

const iconButtonVariantClasses: Record<IconButtonVariant, string> = {
  ghost: 'text-text-secondary hover:bg-surface-2 active:scale-[0.96]',
  outline: 'border border-border-hover bg-surface-1 text-text-secondary hover:bg-surface-2 active:scale-[0.96]',
  soft: 'bg-primary-50 text-primary-600 hover:bg-primary-100 active:scale-[0.96]',
  danger: 'text-danger hover:bg-danger-soft active:scale-[0.96]',
};

const iconButtonSizeClasses: Record<IconButtonSize, string> = {
  md: 'min-w-[44px] min-h-[44px]',
  lg: 'min-w-[48px] min-h-[48px]',
};

export function StoreIconButton({ variant = 'ghost', size = 'md', loading, children, className = '', ...props }: StoreIconButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${iconButtonSizeClasses[size]} ${iconButtonVariantClasses[variant]} ${className}`}
      {...props}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : children}
    </button>
  );
}

interface StoreButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  href?: string;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 active:scale-[0.98] shadow-sm',
  secondary: 'bg-surface-2 text-text-primary hover:bg-surface-3 active:scale-[0.98]',
  outline: 'border border-border-hover bg-surface-1 text-text-secondary hover:bg-surface-2 active:scale-[0.98]',
  ghost: 'text-primary-500 hover:bg-primary-50',
  danger: 'bg-danger text-danger-text hover:opacity-90 active:scale-[0.98]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-[32px] px-3 text-xs rounded-lg gap-1.5',
  md: 'min-h-[44px] px-4 text-sm rounded-xl gap-2',
  lg: 'min-h-[48px] px-6 text-sm rounded-xl gap-2',
};

export function StoreButton({ variant = 'primary', size = 'md', loading, icon, iconStart, iconEnd, children, disabled, className = '', href, ...props }: StoreButtonProps) {
  const startIcon = iconStart ?? icon;
  const classes = `inline-flex items-center justify-center font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${
    variant === 'ghost' ? '' : 'focus-visible:ring-offset-white'
  } ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (href) {
    return (
      <Link to={href} className={classes} {...(props as any)}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : startIcon}
        {children}
        {iconEnd}
      </Link>
    );
  }

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : startIcon}
      {children}
      {iconEnd}
    </button>
  );
}

interface StoreInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
}

export function StoreInput({ label, error, hint, iconStart, iconEnd, className = '', id, ...props }: StoreInputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {iconStart && (
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-text-tertiary">
            {iconStart}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full min-h-[44px] rounded-xl bg-surface-2 text-sm transition-all duration-200 outline-none focus-visible:bg-surface-1 focus-visible:ring-2 focus-visible:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed ${
            error ? 'bg-danger-soft focus-visible:ring-danger-200' : ''
          } ${iconStart ? 'ps-10' : 'px-3.5'} ${iconEnd ? 'pe-10' : ''} ${className}`}
          {...props}
        />
        {iconEnd && (
          <div className="absolute inset-y-0 end-0 flex items-center pe-3 text-text-tertiary">
            {iconEnd}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-text-tertiary">{hint}</p>}
    </div>
  );
}

interface StoreTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  iconStart?: ReactNode;
}

export function StoreTextarea({ label, error, iconStart, className = '', id, ...props }: StoreTextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {iconStart && (
          <div className="absolute top-3 start-3 pointer-events-none text-text-tertiary">
            {iconStart}
          </div>
        )}
        <textarea
          id={textareaId}
          className={`w-full rounded-xl bg-surface-2 text-sm transition-all duration-200 outline-none focus-visible:bg-surface-1 focus-visible:ring-2 focus-visible:ring-primary-200 resize-none ${
            error ? 'bg-danger-soft focus-visible:ring-danger-200' : ''
          } ${iconStart ? 'ps-10' : 'px-3.5'} py-2.5 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

interface StoreSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
  iconStart?: ReactNode;
}

export function StoreSelect({ label, error, options, placeholder, iconStart, className = '', id, ...props }: StoreSelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      )}
      <div className="relative">
        {iconStart && (
          <div className="absolute inset-y-0 start-0 flex items-center ps-3 pointer-events-none text-text-tertiary">
            {iconStart}
          </div>
        )}
        <select
          id={selectId}
          className={`w-full min-h-[44px] rounded-xl bg-surface-2 text-sm transition-all duration-200 outline-none focus-visible:bg-surface-1 focus-visible:ring-2 focus-visible:ring-primary-200 ${
            error ? 'bg-danger-soft focus-visible:ring-danger-200' : ''
          } ${iconStart ? 'ps-10' : 'px-3.5'} ${className}`}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'discount' | 'stock' | 'new';
type BadgeSize = 'sm' | 'md';

interface StoreBadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

const badgeVariantClasses: Record<BadgeVariant, string> = {
  neutral: 'bg-surface-2 text-text-secondary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
  discount: 'bg-danger-soft text-danger',
  stock: 'bg-success-soft text-success',
  new: 'bg-info-soft text-info',
};

const badgeSizeClasses: Record<BadgeSize, string> = {
  sm: 'text-xs leading-none',
  md: 'text-xs leading-none',
};

export function StoreBadge({ variant = 'neutral', size = 'md', children, icon, className = '' }: StoreBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-medium ${badgeSizeClasses[size]} ${badgeVariantClasses[variant]} [&_svg]:shrink-0 [&_svg]:stroke-[2.25] ${size === 'sm' ? '[&_svg]:h-3 [&_svg]:w-3' : '[&_svg]:h-3.5 [&_svg]:w-3.5'} ${className}`}
      style={{
        paddingInline: size === 'sm' ? 'var(--badge-compact-padding-x, 4px)' : 'var(--badge-padding-x, 8px)',
        paddingBlock: size === 'sm' ? 'var(--badge-compact-padding-y, 1.5px)' : 'var(--badge-padding-y, 2px)',
        borderRadius: 'var(--badge-radius, 9999px)',
      }}
    >
      {icon}
      {children}
    </span>
  );
}

export function StoreSkeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-surface-2 rounded-xl ${className}`} />;
}

export function StoreEmptyState({ icon: IconComponent, title, description, action }: {
  icon?: LucideIcon; title: string; description?: string; action?: ReactNode;
}) {
  return (
    <div className="text-center py-12 sm:py-16">
      {IconComponent && (
        <Icon icon={IconComponent} size="xl" className="text-text-disabled mx-auto mb-4" />
      )}
      <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
      {description && <p className="text-sm text-text-secondary max-w-sm mx-auto mb-6">{description}</p>}
      {action}
    </div>
  );
}

export function StoreErrorState({ icon: IconComponent, title, description, onRetry, onBack }: {
  icon?: LucideIcon; title: string; description?: string; onRetry?: () => void; onBack?: string;
}) {
  const { t } = useTranslation();
  const ErrorIcon = IconComponent ?? AlertTriangle;
  return (
    <StoreContainer className="py-16 sm:py-20 text-center">
      <div className="w-10 h-10 rounded-full bg-warning-soft flex items-center justify-center mx-auto mb-3">
        <Icon icon={ErrorIcon} size="md" className="text-warning" />
      </div>
      <h2 className="text-xl font-bold mb-2">{title}</h2>
      {description && <p className="text-sm text-text-secondary mb-6">{description}</p>}
      <div className="flex items-center justify-center gap-3">
        {onRetry && (
          <StoreButton onClick={onRetry}>{t('ui.retry', 'إعادة المحاولة')}</StoreButton>
        )}
        {onBack && (
          <StoreButton variant="outline" href={onBack}>{t('ui.back', 'رجوع')}</StoreButton>
        )}
      </div>
    </StoreContainer>
  );
}

export function StorePrice({ price, compareAtPrice, size = 'md', showDiscountBadge = true }: {
  price: number | string; compareAtPrice?: number | string | null; size?: 'sm' | 'md' | 'lg'; showDiscountBadge?: boolean;
}) {
  const { t } = useTranslation();
  const hasDiscount = compareAtPrice && Number(compareAtPrice) > Number(price);
  const discountPercent = hasDiscount ? Math.round((1 - Number(price) / Number(compareAtPrice)) * 100) : null;
  const priceSize = size === 'lg' ? 'lg' : size === 'sm' ? 'sm' : 'md';

  return (
    <div className="flex items-baseline gap-2 flex-wrap">
      <CurrencyAmount amount={price} size={priceSize as any} weight="bold" color="text-text-primary" />
      {hasDiscount && (
        <>
          <CurrencyStrike amount={compareAtPrice!} size={size === 'sm' ? 'sm' : 'md' as any} />
          {showDiscountBadge && (
            <StoreBadge variant="discount" size={size === 'sm' ? 'sm' : 'md'} className="shrink-0">
              {discountPercent}% {t('ui.discount', 'خصم')}
            </StoreBadge>
          )}
        </>
      )}
    </div>
  );
}

export function StoreBreadcrumbs({ items }: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav className="flex items-center gap-2 text-sm text-text-secondary mb-6 overflow-x-auto whitespace-nowrap" aria-label="Breadcrumb">
      {items.map((item, idx) => (
        <span key={idx} className="flex items-center gap-2 shrink-0">
          {idx > 0 && <Icon icon={ChevronLeft} size="xs" className="text-text-disabled shrink-0" />}
          {item.href ? (
            <Link to={item.href} className="hover:text-primary-600 transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-text-primary font-medium truncate">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function StoreSearchInput({ value, onChange, onSubmit, placeholder }: {
  value: string; onChange: (v: string) => void; onSubmit?: () => void; placeholder?: string;
}) {
  const { t } = useTranslation();
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit?.(); }} className="relative">
      <Icon icon={Search} size="xs" className="absolute text-text-tertiary" style={{ insetInlineEnd: '12px', top: '50%', transform: 'translateY(-50%)' }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || t('ui.search', 'بحث...')}
        className="w-full min-h-[44px] rounded-xl bg-surface-2 text-sm outline-none transition-all duration-200 focus-visible:bg-surface-1 focus-visible:ring-2 focus-visible:ring-primary-200"
        style={{ paddingInline: '40px 14px' }}
      />
    </form>
  );
}

export function StoreStepIndicator({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {steps.map((step, idx) => (
        <div key={idx} className="flex items-center gap-2 flex-1">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold shrink-0 transition-colors ${
            idx < currentStep ? 'bg-success text-success-text' :
            idx === currentStep ? 'bg-primary-500 text-white' :
            'bg-surface-2 text-text-tertiary'
          }`}>
            {idx < currentStep ? '✓' : idx + 1}
          </div>
          <span className={`text-xs font-medium hidden sm:block ${
            idx <= currentStep ? 'text-text-primary' : 'text-text-tertiary'
          }`}>
            {step}
          </span>
          {idx < steps.length - 1 && (
            <div className={`flex-1 h-0.5 rounded ${idx < currentStep ? 'bg-success' : 'bg-surface-2'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

export function StoreQuantitySelector({ value, onChange, min = 1, max = 99, disabled }: {
  value: number; onChange: (v: number) => void; min?: number; max?: number; disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="min-w-[44px] min-h-[44px] rounded-xl bg-surface-2 flex items-center justify-center hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-secondary"
        aria-label={t('ui.decreaseQty', 'إنقاص الكمية')}
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const v = parseInt(e.target.value) || min;
          onChange(Math.min(max, Math.max(min, v)));
        }}
        min={min}
        max={max}
        disabled={disabled}
        className="min-w-[44px] min-h-[44px] text-center bg-surface-2 rounded-xl font-medium text-sm outline-none focus-visible:bg-surface-1 focus-visible:ring-2 focus-visible:ring-primary-200 disabled:opacity-40 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        aria-label={t('ui.quantity', 'الكمية')}
      />
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="min-w-[44px] min-h-[44px] rounded-xl bg-surface-2 flex items-center justify-center hover:bg-surface-3 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-text-secondary"
        aria-label={t('ui.increaseQty', 'زيادة الكمية')}
      >
        +
      </button>
    </div>
  );
}

type AlertVariant = 'info' | 'success' | 'warning' | 'danger';

interface StoreAlertProps {
  variant?: AlertVariant;
  title?: string;
  children: ReactNode;
  icon?: LucideIcon;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

const alertIcons: Record<AlertVariant, LucideIcon> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  danger: AlertTriangle,
};

const alertVariantClasses: Record<AlertVariant, string> = {
  info: 'bg-info-soft text-info',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
};

export function StoreAlert({ variant = 'info', title, children, icon, dismissible, onDismiss, className = '' }: StoreAlertProps) {
  const AlertIcon = icon ?? alertIcons[variant];
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl ${alertVariantClasses[variant]} ${className}`} role="alert">
      <Icon icon={AlertIcon} size="sm" className="mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-sm mb-1">{title}</p>}
        <div className="text-sm">{children}</div>
      </div>
      {dismissible && onDismiss && (
        <button onClick={onDismiss} className="shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors" aria-label="إغلاق">
          <Icon icon={X} size="xs" />
        </button>
      )}
    </div>
  );
}

interface StoreSectionProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function StoreSection({ title, subtitle, action, children, className = '', id }: StoreSectionProps) {
  return (
    <section id={id} className={`py-4 sm:py-5 ${className}`}>
      {(title || action) && (
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 mb-4 sm:mb-5">
          <div>
            {title && <h2 className="text-section-title font-bold text-text-primary">{title}</h2>}
            {subtitle && <p className="text-sm text-text-secondary mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StoreSectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--section-header-gap, 24px)' }}>
      <h2 className="text-section-title font-bold text-text-primary">{title}</h2>
      {action}
    </div>
  );
}

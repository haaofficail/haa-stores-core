// LoyaltyEarnHint — small inline badge shown on product cards when
// the store has loyalty enabled. Renders nothing when:
//   - loyalty settings are still loading (avoid layout jump)
//   - the store has loyalty disabled
//   - the computed points would be 0 (price too low for earn rate)
//
// The server is authoritative at checkout time. This hint is purely
// motivational ("buying this earns you N points") and never affects
// the actual point grant.

import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- single icon; full <Icon> wrapper migration tracked separately
import { Sparkles } from 'lucide-react';
import { computeEarnPoints } from '@/lib/api';
import { useLoyaltySettings } from '@/hooks/useLoyaltySettings';

interface LoyaltyEarnHintProps {
  priceSar: number;
  /** Optional className for layout tuning by parent (e.g. spacing). */
  className?: string;
  /** When true, omits the icon (compact list view). */
  compact?: boolean;
}

export function LoyaltyEarnHint({ priceSar, className = '', compact = false }: LoyaltyEarnHintProps) {
  const settings = useLoyaltySettings();
  const { t } = useTranslation();
  const points = useMemo(() => {
    if (!settings) return 0;
    return computeEarnPoints(priceSar, settings);
  }, [priceSar, settings]);

  if (!settings || !settings.enabled || points <= 0) return null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 ${className}`} /* small-text-allowed:badge */
      data-testid="loyalty-earn-hint"
      aria-label={t('loyalty.earnHintAria', 'نقاط الولاء المكتسبة عند شراء هذا المنتج')}
    >
      {!compact && <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />}
      <span>
        {t('loyalty.earnHint', { defaultValue: 'اكسب {{points}} نقطة', points })}
      </span>
    </span>
  );
}

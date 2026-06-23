/**
 * LoyaltyBalanceCard — storefront customer-facing balance widget (L-PR-6).
 *
 * Renders a customer's loyalty balance + lifetime stats + last 10 ledger
 * entries. The server is the single source of truth for the value:
 * `loyaltyApi.getBalance(slug, phone)` returns the rendered numbers
 * directly. The client never recomputes the value from balance × rate.
 *
 * Design contract:
 *   - When the store has loyalty disabled OR the customer has no
 *     account, the response shape is `{ enabled: false, ... }` and the
 *     card renders `null` (renders nothing — caller can hide its slot).
 *   - On fetch error the card shows a quiet warning, never blocks the
 *     surrounding page.
 *   - Visual style follows the storefront design system (StoreCard,
 *     primary tokens). No raw fetch/lucide imports; everything goes
 *     through the @/components/ui barrel + Icon wrapper.
 *
 * Accessibility:
 *   - Section is a `<section>` with `aria-labelledby` pointing at the
 *     card heading.
 *   - Ledger rows use tabular-nums for monetary alignment.
 *   - Numbers are LTR inside RTL pages (dir="ltr" on the value spans).
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loyaltyApi, type LoyaltyBalanceResponse, ApiClientError } from '@/lib/api';
import { StoreCard, StoreSkeleton, StoreAlert, Icon, SarIcon } from '@/components/ui';

interface LoyaltyBalanceCardProps {
  slug: string;
  phone: string;
  /** Optional className passthrough so the parent (Checkout, Account) can size it. */
  className?: string;
  /** Limit how many recent ledger rows to show (default 10). */
  recentLimit?: number;
}

export default function LoyaltyBalanceCard({
  slug, phone, className = '', recentLimit = 10,
}: LoyaltyBalanceCardProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<LoyaltyBalanceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!slug || !phone || phone.trim().length < 6) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErrorMsg(null);
    loyaltyApi.getBalance(slug, phone)
      .then((res) => { if (!cancelled) setData(res); })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiClientError) {
          setErrorMsg(err.message);
        } else {
          // Network/404/feature-off — surface nothing (the widget hides).
          setData(null);
        }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug, phone]);

  if (loading) {
    return (
      <StoreCard className={`p-5 ${className}`} data-testid="loyalty-balance-card-loading">
        <StoreSkeleton className="h-6 w-32 mb-3" />
        <StoreSkeleton className="h-12 w-24" />
      </StoreCard>
    );
  }

  if (errorMsg) {
    return (
      <StoreCard className={`p-5 ${className}`} data-testid="loyalty-balance-card-error">
        <StoreAlert variant="warning" className="text-xs">{errorMsg}</StoreAlert>
      </StoreCard>
    );
  }

  // Feature disabled OR no customer account yet → render nothing.
  if (!data || !data.enabled) {
    return null;
  }

  const recent = (data.recent || []).slice(0, recentLimit);

  return (
    <section
      aria-labelledby="loyalty-card-heading"
      data-testid="loyalty-balance-card"
      className={className}
    >
      <StoreCard className="p-5">
        <header className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-primary-50 text-primary-600">
              <Icon name="Coins" size="sm" />
            </span>
            <h3 id="loyalty-card-heading" className="font-bold text-base text-text-primary">
              {t('loyalty.title', 'نقاط الولاء')}
            </h3>
          </div>
        </header>

        <div className="mb-4">
          <p className="text-xs text-text-secondary mb-1">{t('loyalty.currentBalance', 'الرصيد الحالي')}</p>
          <div className="flex items-baseline gap-3">
            <span
              className="text-3xl font-bold text-primary-600 tabular-nums"
              dir="ltr"
              data-testid="loyalty-balance-points"
            >
              {data.balance.toLocaleString('en-US')}
            </span>
            <span className="text-sm text-text-secondary">{t('loyalty.points', 'نقطة')}</span>
          </div>
          <p className="text-xs text-text-tertiary mt-1" dir="ltr" data-testid="loyalty-balance-value">
            ≈ {data.value.toFixed(2)} <SarIcon size="sm" />
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4 pt-4 border-t border-border">
          <div>
            <p className="text-xs text-text-secondary flex items-center gap-1">
              <Icon name="TrendingUp" size="2xs" className="text-success" />
              {t('loyalty.lifetimeEarned', 'مكتسبة')}
            </p>
            <p className="text-sm font-semibold tabular-nums" dir="ltr" data-testid="loyalty-lifetime-earned">
              {data.lifetimeEarned.toLocaleString('en-US')}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary flex items-center gap-1">
              <Icon name="TrendingDown" size="2xs" className="text-danger" />
              {t('loyalty.lifetimeRedeemed', 'مستبدلة')}
            </p>
            <p className="text-sm font-semibold tabular-nums" dir="ltr" data-testid="loyalty-lifetime-redeemed">
              {data.lifetimeRedeemed.toLocaleString('en-US')}
            </p>
          </div>
          <div>
            <p className="text-xs text-text-secondary flex items-center gap-1">
              <Icon name="Calendar" size="2xs" className="text-text-tertiary" />
              {t('loyalty.lifetimeExpired', 'منتهية')}
            </p>
            <p className="text-sm font-semibold tabular-nums" dir="ltr" data-testid="loyalty-lifetime-expired">
              {data.lifetimeExpired.toLocaleString('en-US')}
            </p>
          </div>
        </div>

        {recent.length > 0 && (
          <div className="pt-4 border-t border-border">
            <p className="text-xs text-text-secondary mb-2">
              {t('loyalty.recentActivity', 'آخر الحركات')}
            </p>
            <ul className="space-y-1.5" data-testid="loyalty-ledger-list">
              {recent.map((row) => {
                const isPositive = row.points > 0;
                return (
                  <li
                    key={row.id}
                    className="flex items-center justify-between text-xs"
                    data-testid="loyalty-ledger-row"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-text-primary truncate">
                        {row.description || t(`loyalty.type.${row.type}`, row.type)}
                      </p>
                      <p className="text-text-tertiary text-xs" dir="ltr">
                        {new Date(row.createdAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <span
                      className={`tabular-nums font-medium ${isPositive ? 'text-success' : 'text-danger'}`}
                      dir="ltr"
                    >
                      {isPositive ? '+' : ''}{row.points.toLocaleString('en-US')}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </StoreCard>
    </section>
  );
}

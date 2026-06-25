// Marketing Hub — overview landing page for /marketing.
//
// Following the IA W2 plan: each top-level section gets a Hub
// (overview + KPIs + quick actions + cross-links) instead of jumping
// straight into a list. The hub answers "what's happening across my
// marketing tools and what should I do next?" — Apple's "everything
// in its place" principle applied to merchant tools.
//
// This Hub composes data from existing endpoints (no new backend
// work). When a card cannot load, it falls back to "—" instead of
// blocking the whole page.

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Percent,
  TicketPercent,
  Coins,
  MessageSquare,
  ShoppingBag,
  Sparkles,
  ArrowLeft,
  TrendingUp,
} from 'lucide-react';
import { promotionsApi, couponsApi, abandonedCartsApi, loyaltyApi } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

interface HubCounts {
  activePromotions: number | null;
  activeCoupons: number | null;
  abandonedCartsCount: number | null;
  recoverableTotal: string | null;
  loyaltyActiveAccounts: number | null;
}

function HubCard({
  icon: Icon,
  iconClass,
  title,
  description,
  to,
  cta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  description: string;
  to: string;
  cta: string;
}) {
  return (
    <Link
      to={to}
      className="group block bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`p-3.5 rounded-2xl ${iconClass}`}>
          <Icon className="h-5 w-5" />
        </div>
        <ArrowLeft className="h-4 w-4 text-neutral-300 group-hover:text-primary-500 transition-colors" />
      </div>
      <h3 className="font-bold text-neutral-900 text-base mb-1">{title}</h3>
      <p className="text-sm text-neutral-500 mb-3 leading-relaxed">{description}</p>
      <span className="text-sm font-semibold text-primary-600 group-hover:text-primary-700">
        {cta}
      </span>
    </Link>
  );
}

function MetricTile({
  label,
  value,
  trend,
}: {
  label: string;
  value: string | number | null;
  trend?: string;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-5">
      <p className="text-xs text-neutral-500 mb-1">{label}</p>
      <p className="text-2xl font-bold tracking-tight text-neutral-900 tabular-nums">
        {value ?? '—'}
      </p>
      {trend && <p className="text-xs text-neutral-400 mt-1">{trend}</p>}
    </div>
  );
}

export default function MarketingHub() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<HubCounts>({
    activePromotions: null,
    activeCoupons: null,
    abandonedCartsCount: null,
    recoverableTotal: null,
    loyaltyActiveAccounts: null,
  });

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    // Promise.allSettled — each card degrades to "—" on failure
    // instead of blocking the whole page. The Hub MUST be the
    // single safe entry point even when one downstream service
    // is flaky.
    Promise.allSettled([
      promotionsApi.list(storeId, { status: 'active' }),
      couponsApi.list(storeId, { status: 'active' }),
      abandonedCartsApi.stats(storeId, 24),
      loyaltyApi.analytics(storeId),
    ]).then(([promos, coups, carts, loyalty]) => {
      setCounts({
        activePromotions:
          promos.status === 'fulfilled' && Array.isArray(promos.value)
            ? (promos.value as unknown[]).length
            : null,
        activeCoupons:
          coups.status === 'fulfilled' && Array.isArray(coups.value)
            ? (coups.value as unknown[]).length
            : null,
        abandonedCartsCount:
          carts.status === 'fulfilled'
            ? (carts.value as { count?: number })?.count ?? 0
            : null,
        recoverableTotal:
          carts.status === 'fulfilled'
            ? (carts.value as { recoverableTotal?: string })?.recoverableTotal ?? '0'
            : null,
        loyaltyActiveAccounts:
          loyalty.status === 'fulfilled'
            ? (loyalty.value as { activeAccounts?: number })?.activeAccounts ?? 0
            : null,
      });
    }).finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-primary-500" />
          <span className="text-sm font-medium text-primary-600">
            {t('marketing.hub.tagline', 'مركز التسويق')}
          </span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          {t('marketing.hub.title', 'نمو متجرك في مكان واحد')}
        </h1>
        <p className="text-neutral-500 text-base mt-2 leading-relaxed max-w-2xl">
          {t(
            'marketing.hub.description',
            'كل أدوات النمو — العروض، الكوبونات، الولاء، حملات الواتساب — تحت سقف واحد. ابدأ بنظرة عامة، ثم تعمّق حسب الحاجة.',
          )}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          <>
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </>
        ) : (
          <>
            <MetricTile
              label={t('marketing.hub.kpi.activePromotions', 'عروض نشطة')}
              value={counts.activePromotions}
            />
            <MetricTile
              label={t('marketing.hub.kpi.activeCoupons', 'كوبونات نشطة')}
              value={counts.activeCoupons}
            />
            <MetricTile
              label={t('marketing.hub.kpi.recoverableCarts', 'سلال قابلة للاسترداد')}
              value={counts.abandonedCartsCount}
              trend={
                counts.recoverableTotal
                  ? `${formatCurrency(counts.recoverableTotal)} ر.س`
                  : undefined
              }
            />
            <MetricTile
              label={t('marketing.hub.kpi.loyaltyAccounts', 'حسابات الولاء')}
              value={counts.loyaltyActiveAccounts}
            />
          </>
        )}
      </div>

      {/* Tool cards */}
      <div>
        <h2 className="text-lg font-bold text-neutral-900 mb-4">
          {t('marketing.hub.tools.heading', 'أدوات التسويق')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <HubCard
            icon={Percent}
            iconClass="bg-primary-50 text-primary-600"
            title={t('marketing.hub.tools.promotions.title', 'إدارة العروض')}
            description={t(
              'marketing.hub.tools.promotions.description',
              'أنشئ تخفيضات موسمية أو حملات بالنسبة المئوية، وأطلقها على شريحة محددة من منتجاتك.',
            )}
            to="/marketing/promotions"
            cta={t('marketing.hub.tools.promotions.cta', 'فتح العروض')}
          />
          <HubCard
            icon={TicketPercent}
            iconClass="bg-emerald-50 text-emerald-600"
            title={t('marketing.hub.tools.coupons.title', 'إدارة الكوبونات')}
            description={t(
              'marketing.hub.tools.coupons.description',
              'كوبونات خصم بأكواد قابلة للمشاركة، بحدود استخدام وفترات صلاحية.',
            )}
            to="/marketing/coupons"
            cta={t('marketing.hub.tools.coupons.cta', 'فتح الكوبونات')}
          />
          <HubCard
            icon={Coins}
            iconClass="bg-amber-50 text-amber-600"
            title={t('marketing.hub.tools.loyalty.title', 'برنامج الولاء')}
            description={t(
              'marketing.hub.tools.loyalty.description',
              'نقاط مكسب على كل شراء، يستبدلها العميل في طلباته القادمة لزيادة معدل التكرار.',
            )}
            to="/marketing/loyalty"
            cta={t('marketing.hub.tools.loyalty.cta', 'إعدادات الولاء')}
          />
          <HubCard
            icon={MessageSquare}
            iconClass="bg-green-50 text-green-600"
            title={t('marketing.hub.tools.whatsapp.title', 'حملات الواتساب')}
            description={t(
              'marketing.hub.tools.whatsapp.description',
              'تواصل مباشر مع عملائك عبر واتساب لاسترداد السلال أو إعلان العروض.',
            )}
            to="/marketing/whatsapp"
            cta={t('marketing.hub.tools.whatsapp.cta', 'فتح الواتساب')}
          />
          <HubCard
            icon={ShoppingBag}
            iconClass="bg-rose-50 text-rose-600"
            title={t('marketing.hub.tools.abandoned.title', 'العربات المتروكة')}
            description={t(
              'marketing.hub.tools.abandoned.description',
              'العملاء الذين تركوا سلالهم — تابعهم تلقائياً عبر بريد الاسترداد المُفعّل.',
            )}
            to="/sales/abandoned-carts"
            cta={t('marketing.hub.tools.abandoned.cta', 'عرض السلال')}
          />
          <HubCard
            icon={TrendingUp}
            iconClass="bg-purple-50 text-purple-600"
            title={t('marketing.hub.tools.actions.title', 'إجراءات ذكية')}
            description={t(
              'marketing.hub.tools.actions.description',
              'اقتراحات تسويقية مبنية على بيانات متجرك — استجب لها بنقرة واحدة.',
            )}
            to="/marketing/actions"
            cta={t('marketing.hub.tools.actions.cta', 'استعرض الاقتراحات')}
          />
        </div>
      </div>

      {/* Footer CTA */}
      <div className="bg-gradient-to-r from-primary-50 to-primary-100/50 rounded-3xl border border-primary-100 p-6">
        <h3 className="font-bold text-neutral-900 text-base mb-1">
          {t('marketing.hub.footer.title', 'لست متأكداً من أين تبدأ؟')}
        </h3>
        <p className="text-sm text-neutral-600 mb-4 max-w-xl">
          {t(
            'marketing.hub.footer.description',
            'افتح "الإجراءات الذكية" — يقترح المساعد عليك أعلى ثلاث فرص نمو بناءً على بيانات متجرك خلال آخر 30 يوماً.',
          )}
        </p>
        <Link to="/marketing/actions">
          <Button className="h-10 text-sm">
            {t('marketing.hub.footer.cta', 'افتح الإجراءات الذكية')}
            <ArrowLeft className="h-4 w-4 ms-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

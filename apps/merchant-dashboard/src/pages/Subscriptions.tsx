import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { subscriptionApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Crown, Calendar, Package, Users, HardDrive, ShoppingCart, FileText, ArrowUpCircle, ArrowDownCircle, Loader2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { PermissionGate } from '@/lib/permissions';
import { messageFromError } from '@/lib/error-mapper';

interface Plan {
  id: number;
  name: string;
  code: string;
  description: string | null;
  priceMonthly: string;
  priceAnnual: string;
  productLimit: number;
  staffLimit: number;
  storageLimitMb: number;
  orderLimit: number;
  trialDays: number;
  isActive: boolean;
  sortOrder: number;
}

interface Subscription {
  id: number;
  storeId: number;
  planId: number;
  status: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  trialEnd: string | null;
  planName: string;
  planCode: string;
  priceMonthly: string;
  priceAnnual: string;
  productLimit: number;
  staffLimit: number;
  storageLimitMb: number;
  orderLimit: number;
  sortOrder: number;
}

interface Limits {
  subscription: {
    planName: string;
    planCode: string;
    status: string;
    billingCycle: string;
    currentPeriodStart: string;
    currentPeriodEnd: string | null;
    trialEnd: string | null;
  } | null;
  usage: {
    products: number;
    staff: number;
    orders: number;
  } | null;
  limits: {
    products: number;
    staff: number;
    storageMb: number;
    orders: number;
  } | null;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: string;
  vatAmount: string;
  total: string;
  status: string;
  billingPeriod: string | null;
  dueDate: string | null;
  paidAt: string | null;
  createdAt: string;
}

const statusColors: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  active: 'success',
  trialing: 'warning',
  cancelled: 'destructive',
  past_due: 'destructive',
  expired: 'secondary',
};

function limitDisplay(limit: number): string {
  return limit === -1 ? '∞' : String(limit);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('ar-SA');
}

const DAY_MS = 86400000;

function toPriceNumber(value: string | number | null | undefined): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function getCycleDays(billingCycle: string | null | undefined): number {
  return billingCycle === 'annual' ? 365 : 30;
}

function getCyclePrice(plan: Pick<Plan, 'priceMonthly' | 'priceAnnual'>, billingCycle: string | null | undefined): number {
  return billingCycle === 'annual' ? toPriceNumber(plan.priceAnnual) : toPriceNumber(plan.priceMonthly);
}

function getRemainingCycleDays(currentPeriodEnd: string | null, cycleDays: number): number {
  if (!currentPeriodEnd) return cycleDays;
  const periodEndMs = new Date(currentPeriodEnd).getTime();
  if (!Number.isFinite(periodEndMs)) return cycleDays;
  const msRemaining = Math.max(0, periodEndMs - Date.now());
  return Math.min(cycleDays, Math.ceil(msRemaining / DAY_MS));
}

function getEstimatedNextPeriodEnd(billingCycle: string | null | undefined): string {
  const cycleDays = getCycleDays(billingCycle);
  return new Date(Date.now() + cycleDays * DAY_MS).toISOString();
}

function getPlanChangeImpact(
  currentPlan: Subscription,
  nextPlan: Plan,
  direction: 'upgrade' | 'downgrade',
) {
  const billingCycle = currentPlan.billingCycle === 'annual' ? 'annual' : 'monthly';
  const cycleDays = getCycleDays(billingCycle);
  const remainingDays = getRemainingCycleDays(currentPlan.currentPeriodEnd, cycleDays);
  const currentPrice = getCyclePrice(currentPlan, billingCycle);
  const newPrice = getCyclePrice(nextPlan, billingCycle);
  const priceDelta = newPrice - currentPrice;
  const estimatedProration = direction === 'upgrade' && priceDelta > 0
    ? (priceDelta * remainingDays) / cycleDays
    : 0;

  return {
    billingCycle,
    cycleDays,
    remainingDays,
    currentPrice,
    newPrice,
    priceDelta,
    estimatedProration,
    nextPeriodEnd: direction === 'upgrade'
      ? getEstimatedNextPeriodEnd(billingCycle)
      : currentPlan.currentPeriodEnd,
  };
}

export default function Subscriptions() {
  const { storeId } = useAuth();
  const { t } = useTranslation();

  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [limits, setLimits] = useState<Limits | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  // Audit Part 5 P0 #1 — never fire upgrade/downgrade without a confirm.
  // `pendingChange` holds the plan the merchant clicked; the Dialog
  // displays the diff and only on "تأكيد التغيير" do we hit the API.
  const [pendingChange, setPendingChange] = useState<{ plan: Plan; direction: 'upgrade' | 'downgrade' } | null>(null);
  const [submittingChange, setSubmittingChange] = useState(false);

  useEffect(() => {
    if (!storeId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loadAll recreated each render; effect intentionally runs on [storeId] only to avoid a fetch/re-run loop
  }, [storeId]);

  async function loadAll() {
    if (!storeId) return;
    setLoading(true);
    try {
      const [sub, plansData, limitsData, invoicesData] = await Promise.all([
        subscriptionApi.getCurrent(storeId).catch(() => null),
        subscriptionApi.getPlans(storeId).catch(() => [] as Plan[]),
        subscriptionApi.getLimits(storeId).catch(() => null as Limits | null),
        subscriptionApi.getInvoices(storeId).catch(() => [] as Invoice[]),
      ]);
      setSubscription(sub as Subscription | null);
      setPlans(plansData as Plan[]);
      setLimits(limitsData as Limits | null);
      setInvoices(invoicesData as Invoice[]);
    } catch (err: unknown) {
      toast.error(messageFromError(err, t));
    } finally {
      setLoading(false);
    }
  }

  // Audit Part 5 P0 #1 — single confirm path for any plan change. The
  // previous `handleUpgrade` / `handleDowngrade` fired instantly on click,
  // turning a misclick into a real billing change. Now the click only
  // *stages* a change; the API call lives behind a Dialog confirm.
  function requestPlanChange(plan: Plan, direction: 'upgrade' | 'downgrade') {
    if (!storeId) return;
    setPendingChange({ plan, direction });
  }

  async function confirmPlanChange() {
    if (!storeId || !pendingChange) return;
    const { plan, direction } = pendingChange;
    setSubmittingChange(true);
    try {
      if (direction === 'upgrade') {
        await subscriptionApi.upgrade(storeId, {
          planId: plan.id,
          billingCycle: subscription?.billingCycle || 'monthly',
        });
        toast.success(t('subscriptions.upgradeSuccess'));
      } else {
        await subscriptionApi.downgrade(storeId, { planId: plan.id });
        toast.success(t('subscriptions.downgradeSuccess'));
      }
      setPendingChange(null);
      await loadAll();
    } catch (err: unknown) {
      toast.error(messageFromError(err, t));
    } finally {
      setSubmittingChange(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in p-6">
        <Skeleton className="h-10 w-60 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-48 rounded-3xl" />)}
        </div>
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  const currentPlan = subscription;
  const planChangeImpact = pendingChange && currentPlan
    ? getPlanChangeImpact(currentPlan, pendingChange.plan, pendingChange.direction)
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">{t('subscriptions.title')}</h1>
        <p className="text-neutral-400 text-sm mt-1">{t('subscriptions.subtitle')}</p>
      </div>

      {currentPlan && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Crown className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-lg text-neutral-900">{t('subscriptions.currentPlan')}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-sm text-neutral-500">{t('subscriptions.plan')}</p>
                <p className="text-xl font-bold text-neutral-900">{currentPlan.planName}</p>
              </div>
              <Badge variant={statusColors[currentPlan.status] || 'default'} className="text-xs px-2.5 py-0.5">
                {currentPlan.status === 'active' ? t('subscriptions.status_active') :
                 currentPlan.status === 'trialing' ? t('subscriptions.status_trialing') :
                 currentPlan.status === 'cancelled' ? t('subscriptions.status_cancelled') :
                 currentPlan.status === 'past_due' ? t('subscriptions.status_past_due') : currentPlan.status}
              </Badge>
              <div>
                <p className="text-sm text-neutral-500">{t('subscriptions.price')}</p>
                <p className="font-semibold text-neutral-900">
                  {currentPlan.billingCycle === 'annual'
                    ? t('subscriptions.annual', { price: formatCurrency(currentPlan.priceAnnual) })
                    : `${formatCurrency(currentPlan.priceMonthly)} ${t('common.sar')}${t('subscriptions.monthly')}`}
                </p>
              </div>
              {currentPlan.trialEnd && (
                <div className="flex items-center gap-1 text-amber-600">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">{t('subscriptions.trialEnd', { date: formatDate(currentPlan.trialEnd) })}</span>
                </div>
              )}
              <div className="flex items-center gap-1 text-neutral-500">
                <Calendar className="h-4 w-4" />
                <span className="text-sm">
                  {t('subscriptions.period', { start: formatDate(currentPlan.currentPeriodStart), end: formatDate(currentPlan.currentPeriodEnd) })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {limits && limits.usage && limits.limits && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Package className="h-5 w-5 text-primary-500" />
              <h3 className="font-bold text-lg text-neutral-900">{t('subscriptions.usageAndLimits')}</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-neutral-100 p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                  <Package className="h-4 w-4" />
                  {t('subscriptions.products')}
                </div>
                <p className="text-2xl font-bold text-neutral-900">
                  {limits.usage.products} <span className="text-sm font-normal text-neutral-400">/ {limitDisplay(limits.limits.products)}</span>
                </p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-neutral-100 p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                  <Users className="h-4 w-4" />
                  {t('subscriptions.staff')}
                </div>
                <p className="text-2xl font-bold text-neutral-900">
                  {limits.usage.staff} <span className="text-sm font-normal text-neutral-400">/ {limitDisplay(limits.limits.staff)}</span>
                </p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-neutral-100 p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                  <HardDrive className="h-4 w-4" />
                  {t('subscriptions.storage')}
                </div>
                <p className="text-2xl font-bold text-neutral-900">
                  {limitDisplay(limits.limits.storageMb)} <span className="text-sm font-normal text-neutral-400">{t('subscriptions.mbUnit')}</span>
                </p>
              </div>
              <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-neutral-100 p-4">
                <div className="flex items-center gap-2 text-sm text-neutral-500 mb-2">
                  <ShoppingCart className="h-4 w-4" />
                  {t('subscriptions.orders')}
                </div>
                <p className="text-2xl font-bold text-neutral-900">
                  {limits.usage.orders} <span className="text-sm font-normal text-neutral-400">/ {limitDisplay(limits.limits.orders)}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg font-bold text-neutral-900 mb-4 flex items-center gap-2">
          <Crown className="h-5 w-5 text-amber-500" />
          {t('subscriptions.availablePlans')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.planId === plan.id;
            return (
              <div key={plan.id} className={`bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden ${isCurrent ? 'ring-2 ring-primary-500' : ''}`}>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-lg text-neutral-900">{plan.name}</h3>
                    {isCurrent && (
                      <Badge variant="success" className="text-xs px-2.5 py-0.5">{t('subscriptions.current')}</Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 mb-3">{plan.description}</p>
                  <div className="text-2xl font-bold text-neutral-900 mb-4">
                    {Number(plan.priceMonthly) === 0 ? t('subscriptions.free') : `${Number(plan.priceMonthly)} ${t('common.sar')}`}
                    <span className="text-sm font-normal text-neutral-400"> {t('subscriptions.monthly')}</span>
                  </div>
                  {Number(plan.priceAnnual) > 0 && (
                    <p className="text-sm text-neutral-500 mb-3">
                      {t('subscriptions.annual', { price: formatCurrency(plan.priceAnnual) })} ({t('subscriptions.saveAnnual')})
                    </p>
                  )}
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-neutral-400" />
                      <span className="text-neutral-900">{limitDisplay(plan.productLimit)} {t('subscriptions.products')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-neutral-400" />
                      <span className="text-neutral-900">{limitDisplay(plan.staffLimit)} {t('subscriptions.staff')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-neutral-400" />
                      <span className="text-neutral-900">{plan.storageLimitMb >= 1024 ? `${(plan.storageLimitMb / 1024).toFixed(1)}GB` : `${plan.storageLimitMb}MB`} {t('subscriptions.storage')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4 text-neutral-400" />
                      <span className="text-neutral-900">{limitDisplay(plan.orderLimit)} {t('subscriptions.orders')}</span>
                    </div>
                  </div>
                  {!isCurrent && currentPlan && (
                    <PermissionGate permission="subscriptions:manage">
                      <Button
                        data-testid={`plan-change-trigger-${plan.id}`}
                        variant={plan.sortOrder > (currentPlan?.sortOrder ?? 0) ? 'default' : 'outline'}
                        className="w-full h-9 text-sm"
                        onClick={() =>
                          requestPlanChange(
                            plan,
                            plan.sortOrder > (currentPlan?.sortOrder ?? 0) ? 'upgrade' : 'downgrade',
                          )
                        }
                      >
                        {plan.sortOrder > (currentPlan?.sortOrder ?? 0) ? (
                          <ArrowUpCircle className="h-4 w-4 me-2" />
                        ) : (
                          <ArrowDownCircle className="h-4 w-4 me-2" />
                        )}
                        {plan.sortOrder > (currentPlan?.sortOrder ?? 0) ? t('subscriptions.upgrade') : t('subscriptions.downgrade')}
                      </Button>
                    </PermissionGate>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/*
        Audit Part 5 P0 #1 — plan-change confirm Dialog.
        Renders the new plan name + the monthly OR annual price the
        merchant will be billed + the direction (ترقية / تخفيض) before
        firing the API call. A misclick on the plan card now only stages
        the change; the actual billing mutation only happens on
        "تأكيد التغيير".
      */}
      <Dialog
        open={pendingChange !== null}
        onOpenChange={(open) => {
          if (!open && !submittingChange) setPendingChange(null);
        }}
      >
        <DialogContent data-testid="plan-change-confirm-dialog">
          {pendingChange && (
            <>
              <DialogHeader>
                <DialogTitle>
                  {pendingChange.direction === 'upgrade'
                    ? t('subscriptions.confirmUpgradeTitle', 'تأكيد ترقية الخطة')
                    : t('subscriptions.confirmDowngradeTitle', 'تأكيد تخفيض الخطة')}
                </DialogTitle>
                <DialogDescription>
                  {t(
                    'subscriptions.confirmChangeDescription',
                    'سيتم تغيير خطة المتجر فورًا. راجع التفاصيل قبل التأكيد.',
                  )}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">
                    {t('subscriptions.confirmFromPlan', 'الخطة الحالية')}
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {currentPlan?.planName ?? '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">
                    {t('subscriptions.confirmToPlan', 'الخطة الجديدة')}
                  </span>
                  <span
                    data-testid="plan-change-new-plan"
                    className="font-semibold text-neutral-900"
                  >
                    {pendingChange.plan.name}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">
                    {t('subscriptions.confirmBillingCycle', 'دورة الفوترة')}
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {subscription?.billingCycle === 'annual'
                      ? t('subscriptions.confirmCycleAnnual', 'سنوي')
                      : t('subscriptions.confirmCycleMonthly', 'شهري')}
                  </span>
                </div>
                {planChangeImpact && (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-neutral-500">
                        {t('subscriptions.confirmCurrentPrice', 'السعر الحالي')}
                      </span>
                      <span
                        data-testid="plan-change-current-price"
                        className="font-semibold text-neutral-900"
                      >
                        {formatCurrency(planChangeImpact.currentPrice)} {t('common.sar')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-neutral-500">
                        {t('subscriptions.confirmPriceDelta', 'فرق السعر لكل دورة')}
                      </span>
                      <span
                        data-testid="plan-change-price-delta"
                        className={`font-semibold ${planChangeImpact.priceDelta > 0 ? 'text-amber-700' : 'text-emerald-700'}`}
                        dir="ltr"
                      >
                        {planChangeImpact.priceDelta >= 0 ? '+' : '-'}
                        {formatCurrency(Math.abs(planChangeImpact.priceDelta))} {t('common.sar')}
                      </span>
                    </div>
                  </>
                )}
                <div className="flex items-center justify-between gap-3 border-t border-neutral-100 pt-3">
                  <span className="text-neutral-500">
                    {t('subscriptions.confirmNewPrice', 'السعر الجديد')}
                  </span>
                  <span
                    data-testid="plan-change-new-price"
                    className="font-bold text-neutral-900"
                  >
                    {subscription?.billingCycle === 'annual'
                      ? t('subscriptions.annual', {
                          price: formatCurrency(pendingChange.plan.priceAnnual),
                        })
                      : `${formatCurrency(pendingChange.plan.priceMonthly)} ${t(
                          'common.sar',
                        )}${t('subscriptions.monthly')}`}
                  </span>
                </div>
                {planChangeImpact && (
                  <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-3 text-amber-900">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="text-xs text-amber-800">
                          {t('subscriptions.confirmProrationEstimate', 'تقدير التناسب الآن')}
                        </p>
                        <p
                          data-testid="plan-change-proration-estimate"
                          className="mt-1 font-bold"
                        >
                          {formatCurrency(planChangeImpact.estimatedProration)} {t('common.sar')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-800">
                          {t('subscriptions.confirmRemainingDays', 'الأيام المتبقية في الدورة الحالية')}
                        </p>
                        <p
                          data-testid="plan-change-remaining-days"
                          className="mt-1 font-bold"
                        >
                          {planChangeImpact.remainingDays} / {planChangeImpact.cycleDays}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-800">
                          {t('subscriptions.confirmEffectiveDate', 'تاريخ السريان')}
                        </p>
                        <p
                          data-testid="plan-change-effective-date"
                          className="mt-1 font-semibold"
                        >
                          {t('subscriptions.confirmEffectiveImmediately', 'فور تأكيد التغيير')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-amber-800">
                          {pendingChange.direction === 'upgrade'
                            ? t('subscriptions.confirmNextRenewal', 'التجديد القادم المتوقع')
                            : t('subscriptions.confirmCurrentPeriodEnd', 'نهاية الفترة الحالية')}
                        </p>
                        <p
                          data-testid="plan-change-next-period"
                          className="mt-1 font-semibold"
                        >
                          {formatDate(planChangeImpact.nextPeriodEnd)}
                        </p>
                      </div>
                    </div>
                    <p
                      data-testid="plan-change-proration-note"
                      className="mt-3 text-xs leading-5 text-amber-900"
                    >
                      {pendingChange.direction === 'upgrade'
                        ? t(
                            'subscriptions.confirmProrationNote',
                            'هذا تقدير مبني على فرق السعر والأيام المتبقية. الفاتورة النهائية تُحسب من النظام بعد التأكيد.',
                          )
                        : t(
                            'subscriptions.confirmDowngradeNote',
                            'لا تُنشأ فاتورة تناسب تلقائية عند التخفيض؛ سيتم حفظ الخطة فورًا مع بقاء نهاية الفترة الحالية كما هي.',
                          )}
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-500">
                    {t('subscriptions.confirmDirection', 'نوع التغيير')}
                  </span>
                  <span className="font-semibold text-neutral-900">
                    {pendingChange.direction === 'upgrade'
                      ? t('subscriptions.upgrade')
                      : t('subscriptions.downgrade')}
                  </span>
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  className="h-9 text-sm"
                  disabled={submittingChange}
                  onClick={() => setPendingChange(null)}
                >
                  {t('common.cancel', 'إلغاء')}
                </Button>
                <Button
                  data-testid="plan-change-confirm-button"
                  className="h-9 text-sm gap-2"
                  disabled={submittingChange}
                  onClick={confirmPlanChange}
                >
                  {submittingChange && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t('subscriptions.confirmChange', 'تأكيد التغيير')}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {invoices.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
          <div className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-neutral-400" />
              <h3 className="font-bold text-lg text-neutral-900">{t('subscriptions.invoices')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-100 text-start">
                    <th className="py-2 px-3 text-sm text-neutral-500 font-medium">{t('subscriptions.invoiceNumber')}</th>
                    <th className="py-2 px-3 text-sm text-neutral-500 font-medium">{t('subscriptions.amount')}</th>
                    <th className="py-2 px-3 text-sm text-neutral-500 font-medium">{t('subscriptions.vat')}</th>
                    <th className="py-2 px-3 text-sm text-neutral-500 font-medium">{t('subscriptions.total')}</th>
                    <th className="py-2 px-3 text-sm text-neutral-500 font-medium">{t('subscriptions.invoiceStatus')}</th>
                    <th className="py-2 px-3 text-sm text-neutral-500 font-medium">{t('subscriptions.invoiceDate')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-neutral-100 hover:bg-neutral-50">
                      <td className="py-2 px-3 font-mono text-xs text-neutral-900">{inv.invoiceNumber}</td>
                      <td className="py-2 px-3 text-sm text-neutral-900">{formatCurrency(inv.amount)} {t('common.sar')}</td>
                      <td className="py-2 px-3 text-sm text-neutral-900">{formatCurrency(inv.vatAmount)} {t('common.sar')}</td>
                      <td className="py-2 px-3 text-sm font-semibold text-neutral-900">{formatCurrency(inv.total)} {t('common.sar')}</td>
                      <td className="py-2 px-3">
                        <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'pending' ? 'warning' : 'secondary'} className="text-xs px-2.5 py-0.5">
                          {inv.status === 'paid' ? t('subscriptions.status_paid') :
                           inv.status === 'pending' ? t('subscriptions.status_pending') :
                           inv.status === 'overdue' ? t('subscriptions.status_overdue') : inv.status}
                        </Badge>
                      </td>
                      <td className="py-2 px-3 text-sm text-neutral-400">{formatDate(inv.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

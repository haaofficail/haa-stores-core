/**
 * marketing-rules — growth, promotion, customer-engagement signals.
 */
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Calendar,
  Crown,
  DollarSign,
  Megaphone,
  Package,
  PartyPopper,
  Percent,
  ShoppingCart,
  Sparkles,
  Store,
  Users,
  Zap,
} from 'lucide-react';
import { getUpcomingSeason } from '../../constants';
import type { RuleContext, SmartAlert } from './types.js';

type CustomerSignal = {
  name?: string | null;
  totalOrders?: number | string | null;
};

type SalesDaySignal = {
  date?: string | number | Date | null;
  sales?: number | string | null;
};

type SalesDataSignal = {
  salesByDay?: SalesDaySignal[];
};

type PromotionSignal = {
  totalUsed?: number | string | null;
};

type NotificationSignal = {
  status?: string | null;
};

export function marketingRules(ctx: RuleContext): SmartAlert[] {
  const {
    summary,
    recentCustomers,
    salesData,
    topProducts,
    abandonedCartStats,
    expiredCoupons,
    completedPromotions,
    marketplaceHub,
    notificationLogs,
    hasProducts,
    hasOrders,
    totalOrders,
    cancelledCount,
    cancelRatio,
    aov,
    firstSale,
    t,
    navigate,
  } = ctx;
  const out: SmartAlert[] = [];
  const customerSignals = recentCustomers as CustomerSignal[];
  const salesSignals = salesData as SalesDataSignal | null | undefined;
  const promotionSignals = completedPromotions as PromotionSignal[];
  const notificationSignals = notificationLogs as NotificationSignal[];

  // Welcome (greenfield store)
  if (!hasProducts && !hasOrders)
    out.push({
      id: 'welcome-start',
      type: 'info',
      priority: 3,
      icon: Sparkles,
      title: t('dashboard.alertWelcome', 'مرحباً بك في هَـا!'),
      description: t(
        'dashboard.alertWelcomeDesc',
        'ابدأ بإضافة منتجاتك الأولى',
      ),
      action: {
        label: t('dashboard.quickActions.addProduct', 'إضافة منتج'),
        onClick: () => navigate('/products?create=true'),
      },
    });

  // Customers + milestones
  if (
    customerSignals.length >= 3 &&
    customerSignals.some((c) => Number(c.totalOrders ?? 0) >= 3)
  )
    out.push({
      id: 'repeat-customer',
      type: 'success',
      priority: 4,
      icon: ShoppingCart,
      title: t('dashboard.alertRepeatCustomer', 'عميل متكرر'),
      description: t(
        'dashboard.alertRepeatCustomerDesc',
        'أحد العملاء لديه ٣+ طلبات - عميل وفي!',
      ),
      action: {
        label: t('customers.viewCustomers', 'عرض'),
        onClick: () => navigate('/customers'),
      },
    });

  if (firstSale)
    out.push({
      id: 'first-sale',
      type: 'success',
      priority: 3,
      icon: PartyPopper,
      title: t('dashboard.alertFirstSale', 'أول طلب! 🎉'),
      description: t(
        'dashboard.alertFirstSaleDesc',
        'مبروك! أول طلب في متجرك',
      ),
      action: {
        label: t('orders.viewOrders', 'عرض الطلب'),
        onClick: () => navigate('/orders'),
      },
    });

  if (totalOrders >= 10 && totalOrders < 20)
    out.push({
      id: 'milestone-10',
      type: 'success',
      priority: 4,
      icon: PartyPopper,
      title: t('dashboard.alertMilestone10', '١٠ طلبات! 🎉'),
      description: t(
        'dashboard.alertMilestone10Desc',
        'وصلت لـ ١٠ طلبات - استمر!',
      ),
      action: {
        label: t('orders.viewOrders', 'عرض'),
        onClick: () => navigate('/orders'),
      },
    });

  if (totalOrders >= 100 && totalOrders < 110)
    out.push({
      id: 'milestone-100',
      type: 'success',
      priority: 3,
      icon: PartyPopper,
      title: t('dashboard.alertMilestone100', '١٠٠ طلب! 🏆'),
      description: t(
        'dashboard.alertMilestone100Desc',
        'إنجاز كبير - مبروك!',
      ),
      action: {
        label: t('orders.viewOrders', 'عرض'),
        onClick: () => navigate('/orders'),
      },
    });

  // Cancellation + AOV signals
  if (cancelledCount > 5 && cancelRatio > 0.3)
    out.push({
      id: 'cancellation-spike',
      type: 'warning',
      priority: 2,
      icon: AlertTriangle,
      title: t('dashboard.alertCancelSpike', 'نسبة إلغاء مرتفعة'),
      description: t(
        'dashboard.alertCancelSpikeDesc',
        '{{pct}}% من الطلبات ملغية - راجع الأسباب',
      ).replace('{{pct}}', String(Math.round(cancelRatio * 100))),
      action: {
        label: t('orders.viewOrders', 'عرض'),
        onClick: () => navigate('/orders'),
      },
    });

  if (aov > 0 && aov < 20 && totalOrders > 5)
    out.push({
      id: 'low-aov',
      type: 'info',
      priority: 4,
      icon: DollarSign,
      title: t('dashboard.alertLowAov', 'معدل الطلب منخفض'),
      description: t(
        'dashboard.alertLowAovDesc',
        'متوسط قيمة الطلب {{value}} ر.س - جرّب العروض',
      ).replace('{{value}}', String(aov.toFixed(0))),
      action: {
        label: t('common.promote', 'ترويج'),
        onClick: () => navigate('/promotions'),
      },
    });

  // Top selling
  if (topProducts.length > 0 && Number(topProducts[0]?.totalQuantity) >= 50)
    out.push({
      id: 'top-selling',
      type: 'success',
      priority: 4,
      icon: Package,
      title: t('dashboard.alertTopSelling', 'منتج متصدر!'),
      description: t(
        'dashboard.alertTopSellingDesc',
        '{{name}} - {{count}} وحدة مباعة',
      )
        .replace('{{name}}', topProducts[0].name)
        .replace('{{count}}', String(topProducts[0].totalQuantity)),
      action: {
        label: t('products.view', 'عرض'),
        onClick: () => navigate('/products'),
      },
    });

  // Best customer
  if (totalOrders >= 5 && customerSignals.length > 0) {
    const best = customerSignals.reduce((a, b) =>
      Number(a.totalOrders ?? 0) > Number(b.totalOrders ?? 0) ? a : b,
    );
    if (best && Number(best.totalOrders ?? 0) >= 2)
      out.push({
        id: 'best-customer',
        type: 'success',
        priority: 4,
        icon: Crown,
        title: t('dashboard.alertBestCustomer', 'أفضل عميل'),
        description: t(
          'dashboard.alertBestCustomerDesc',
          '{{name}} - {{count}} طلبات',
        )
          .replace('{{name}}', best.name ?? t('customers.customer', 'عميل'))
          .replace('{{count}}', String(best.totalOrders)),
        action: {
          label: t('customers.view', 'عرض'),
          onClick: () => navigate('/customers'),
        },
      });
  }

  // Sales trend signals
  if ((salesSignals?.salesByDay?.length ?? 0) >= 7) {
    const days = salesSignals?.salesByDay ?? [];
    const recent = days.slice(-7);
    const avg7 =
      recent.reduce((s, d) => s + Number(d.sales), 0) / 7;
    if (avg7 === 0 && hasProducts && totalOrders > 0)
      out.push({
        id: 'no-sales-7days',
        type: 'info',
        priority: 3,
        icon: ShoppingCart,
        title: t('dashboard.alertNoSales7', 'لا مبيعات آخر ٧ أيام'),
        description: t(
          'dashboard.alertNoSales7Desc',
          'آخر ٧ أيام بدون مبيعات - تحتاج تفعيل العروض',
        ),
        action: {
          label: t('common.promote', 'ترويج'),
          onClick: () => navigate('/promotions'),
        },
      });
    const last = Number(days[days.length - 1]?.sales ?? 0);
    const prev = Number(days[days.length - 2]?.sales ?? 0);
    if (prev > 0 && last > prev * 2)
      out.push({
        id: 'sales-surge',
        type: 'success',
        priority: 3,
        icon: ArrowUpRight,
        title: t('dashboard.alertSalesSurge', 'ارتفاع المبيعات! 📈'),
        description: t(
          'dashboard.alertSalesSurgeDesc',
          'مبيعات اليوم {{today}} ر.س (ضعف الأمس {{yesterday}} ر.س)',
        )
          .replace('{{today}}', String(last.toFixed(0)))
          .replace('{{yesterday}}', String(prev.toFixed(0))),
        action: {
          label: t('common.viewReport', 'تقرير'),
          onClick: () => navigate('/reports'),
        },
      });
    if (prev > 0 && last < prev * 0.5)
      out.push({
        id: 'sales-drop',
        type: 'warning',
        priority: 1,
        icon: DollarSign,
        title: t('dashboard.alertSalesDrop', 'انخفاض المبيعات'),
        description: t(
          'dashboard.alertSalesDropDesc',
          'مبيعات اليوم أقل 50% من الأمس',
        ),
        action: {
          label: t('common.viewReport', 'عرض التقرير'),
          onClick: () => navigate('/reports'),
        },
      });
    const wd = recent.filter((_, i) => {
      const dateValue = days[days.length - 7 + i]?.date;
      if (dateValue === null || dateValue === undefined) return false;
      const d = new Date(dateValue);
      return d.getDay() > 0 && d.getDay() < 6;
    });
    const we = recent.filter((_, i) => {
      const dateValue = days[days.length - 7 + i]?.date;
      if (dateValue === null || dateValue === undefined) return false;
      const d = new Date(dateValue);
      return d.getDay() === 0 || d.getDay() === 6;
    });
    const wdAvg = wd.length
      ? wd.reduce((s, d) => s + Number(d.sales), 0) / wd.length
      : 0;
    const weAvg = we.length
      ? we.reduce((s, d) => s + Number(d.sales), 0) / we.length
      : 0;
    if (weAvg > 0 && wdAvg > 0 && weAvg < wdAvg * 0.6)
      out.push({
        id: 'weekend-sales',
        type: 'info',
        priority: 4,
        icon: Percent,
        title: t('dashboard.alertWeekend', 'فرصة نهاية الأسبوع'),
        description: t(
          'dashboard.alertWeekendDesc',
          'مبيعات نهاية الأسبوع أقل {{pct}}% - جرّب عروض نهاية الأسبوع',
        ).replace('{{pct}}', String(Math.round((1 - weAvg / wdAvg) * 100))),
        action: {
          label: t('common.create', 'إنشاء عرض'),
          onClick: () => navigate('/promotions'),
        },
      });
    let growthStreak = 0;
    for (let i = days.length - 1; i > 0; i--) {
      const curr = Number(days[i]?.sales ?? 0);
      const prevDay = Number(days[i - 1]?.sales ?? 0);
      if (curr > prevDay) growthStreak++;
      else break;
    }
    if (growthStreak >= 3)
      out.push({
        id: 'growth-streak',
        type: 'success',
        priority: 4,
        icon: ArrowUpRight,
        title: t('dashboard.alertGrowthStreak', 'نمو متواصل! 🔥'),
        description: t(
          'dashboard.alertGrowthStreakDesc',
          '{{count}} أيام متتالية من النمو - استمر!',
        ).replace('{{count}}', String(growthStreak)),
        action: {
          label: t('common.viewReport', 'تقرير'),
          onClick: () => navigate('/reports'),
        },
      });
  }

  // Abandoned + promo signals
  if (abandonedCartStats && Number(abandonedCartStats.count) > 0)
    out.push({
      id: 'abandoned-carts',
      type: 'info',
      priority: 3,
      icon: ShoppingCart,
      title: t('dashboard.alertAbandonedCarts', 'سلال مهجورة'),
      description: t(
        'dashboard.alertAbandonedCartsDesc',
        '{{count}} سلة - قيمة {{value}} ر.س',
      )
        .replace('{{count}}', String(abandonedCartStats.count))
        .replace(
          '{{value}}',
          String(Number(abandonedCartStats.recoverableTotal ?? 0).toFixed(0)),
        ),
      action: {
        label: t('common.view', 'عرض'),
        onClick: () => navigate('/carts'),
      },
    });

  if (expiredCoupons.length > 0)
    out.push({
      id: 'coupon-expired',
      type: 'info',
      priority: 4,
      icon: Percent,
      title: t('dashboard.alertExpiredCoupon', 'كود خصم منتهي'),
      description: t(
        'dashboard.alertExpiredCouponDesc',
        '{{count}} كود خصم انتهت صلاحيته',
      ).replace('{{count}}', String(expiredCoupons.length)),
      action: {
        label: t('common.manage', 'إدارة'),
        onClick: () => navigate('/coupons'),
      },
    });

  if (promotionSignals.length > 0) {
    const noResult = promotionSignals.filter(
      (p) => Number(p.totalUsed ?? 0) === 0,
    );
    if (noResult.length > 0)
      out.push({
        id: 'campaign-no-results',
        type: 'info',
        priority: 3,
        icon: Megaphone,
        title: t('dashboard.alertCampaignNoResults', 'حملات بدون نتائج'),
        description: t(
          'dashboard.alertCampaignNoResultsDesc',
          '{{count}} حملات منتهية بدون مبيعات',
        ).replace('{{count}}', String(noResult.length)),
        action: {
          label: t('common.view', 'عرض'),
          onClick: () => navigate('/promotions'),
        },
      });
  }

  if (marketplaceHub?.summary?.connectedCount === 0 && hasProducts)
    out.push({
      id: 'integrations-disconnected',
      type: 'warning',
      priority: 2,
      icon: Store,
      title: t('dashboard.alertIntegration', 'التكاملات غير مفعلة'),
      description: t(
        'dashboard.alertIntegrationDesc',
        'اربط متجرك بالأسواق الإلكترونية',
      ),
      action: {
        label: t('common.setup', 'الإعداد'),
        onClick: () => navigate('/sales/channels'),
      },
    });

  if (notificationSignals.length > 0) {
    const failed = notificationSignals.filter((l) => l.status === 'failed');
    if (failed.length >= 3)
      out.push({
        id: 'notification-failure',
        type: 'warning',
        priority: 2,
        icon: Bell,
        title: t('dashboard.alertNotificationFail', 'فشل في الإشعارات'),
        description: t(
          'dashboard.alertNotificationFailDesc',
          '{{count}} إشعارات فشل إرسالها',
        ).replace('{{count}}', String(failed.length)),
        action: {
          label: t('common.view', 'عرض'),
          onClick: () => navigate('/settings/notifications'),
        },
      });
  }

  if (hasProducts && !hasOrders && (summary?.totalProducts ?? 0) >= 5)
    out.push({
      id: 'low-conversion',
      type: 'info',
      priority: 4,
      icon: Zap,
      title: t('dashboard.alertLowConversion', 'معدل تحويل منخفض'),
      description: t(
        'dashboard.alertLowConversionDesc',
        'منتجات نشطة ولا توجد طلبات - راجع أسعارك',
      ),
      action: {
        label: t('common.promote', 'ترويج'),
        onClick: () => navigate('/promotions'),
      },
    });

  if (customerSignals.length >= 3) {
    const inactive = customerSignals.filter(
      (c) => Number(c.totalOrders ?? 0) === 0,
    );
    if (inactive.length >= 2)
      out.push({
        id: 'customers-inactive',
        type: 'info',
        priority: 4,
        icon: Users,
        title: t('dashboard.alertInactiveCustomers', 'عملاء جدد بدون تفاعل'),
        description: t(
          'dashboard.alertInactiveCustomersDesc',
          '{{count}} عملاء سجلوا ولم يطلبوا',
        ).replace('{{count}}', String(inactive.length)),
        action: {
          label: t('customers.viewCustomers', 'عرض'),
          onClick: () => navigate('/customers'),
        },
      });
  }

  const upcoming = getUpcomingSeason();
  if (upcoming)
    out.push({
      id: 'season-upcoming',
      type: 'info',
      priority: 3,
      icon: Calendar,
      title: t('dashboard.alertSeason', 'جهز للموسم!'),
      description: t(
        'dashboard.alertSeasonDesc',
        'باقي {{days}} يوم على {{event}} - حضّر عروضك',
      )
        .replace('{{days}}', String(upcoming.daysUntil))
        .replace('{{event}}', upcoming.event.title),
      action: {
        label: t('common.promote', 'استعد'),
        onClick: () => navigate('/promotions'),
      },
    });

  return out;
}

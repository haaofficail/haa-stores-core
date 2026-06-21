/**
 * useSmartAlerts — generates contextual "smart alert" suggestions.
 *
 * T2.3 extraction: 30+ rule-based alert generation that was previously inline
 * in DashboardHome.tsx (~980 LOC). Each rule evaluates a derived metric from
 * dashboard data and pushes a contextual alert if a threshold is crossed.
 *
 * Returns sorted alerts (priority asc) for the SmartAlertsStrip / DashboardHeader.
 */
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUpRight,
  Bell,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Crown,
  DollarSign,
  FileText,
  Globe,
  Layers,
  List,
  Megaphone,
  Package,
  PartyPopper,
  Percent,
  Shield,
  ShoppingCart,
  Sparkles,
  Store,
  Tag,
  Truck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { getUpcomingSeason } from "../constants";

export type SmartAlertType = "danger" | "warning" | "info" | "success";

export interface SmartAlert {
  id: string;
  type: SmartAlertType;
  priority: number;
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

interface UseSmartAlertsInput {
  summary: any;
  wallet: any;
  recentOrders: any[];
  recentCustomers: any[];
  recentItems: any[];
  lowStock: any[];
  brands: any[];
  tags: any[];
  cats: any[];
  subscription: any;
  readiness: any;
  salesData: any;
  topProducts: any[];
  orderStatusDist: any[];
  abandonedCartStats: any;
  paymentConfig: any;
  storeSettings: any;
  returnsList: any[];
  lateShipments: any[];
  expiredCoupons: any[];
  completedPromotions: any[];
  marketplaceHub: any;
  notificationLogs: any[];
  bankAccount: any;
  complianceStatus: any;
  liveSubDays: number;
  refreshKey: number;
}

export function useSmartAlerts(input: UseSmartAlertsInput): SmartAlert[] {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    summary,
    wallet,
    recentOrders,
    recentCustomers,
    lowStock,
    brands,
    tags,
    cats,
    subscription,
    readiness,
    salesData,
    topProducts,
    orderStatusDist,
    abandonedCartStats,
    paymentConfig,
    storeSettings,
    returnsList,
    lateShipments,
    expiredCoupons,
    completedPromotions,
    marketplaceHub,
    notificationLogs,
    bankAccount,
    complianceStatus,
    liveSubDays,
  } = input;

  return useMemo<SmartAlert[]>(() => {
    const result: SmartAlert[] = [];
    const subDays = liveSubDays;
    const pendingCount = recentOrders.filter(
      (o: any) => o.status === "pending_payment",
    ).length;
    const outOfStock = lowStock.filter(
      (p: any) => Number(p.stockQuantity) === 0,
    );
    const firstSale = summary?.totalOrders === 1;

    const hasProducts = (summary?.totalProducts ?? 0) > 0;
    const hasOrders = (summary?.totalOrders ?? 0) > 0;
    const totalOrders = summary?.totalOrders ?? 0;
    const totalSales = Number(summary?.totalSales ?? 0);
    const aov = hasOrders ? totalSales / totalOrders : 0;
    const cancelledOrders = orderStatusDist.find(
      (o: any) => o.status === "cancelled",
    );
    const cancelledCount = cancelledOrders?.count ?? 0;
    const cancelRatio = hasOrders ? cancelledCount / totalOrders : 0;

    if (!hasProducts && !hasOrders)
      result.push({
        id: "welcome-start",
        type: "info",
        priority: 3,
        icon: Sparkles,
        title: t("dashboard.alertWelcome", "مرحباً بك في هَـا!"),
        description: t(
          "dashboard.alertWelcomeDesc",
          "ابدأ بإضافة منتجاتك الأولى",
        ),
        action: {
          label: t("dashboard.quickActions.addProduct", "إضافة منتج"),
          onClick: () => navigate("/products?create=true"),
        },
      });
    if (lowStock.length > 0)
      result.push({
        id: "low-stock",
        type: "danger",
        priority: 1,
        icon: AlertTriangle,
        title: t("dashboard.alertLowStock", "مخزون منخفض"),
        description: t(
          "dashboard.alertLowStockDesc",
          "{{count}} منتجات تحتاج إعادة تزويد",
        ).replace("{{count}}", String(lowStock.length)),
        action: {
          label: t("common.viewDetails", "عرض التفاصيل"),
          onClick: () => navigate("/products"),
        },
      });
    if (outOfStock.length > 0)
      result.push({
        id: "out-of-stock",
        type: "danger",
        priority: 1,
        icon: AlertTriangle,
        title: t("dashboard.alertOutOfStock", "نفذ من المخزون"),
        description: t(
          "dashboard.alertOutOfStockDesc",
          "{{count}} منتجات نفذت بالكامل",
        ).replace("{{count}}", String(outOfStock.length)),
        action: {
          label: t("common.viewDetails", "عرض التفاصيل"),
          onClick: () => navigate("/products"),
        },
      });
    if (
      (summary?.activeShippingMethods ?? 0) === 0 &&
      hasProducts &&
      totalOrders === 0
    )
      result.push({
        id: "no-shipping",
        type: "warning",
        priority: 2,
        icon: Package,
        title: t("dashboard.alertNoShipping", "لم يتم إعداد الشحن"),
        description: t(
          "dashboard.alertNoShippingDesc",
          "أضف طرق شحن ليتمكن العملاء من الشراء",
        ),
        action: {
          label: t("common.setup", "الإعداد"),
          onClick: () => navigate("/settings/shipping"),
        },
      });
    if (!hasProducts)
      result.push({
        id: "no-products",
        type: "warning",
        priority: 2,
        icon: ShoppingCart,
        title: t("dashboard.alertNoProducts", "لا توجد منتجات نشطة"),
        description: t(
          "dashboard.alertNoProductsDesc",
          "أضف منتجاتك الأولى لبدء البيع",
        ),
        action: {
          label: t("dashboard.quickActions.addProduct", "إضافة منتج"),
          onClick: () => navigate("/products?create=true"),
        },
      });
    if (hasProducts && brands.length === 0)
      result.push({
        id: "no-brands",
        type: "info",
        priority: 4,
        icon: Tag,
        title: t("dashboard.alertNoBrands", "لم تُضف ماركات"),
        description: t(
          "dashboard.alertNoBrandsDesc",
          "الماركات تساعد العملاء في تصفّح منتجاتك",
        ),
        action: {
          label: t("common.setup", "الإضافة"),
          onClick: () => navigate("/brands"),
        },
      });
    if (hasProducts && cats.length === 0)
      result.push({
        id: "no-categories",
        type: "info",
        priority: 4,
        icon: Layers,
        title: t("dashboard.alertNoCategories", "لم تُضف تصنيفات"),
        description: t(
          "dashboard.alertNoCategoriesDesc",
          "التصنيفات تنظم متجرك وتساعد في البحث",
        ),
        action: {
          label: t("common.setup", "الإضافة"),
          onClick: () => navigate("/categories"),
        },
      });
    if (hasProducts && tags.length === 0)
      result.push({
        id: "no-tags",
        type: "info",
        priority: 4,
        icon: List,
        title: t("dashboard.alertNoTags", "لم تُضف تاجات"),
        description: t(
          "dashboard.alertNoTagsDesc",
          "التاجات تحسن ظهور منتجاتك في نتائج البحث",
        ),
        action: {
          label: t("common.setup", "الإضافة"),
          onClick: () => navigate("/tags"),
        },
      });
    if (subDays > 0 && subDays <= 7)
      result.push({
        id: "subscription-expiring",
        type: "danger",
        priority: 1,
        icon: Crown,
        title: t("dashboard.alertSubscription", "الاشتراك على وشك الانتهاء"),
        description: t(
          "dashboard.alertSubscriptionDesc",
          "باقي {{count}} أيام على انتهاء الاشتراك",
        ).replace("{{count}}", String(subDays)),
        action: {
          label: t("common.renew", "تجديد"),
          onClick: () => navigate("/settings/subscription"),
        },
      });
    if (subDays > 7 && subDays <= 14)
      result.push({
        id: "subscription-soon",
        type: "warning",
        priority: 3,
        icon: Crown,
        title: t("dashboard.alertSubscriptionSoon", "اقتراب انتهاء الاشتراك"),
        description: t(
          "dashboard.alertSubscriptionSoonDesc",
          "باقي {{count}} أيام - جدّد اشتراكك مبكراً",
        ).replace("{{count}}", String(subDays)),
        action: {
          label: t("common.renew", "تجديد"),
          onClick: () => navigate("/settings/subscription"),
        },
      });
    if (subscription?.status === "trialing")
      result.push({
        id: "subscription-trialing",
        type: "info",
        priority: 3,
        icon: Crown,
        title: t("dashboard.alertTrialing", "الفترة التجريبية"),
        description: t(
          "dashboard.alertTrialingDesc",
          "باقي {{count}} يوم - جرّب كل الميزات",
        ).replace("{{count}}", String(subDays)),
        action: {
          label: t("common.viewPlans", "عرض الباقات"),
          onClick: () => navigate("/settings/subscription"),
        },
      });
    if (subscription?.status === "past_due")
      result.push({
        id: "subscription-past-due",
        type: "danger",
        priority: 1,
        icon: Crown,
        title: t("dashboard.alertSubscriptionPastDue", "الاشتراك متأخر"),
        description: t(
          "dashboard.alertSubscriptionPastDueDesc",
          "رجاءً سدّد قيمة الاشتراك لتجنب الإيقاف",
        ),
        action: {
          label: t("common.payNow", "الدفع الآن"),
          onClick: () => navigate("/settings/subscription"),
        },
      });
    if (subscription?.status === "cancelled")
      result.push({
        id: "subscription-cancelled",
        type: "danger",
        priority: 1,
        icon: Crown,
        title: t("dashboard.alertCancelled", "الاشتراك ملغي"),
        description: t(
          "dashboard.alertCancelledDesc",
          "اشتراكك ملغي - جرّب باقة جديدة",
        ),
        action: {
          label: t("common.viewPlans", "عرض الباقات"),
          onClick: () => navigate("/settings/subscription"),
        },
      });
    if (pendingCount > 0)
      result.push({
        id: "pending-orders",
        type: "warning",
        priority: 2,
        icon: Clock,
        title: t("dashboard.alertPendingOrders", "طلبات معلقة"),
        description: t(
          "dashboard.alertPendingOrdersDesc",
          "{{count}} طلبات تنتظر التأكيد",
        ).replace("{{count}}", String(pendingCount)),
        action: {
          label: t("orders.viewOrders", "عرض الطلبات"),
          onClick: () => navigate("/orders"),
        },
      });
    if (summary?.actionCenter?.codCollectionCount > 0)
      result.push({
        id: "cod-collection",
        type: "warning",
        priority: 2,
        icon: Wallet,
        title: t("dashboard.alertCodCollection", "تحصيل الدفع عند الاستلام"),
        description: t(
          "dashboard.alertCodCollectionDesc",
          "يوجد طلبات دفع عند الاستلام تحتاج تسجيل التحصيل",
        ),
        action: {
          label: t("orders.viewOrders", "عرض الطلبات"),
          onClick: () =>
            navigate(
              "/orders?paymentMethod=cash_on_delivery&paymentStatus=pending",
            ),
        },
      });
    if (recentOrders.some((o: any) => o.status === "confirmed"))
      result.push({
        id: "confirmed-orders",
        type: "info",
        priority: 4,
        icon: CheckCircle2,
        title: t("dashboard.alertConfirmedOrders", "طلبات مؤكدة"),
        description: t(
          "dashboard.alertConfirmedOrdersDesc",
          "طلبات مؤكدة تحتاج تجهيز للشحن",
        ),
        action: {
          label: t("orders.viewOrders", "عرض الطلبات"),
          onClick: () => navigate("/orders"),
        },
      });
    if (recentOrders.some((o: any) => Number(o.total) >= 1000))
      result.push({
        id: "high-value-order",
        type: "success",
        priority: 4,
        icon: DollarSign,
        title: t("dashboard.alertHighValue", "طلب بقيمة عالية!"),
        description: t(
          "dashboard.alertHighValueDesc",
          "طلب بقيمة تتجاوز ١,٠٠٠ ر.س",
        ),
        action: {
          label: t("orders.viewOrders", "عرض"),
          onClick: () => navigate("/orders"),
        },
      });
    if (
      recentCustomers.length >= 3 &&
      recentCustomers.some((c: any) => (c.totalOrders ?? 0) >= 3)
    )
      result.push({
        id: "repeat-customer",
        type: "success",
        priority: 4,
        icon: ShoppingCart,
        title: t("dashboard.alertRepeatCustomer", "عميل متكرر"),
        description: t(
          "dashboard.alertRepeatCustomerDesc",
          "أحد العملاء لديه ٣+ طلبات - عميل وفي!",
        ),
        action: {
          label: t("customers.viewCustomers", "عرض"),
          onClick: () => navigate("/customers"),
        },
      });
    if (readiness && readiness.percentage < 100 && readiness.percentage > 0)
      result.push({
        id: "store-readiness",
        type: "info",
        priority: 3,
        icon: CheckCircle2,
        title: t("dashboard.alertReadiness", "المتجر غير مكتمل"),
        description: t(
          "dashboard.alertReadinessDesc",
          "اكتمال {{pct}}% - أضف {{missing}} لتحسين متجرك",
        )
          .replace("{{pct}}", String(readiness.percentage))
          .replace(
            "{{missing}}",
            String(
              readiness.items?.filter((i: any) => !i.completed).length ?? 0,
            ),
          ),
        action: {
          label: t("common.setup", "الإعداد"),
          onClick: () => navigate("/settings"),
        },
      });
    if (wallet && Number(wallet.balance) === 0 && hasOrders)
      result.push({
        id: "wallet-empty",
        type: "warning",
        priority: 2,
        icon: Wallet,
        title: t("dashboard.alertWallet", "رصيد المحفظة صفر"),
        description: t(
          "dashboard.alertWalletDesc",
          "قد تؤثر الأرصدة المنخفضة على عمليات السحب والتسوية",
        ),
      });
    if (wallet && Number(wallet.balance) > 0 && Number(wallet.balance) < 50)
      result.push({
        id: "wallet-low",
        type: "info",
        priority: 4,
        icon: Wallet,
        title: t("dashboard.alertWalletLow", "رصيد المحفظة منخفض"),
        description: t(
          "dashboard.alertWalletLowDesc",
          "الرصيد الحالي {{balance}} ر.س",
        ).replace("{{balance}}", String(Number(wallet.balance).toFixed(0))),
      });
    if (firstSale)
      result.push({
        id: "first-sale",
        type: "success",
        priority: 3,
        icon: PartyPopper,
        title: t("dashboard.alertFirstSale", "أول طلب! 🎉"),
        description: t(
          "dashboard.alertFirstSaleDesc",
          "مبروك! أول طلب في متجرك",
        ),
        action: {
          label: t("orders.viewOrders", "عرض الطلب"),
          onClick: () => navigate("/orders"),
        },
      });
    if (totalOrders >= 10 && totalOrders < 20)
      result.push({
        id: "milestone-10",
        type: "success",
        priority: 4,
        icon: PartyPopper,
        title: t("dashboard.alertMilestone10", "١٠ طلبات! 🎉"),
        description: t(
          "dashboard.alertMilestone10Desc",
          "وصلت لـ ١٠ طلبات - استمر!",
        ),
        action: {
          label: t("orders.viewOrders", "عرض"),
          onClick: () => navigate("/orders"),
        },
      });
    if (totalOrders >= 100 && totalOrders < 110)
      result.push({
        id: "milestone-100",
        type: "success",
        priority: 3,
        icon: PartyPopper,
        title: t("dashboard.alertMilestone100", "١٠٠ طلب! 🏆"),
        description: t(
          "dashboard.alertMilestone100Desc",
          "إنجاز كبير - مبروك!",
        ),
        action: {
          label: t("orders.viewOrders", "عرض"),
          onClick: () => navigate("/orders"),
        },
      });
    if (cancelledCount > 5 && cancelRatio > 0.3)
      result.push({
        id: "cancellation-spike",
        type: "warning",
        priority: 2,
        icon: AlertTriangle,
        title: t("dashboard.alertCancelSpike", "نسبة إلغاء مرتفعة"),
        description: t(
          "dashboard.alertCancelSpikeDesc",
          "{{pct}}% من الطلبات ملغية - راجع الأسباب",
        ).replace("{{pct}}", String(Math.round(cancelRatio * 100))),
        action: {
          label: t("orders.viewOrders", "عرض"),
          onClick: () => navigate("/orders"),
        },
      });
    if (aov > 0 && aov < 20 && totalOrders > 5)
      result.push({
        id: "low-aov",
        type: "info",
        priority: 4,
        icon: DollarSign,
        title: t("dashboard.alertLowAov", "معدل الطلب منخفض"),
        description: t(
          "dashboard.alertLowAovDesc",
          "متوسط قيمة الطلب {{value}} ر.س - جرّب العروض",
        ).replace("{{value}}", String(aov.toFixed(0))),
        action: {
          label: t("common.promote", "ترويج"),
          onClick: () => navigate("/promotions"),
        },
      });
    if (topProducts.length > 0 && Number(topProducts[0]?.totalQuantity) >= 50)
      result.push({
        id: "top-selling",
        type: "success",
        priority: 4,
        icon: Package,
        title: t("dashboard.alertTopSelling", "منتج متصدر!"),
        description: t(
          "dashboard.alertTopSellingDesc",
          "{{name}} - {{count}} وحدة مباعة",
        )
          .replace("{{name}}", topProducts[0].name)
          .replace("{{count}}", String(topProducts[0].totalQuantity)),
        action: {
          label: t("products.view", "عرض"),
          onClick: () => navigate("/products"),
        },
      });
    if (hasOrders && !hasProducts)
      result.push({
        id: "no-stock-missing",
        type: "warning",
        priority: 3,
        icon: Package,
        title: t("dashboard.alertNoStockMissing", "منتجات غير متاحة"),
        description: t(
          "dashboard.alertNoStockMissingDesc",
          "لديك طلبات ولكن لا توجد منتجات نشطة",
        ),
      });
    if (totalOrders >= 5 && recentCustomers.length > 0) {
      const best = recentCustomers.reduce((a: any, b: any) =>
        (a.totalOrders ?? 0) > (b.totalOrders ?? 0) ? a : b,
      );
      if (best && (best.totalOrders ?? 0) >= 2)
        result.push({
          id: "best-customer",
          type: "success",
          priority: 4,
          icon: Crown,
          title: t("dashboard.alertBestCustomer", "أفضل عميل"),
          description: t(
            "dashboard.alertBestCustomerDesc",
            "{{name}} - {{count}} طلبات",
          )
            .replace("{{name}}", best.name)
            .replace("{{count}}", String(best.totalOrders)),
          action: {
            label: t("customers.view", "عرض"),
            onClick: () => navigate("/customers"),
          },
        });
    }
    if (salesData?.salesByDay?.length >= 7) {
      const days = salesData.salesByDay;
      const recent = days.slice(-7);
      const avg7 =
        recent.reduce((s: number, d: any) => s + Number(d.sales), 0) / 7;
      if (avg7 === 0 && hasProducts && totalOrders > 0)
        result.push({
          id: "no-sales-7days",
          type: "info",
          priority: 3,
          icon: ShoppingCart,
          title: t("dashboard.alertNoSales7", "لا مبيعات آخر ٧ أيام"),
          description: t(
            "dashboard.alertNoSales7Desc",
            "آخر ٧ أيام بدون مبيعات - تحتاج تفعيل العروض",
          ),
          action: {
            label: t("common.promote", "ترويج"),
            onClick: () => navigate("/promotions"),
          },
        });
      const last = Number(days[days.length - 1]?.sales ?? 0);
      const prev = Number(days[days.length - 2]?.sales ?? 0);
      if (prev > 0 && last > prev * 2)
        result.push({
          id: "sales-surge",
          type: "success",
          priority: 3,
          icon: ArrowUpRight,
          title: t("dashboard.alertSalesSurge", "ارتفاع المبيعات! 📈"),
          description: t(
            "dashboard.alertSalesSurgeDesc",
            "مبيعات اليوم {{today}} ر.س (ضعف الأمس {{yesterday}} ر.س)",
          )
            .replace("{{today}}", String(last.toFixed(0)))
            .replace("{{yesterday}}", String(prev.toFixed(0))),
          action: {
            label: t("common.viewReport", "تقرير"),
            onClick: () => navigate("/reports"),
          },
        });
      if (prev > 0 && last < prev * 0.5)
        result.push({
          id: "sales-drop",
          type: "warning",
          priority: 1,
          icon: DollarSign,
          title: t("dashboard.alertSalesDrop", "انخفاض المبيعات"),
          description: t(
            "dashboard.alertSalesDropDesc",
            "مبيعات اليوم أقل 50% من الأمس",
          ),
          action: {
            label: t("common.viewReport", "عرض التقرير"),
            onClick: () => navigate("/reports"),
          },
        });
      const wd = recent.filter((_: any, i: number) => {
        const d = new Date(days[days.length - 7 + i]?.date);
        return d.getDay() > 0 && d.getDay() < 6;
      });
      const we = recent.filter((_: any, i: number) => {
        const d = new Date(days[days.length - 7 + i]?.date);
        return d.getDay() === 0 || d.getDay() === 6;
      });
      const wdAvg = wd.length
        ? wd.reduce((s: number, d: any) => s + Number(d.sales), 0) / wd.length
        : 0;
      const weAvg = we.length
        ? we.reduce((s: number, d: any) => s + Number(d.sales), 0) / we.length
        : 0;
      if (weAvg > 0 && wdAvg > 0 && weAvg < wdAvg * 0.6)
        result.push({
          id: "weekend-sales",
          type: "info",
          priority: 4,
          icon: Percent,
          title: t("dashboard.alertWeekend", "فرصة نهاية الأسبوع"),
          description: t(
            "dashboard.alertWeekendDesc",
            "مبيعات نهاية الأسبوع أقل {{pct}}% - جرّب عروض نهاية الأسبوع",
          ).replace("{{pct}}", String(Math.round((1 - weAvg / wdAvg) * 100))),
          action: {
            label: t("common.create", "إنشاء عرض"),
            onClick: () => navigate("/promotions"),
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
        result.push({
          id: "growth-streak",
          type: "success",
          priority: 4,
          icon: ArrowUpRight,
          title: t("dashboard.alertGrowthStreak", "نمو متواصل! 🔥"),
          description: t(
            "dashboard.alertGrowthStreakDesc",
            "{{count}} أيام متتالية من النمو - استمر!",
          ).replace("{{count}}", String(growthStreak)),
          action: {
            label: t("common.viewReport", "تقرير"),
            onClick: () => navigate("/reports"),
          },
        });
    }
    if (lowStock.length >= 3)
      result.push({
        id: "bulk-stock",
        type: "warning",
        priority: 3,
        icon: Package,
        title: t("dashboard.alertBulkStock", "جردة مخزون"),
        description: t(
          "dashboard.alertBulkStockDesc",
          "{{count}} منتجات تحتاج جردة شاملة",
        ).replace("{{count}}", String(lowStock.length)),
        action: {
          label: t("common.manage", "إدارة"),
          onClick: () => navigate("/products"),
        },
      });
    if (hasProducts && cats.length > 0) {
      const catWithMost = cats.reduce((a: any, b: any) =>
        (a.productCount ?? 0) > (b.productCount ?? 0) ? a : b,
      );
      if (catWithMost && (catWithMost.productCount ?? 0) >= 5)
        result.push({
          id: "top-category",
          type: "info",
          priority: 5,
          icon: Layers,
          title: t("dashboard.alertTopCategory", "التصنيف الأكبر"),
          description: t(
            "dashboard.alertTopCategoryDesc",
            "{{name}} - {{count}} منتجات",
          )
            .replace("{{name}}", catWithMost.name)
            .replace("{{count}}", String(catWithMost.productCount)),
        });
    }
    if (abandonedCartStats && Number(abandonedCartStats.count) > 0)
      result.push({
        id: "abandoned-carts",
        type: "info",
        priority: 3,
        icon: ShoppingCart,
        title: t("dashboard.alertAbandonedCarts", "سلال مهجورة"),
        description: t(
          "dashboard.alertAbandonedCartsDesc",
          "{{count}} سلة - قيمة {{value}} ر.س",
        )
          .replace("{{count}}", String(abandonedCartStats.count))
          .replace(
            "{{value}}",
            String(Number(abandonedCartStats.recoverableTotal ?? 0).toFixed(0)),
          ),
        action: {
          label: t("common.view", "عرض"),
          onClick: () => navigate("/carts"),
        },
      });
    if (paymentConfig && !paymentConfig.moyasarConfigured)
      result.push({
        id: "payment-not-configured",
        type: "warning",
        priority: 2,
        icon: CreditCard,
        title: t("dashboard.alertPayment", "بوابة دفع غير مفعلة"),
        description: t(
          "dashboard.alertPaymentDesc",
          "فعّل بوابة الدفع لاستقبال المدفوعات",
        ),
        action: {
          label: t("common.setup", "الإعداد"),
          onClick: () => navigate("/settings/payment"),
        },
      });
    if (storeSettings) {
      if (!storeSettings.taxNumber)
        result.push({
          id: "tax-not-configured",
          type: "warning",
          priority: 3,
          icon: Percent,
          title: t("dashboard.alertTax", "الضرائب غير مهيأة"),
          description: t(
            "dashboard.alertTaxDesc",
            "أضف الرقم الضريبي لإصدار فواتير ضريبية",
          ),
          action: {
            label: t("common.setup", "الإعداد"),
            onClick: () => navigate("/settings"),
          },
        });
      if (!storeSettings.customDomain)
        result.push({
          id: "custom-domain",
          type: "info",
          priority: 4,
          icon: Globe,
          title: t("dashboard.alertDomain", "نطاق مخصص غير مضبوط"),
          description: t(
            "dashboard.alertDomainDesc",
            "اربط نطاقك الخاص لمتجر احترافي",
          ),
          action: {
            label: t("common.setup", "الإعداد"),
            onClick: () => navigate("/settings/domain"),
          },
        });
      if (storeSettings.sslExpiry) {
        const sslDays = Math.ceil(
          (new Date(storeSettings.sslExpiry).getTime() - Date.now()) / 86400000,
        );
        if (sslDays > 0 && sslDays <= 30)
          result.push({
            id: "ssl-expiring",
            type: "danger",
            priority: 1,
            icon: Shield,
            title: t("dashboard.alertSSL", "شهادة SSL على وشك الانتهاء"),
            description: t(
              "dashboard.alertSSLDesc",
              "باقي {{count}} أيام - جدد شهادة الأمان",
            ).replace("{{count}}", String(sslDays)),
            action: {
              label: t("common.renew", "تجديد"),
              onClick: () => navigate("/settings/domain"),
            },
          });
      }
      if (storeSettings.customDomain && storeSettings.domainStatus === "error")
        result.push({
          id: "domain-mismatch",
          type: "warning",
          priority: 3,
          icon: Globe,
          title: t("dashboard.alertDomainMismatch", "النطاق المخصص غير شغال"),
          description: t(
            "dashboard.alertDomainMismatchDesc",
            "راجع إعدادات DNS",
          ),
          action: {
            label: t("common.setup", "الإعداد"),
            onClick: () => navigate("/settings/domain"),
          },
        });
    }
    if (returnsList.length > 0) {
      const returnRatio = returnsList.length / Math.max(totalOrders, 1);
      if (returnRatio > 0.2)
        result.push({
          id: "high-returns",
          type: "warning",
          priority: 2,
          icon: Package,
          title: t("dashboard.alertReturns", "نسبة مرتجعات مرتفعة"),
          description: t(
            "dashboard.alertReturnsDesc",
            "{{pct}}% من الطلبات مرتجعة - راجع الأسباب",
          ).replace("{{pct}}", String(Math.round(returnRatio * 100))),
          action: {
            label: t("orders.viewOrders", "عرض"),
            onClick: () => navigate("/orders"),
          },
        });
    }
    if (lateShipments.length > 0)
      result.push({
        id: "late-shipment",
        type: "danger",
        priority: 2,
        icon: Truck,
        title: t("dashboard.alertLateShipment", "طلبات متأخرة عن التسليم"),
        description: t(
          "dashboard.alertLateShipmentDesc",
          "{{count}} طلبات تجاوزت موعد التسليم",
        ).replace("{{count}}", String(lateShipments.length)),
        action: {
          label: t("orders.viewOrders", "عرض"),
          onClick: () => navigate("/orders"),
        },
      });
    if (expiredCoupons.length > 0)
      result.push({
        id: "coupon-expired",
        type: "info",
        priority: 4,
        icon: Percent,
        title: t("dashboard.alertExpiredCoupon", "كود خصم منتهي"),
        description: t(
          "dashboard.alertExpiredCouponDesc",
          "{{count}} كود خصم انتهت صلاحيته",
        ).replace("{{count}}", String(expiredCoupons.length)),
        action: {
          label: t("common.manage", "إدارة"),
          onClick: () => navigate("/coupons"),
        },
      });
    if (completedPromotions.length > 0) {
      const noResult = completedPromotions.filter(
        (p: any) => (p.totalUsed ?? 0) === 0,
      );
      if (noResult.length > 0)
        result.push({
          id: "campaign-no-results",
          type: "info",
          priority: 3,
          icon: Megaphone,
          title: t("dashboard.alertCampaignNoResults", "حملات بدون نتائج"),
          description: t(
            "dashboard.alertCampaignNoResultsDesc",
            "{{count}} حملات منتهية بدون مبيعات",
          ).replace("{{count}}", String(noResult.length)),
          action: {
            label: t("common.view", "عرض"),
            onClick: () => navigate("/promotions"),
          },
        });
    }
    if (marketplaceHub?.summary?.connectedCount === 0 && hasProducts)
      result.push({
        id: "integrations-disconnected",
        type: "warning",
        priority: 2,
        icon: Store,
        title: t("dashboard.alertIntegration", "التكاملات غير مفعلة"),
        description: t(
          "dashboard.alertIntegrationDesc",
          "اربط متجرك بالأسواق الإلكترونية",
        ),
        action: {
          label: t("common.setup", "الإعداد"),
          onClick: () => navigate("/channels"),
        },
      });
    if (notificationLogs.length > 0) {
      const failed = notificationLogs.filter((l: any) => l.status === "failed");
      if (failed.length >= 3)
        result.push({
          id: "notification-failure",
          type: "warning",
          priority: 2,
          icon: Bell,
          title: t("dashboard.alertNotificationFail", "فشل في الإشعارات"),
          description: t(
            "dashboard.alertNotificationFailDesc",
            "{{count}} إشعارات فشل إرسالها",
          ).replace("{{count}}", String(failed.length)),
          action: {
            label: t("common.view", "عرض"),
            onClick: () => navigate("/settings/notifications"),
          },
        });
    }
    if (!bankAccount && hasOrders)
      result.push({
        id: "no-bank-account",
        type: "info",
        priority: 3,
        icon: Building,
        title: t("dashboard.alertBankAccount", "حساب بنكي غير مضاف"),
        description: t(
          "dashboard.alertBankAccountDesc",
          "أضف حساب بنكي لاستلام التسويات",
        ),
        action: {
          label: t("common.setup", "الإعداد"),
          onClick: () => navigate("/settings/compliance"),
        },
      });
    if (complianceStatus && !complianceStatus.isComplete)
      result.push({
        id: "compliance-incomplete",
        type: "warning",
        priority: 2,
        icon: FileText,
        title: t("dashboard.alertCompliance", "بيانات الامتثال غير مكتملة"),
        description: t(
          "dashboard.alertComplianceDesc",
          "أكمل بيانات الامتثال لتجنب إيقاف الحساب",
        ),
        action: {
          label: t("common.setup", "الإعداد"),
          onClick: () => navigate("/settings/compliance"),
        },
      });
    if (hasProducts && !hasOrders && (summary?.totalProducts ?? 0) >= 5)
      result.push({
        id: "low-conversion",
        type: "info",
        priority: 4,
        icon: Zap,
        title: t("dashboard.alertLowConversion", "معدل تحويل منخفض"),
        description: t(
          "dashboard.alertLowConversionDesc",
          "منتجات نشطة ولا توجد طلبات - راجع أسعارك",
        ),
        action: {
          label: t("common.promote", "ترويج"),
          onClick: () => navigate("/promotions"),
        },
      });
    if (recentCustomers.length >= 3) {
      const inactive = recentCustomers.filter(
        (c: any) => (c.totalOrders ?? 0) === 0,
      );
      if (inactive.length >= 2)
        result.push({
          id: "customers-inactive",
          type: "info",
          priority: 4,
          icon: Users,
          title: t("dashboard.alertInactiveCustomers", "عملاء جدد بدون تفاعل"),
          description: t(
            "dashboard.alertInactiveCustomersDesc",
            "{{count}} عملاء سجلوا ولم يطلبوا",
          ).replace("{{count}}", String(inactive.length)),
          action: {
            label: t("customers.viewCustomers", "عرض"),
            onClick: () => navigate("/customers"),
          },
        });
    }
    const upcoming = getUpcomingSeason();
    if (upcoming)
      result.push({
        id: "season-upcoming",
        type: "info",
        priority: 3,
        icon: Calendar,
        title: t("dashboard.alertSeason", "جهز للموسم!"),
        description: t(
          "dashboard.alertSeasonDesc",
          "باقي {{days}} يوم على {{event}} - حضّر عروضك",
        )
          .replace("{{days}}", String(upcoming.daysUntil))
          .replace("{{event}}", upcoming.event.title),
        action: {
          label: t("common.promote", "استعد"),
          onClick: () => navigate("/promotions"),
        },
      });
    return result.sort((a, b) => a.priority - b.priority);
  }, [
    lowStock,
    summary,
    subscription,
    recentOrders,
    readiness,
    wallet,
    navigate,
    t,
    liveSubDays,
    salesData,
    brands,
    cats,
    tags,
    recentCustomers,
    orderStatusDist,
    topProducts,
    abandonedCartStats,
    paymentConfig,
    storeSettings,
    returnsList,
    lateShipments,
    expiredCoupons,
    completedPromotions,
    marketplaceHub,
    notificationLogs,
    bankAccount,
    complianceStatus,
  ]);
}

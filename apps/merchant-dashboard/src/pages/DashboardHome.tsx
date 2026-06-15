import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import {
  dashboardApi,
  ordersApi,
  settingsApi,
  walletApi,
  reportsApi,
  brandsApi,
  tagsApi,
  categoriesApi,
  customersApi,
  productsApi,
  aiApi,
  subscriptionApi,
  abandonedCartsApi,
  paymentApi,
  shippingApi,
  couponsApi,
  promotionsApi,
  marketplaceApi,
  notificationApi,
  complianceApi,
} from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle2,
  List,
  Percent,
  Globe,
  Sparkles,
  PartyPopper,
  Clock,
  Wallet,
  Tag,
  Layers,
  ArrowUpRight,
  Crown,
  CreditCard,
  Shield,
  Bell,
  Zap,
  Building,
  FileText,
  Calendar,
  Megaphone,
  Store,
  Truck,
  Users,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  getRemainingDays,
  getUpcomingSeason,
} from "./dashboard/constants";
import { StatsCards, type StatCardData } from "./dashboard/StatsCards";
import { SalesChart } from "./dashboard/SalesChart";
import { CategoryPieChart } from "./dashboard/CategoryPieChart";
import { NextActionBanner, type ActionCenterItem } from "./dashboard/NextActionBanner";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { SubscriptionBadge } from "./dashboard/SubscriptionBadge";
import { PrimaryKpiCards } from "./dashboard/PrimaryKpiCards";
import { RecentActionableOrders, type ActionableOrder } from "./dashboard/RecentActionableOrders";
import { StoreReadinessBanner } from "./dashboard/StoreReadinessBanner";
import { LowStockList } from "./dashboard/LowStockList";
import { RecentSoldProducts } from "./dashboard/RecentSoldProducts";
import { AiGreetingCard } from "./dashboard/AiGreetingCard";
import { RecentCustomersList } from "./dashboard/RecentCustomersList";
import { QuickActionsGrid } from "./dashboard/QuickActionsGrid";
import { SmartAlertsStrip } from "./dashboard/SmartAlertsStrip";
import { WelcomeBanner } from "./dashboard/WelcomeBanner";
import { TopProductsList } from "./dashboard/TopProductsList";
import { QuickStatsGrid } from "./dashboard/QuickStatsGrid";
import { ShowMoreKpiToggle } from "./dashboard/ShowMoreKpiToggle";

export default function DashboardHome() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const loadIdRef = useRef(0);

  const [summary, setSummary] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentItems, setRecentItems] = useState<any[]>([]);
  const [salesData, setSalesData] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [orderStatusDist, setOrderStatusDist] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
  const [updatingStock, setUpdatingStock] = useState<number | null>(null);
  const [brands, setBrands] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [cats, setCats] = useState<any[]>([]);
  const [readiness, setReadiness] = useState<any>(null);
  const [aiGreeting, setAiGreeting] = useState<string | null>(null);
  const [abandonedCartStats, setAbandonedCartStats] = useState<any>(null);
  const [paymentConfig, setPaymentConfig] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<any>(null);
  const [returnsList, setReturnsList] = useState<any[]>([]);
  const [lateShipments, setLateShipments] = useState<any[]>([]);
  const [expiredCoupons, setExpiredCoupons] = useState<any[]>([]);
  const [completedPromotions, setCompletedPromotions] = useState<any[]>([]);
  const [marketplaceHub, setMarketplaceHub] = useState<any>(null);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [complianceStatus, setComplianceStatus] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);

  const load = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    const id = ++loadIdRef.current;
    setLoading(true);
    const onboardingDone = localStorage.getItem("onboarding_done");

    const results = await Promise.allSettled([
      dashboardApi.summary(storeId),
      walletApi.summary(storeId),
      ordersApi.list(storeId, { limit: 5 }),
      ordersApi.recentItems(storeId, 5),
      reportsApi.salesSummary(storeId),
      reportsApi.topProducts(storeId, 5),
      reportsApi.ordersByStatus(storeId),
      reportsApi.lowStock(storeId, 5),
      customersApi.list(storeId, { limit: 5 }),
      brandsApi.list(storeId),
      tagsApi.list(storeId),
      categoriesApi.list(storeId),
      settingsApi.readiness(storeId),
      onboardingDone
        ? aiApi.dailySummary(storeId).catch(() => null)
        : Promise.resolve(null),
      subscriptionApi.getCurrent(storeId).catch(() => null),
      abandonedCartsApi.stats(storeId).catch(() => null),
      paymentApi.status(storeId).catch(() => null),
      settingsApi.get(storeId).catch(() => null),
      shippingApi.listReturns(storeId).catch(() => []),
      shippingApi.shipments
        .list(storeId, { status: "shipped" })
        .catch(() => []),
      couponsApi.list(storeId, { status: "expired" }).catch(() => []),
      promotionsApi.list(storeId, { status: "completed" }).catch(() => []),
      marketplaceApi.hub(storeId).catch(() => null),
      notificationApi.getLogs(storeId).catch(() => []),
      complianceApi.getBankAccount(storeId).catch(() => null),
      complianceApi.getStatus(storeId).catch(() => null),
    ]);

    if (id !== loadIdRef.current) return;
    if (results[0].status === "fulfilled") setSummary(results[0].value);
    if (results[1].status === "fulfilled") setWallet(results[1].value);
    if (results[2].status === "fulfilled")
      setRecentOrders(results[2].value?.data ?? []);
    if (results[3].status === "fulfilled")
      setRecentItems(results[3].value ?? []);
    if (results[4].status === "fulfilled") setSalesData(results[4].value);
    if (results[5].status === "fulfilled")
      setTopProducts(results[5].value ?? []);
    if (results[6].status === "fulfilled")
      setOrderStatusDist(results[6].value ?? []);
    if (results[7].status === "fulfilled") setLowStock(results[7].value ?? []);
    if (results[8].status === "fulfilled")
      setRecentCustomers(results[8].value?.data ?? []);
    if (results[9].status === "fulfilled") setBrands(results[9].value ?? []);
    if (results[10].status === "fulfilled") setTags(results[10].value ?? []);
    if (results[11].status === "fulfilled") setCats(results[11].value ?? []);
    if (results[12].status === "fulfilled") setReadiness(results[12].value);
    if (results[13].status === "fulfilled" && results[13].value) {
      setAiGreeting((results[13].value as any).text);
    }
    if (results[14].status === "fulfilled") setSubscription(results[14].value);
    if (results[15]?.status === "fulfilled")
      setAbandonedCartStats(results[15].value);
    if (results[16]?.status === "fulfilled")
      setPaymentConfig(results[16].value);
    if (results[17]?.status === "fulfilled")
      setStoreSettings(results[17].value);
    if (results[18]?.status === "fulfilled") setReturnsList(results[18].value);
    if (results[19]?.status === "fulfilled")
      setLateShipments(results[19].value);
    if (results[20]?.status === "fulfilled")
      setExpiredCoupons(results[20].value);
    if (results[21]?.status === "fulfilled")
      setCompletedPromotions(results[21].value);
    if (results[22]?.status === "fulfilled")
      setMarketplaceHub(results[22].value);
    if (results[23]?.status === "fulfilled")
      setNotificationLogs(results[23].value);
    if (results[24]?.status === "fulfilled") setBankAccount(results[24].value);
    if (results[25]?.status === "fulfilled")
      setComplianceStatus(results[25].value);

    let hasError = false;
    results.forEach((r) => {
      if (r.status === "rejected" && !hasError) {
        hasError = true;
        toast.error(t("dashboard.loadError", "فشل تحميل بعض البيانات"));
      }
    });

    setLoading(false);
  }, [storeId, refreshKey]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStockUpdate = async (productId: number, newStock: number) => {
    if (!storeId) return;
    setUpdatingStock(productId);
    try {
      await productsApi.update(storeId, productId, { stockQuantity: newStock });
      toast.success(t("stock.updated", "تم تحديث المخزون"));
      load();
    } catch {
      toast.error(t("stock.updateFailed", "فشل تحديث المخزون"));
    } finally {
      setUpdatingStock(null);
    }
  };

  const totalSalesFormatted = summary?.totalSales
    ? formatCurrency(summary.totalSales)
    : "0.00";

  const walletBalanceFormatted = wallet?.balance
    ? formatCurrency(wallet.balance)
    : "0.00";

  const salesTrend = useMemo(() => {
    if (!salesData?.salesByDay?.length) return null;
    const days = salesData.salesByDay;
    if (days.length < 2) return null;
    const mid = Math.floor(days.length / 2);
    const firstHalf = days
      .slice(0, mid)
      .reduce((s: number, d: any) => s + Number(d.sales), 0);
    const secondHalf = days
      .slice(mid)
      .reduce((s: number, d: any) => s + Number(d.sales), 0);
    if (firstHalf === 0)
      return {
        direction: "neutral",
        pct: t("dashboard.trendNewActivity", "نشاط جديد"),
      };
    const pct = (((secondHalf - firstHalf) / firstHalf) * 100).toFixed(1);
    return {
      direction: pct.startsWith("-") ? "down" : "up",
      pct: `${pct.startsWith("-") ? "" : "+"}${pct}%`,
    };
  }, [salesData]);

  const stats: StatCardData[] = useMemo(
    () => [
      {
        label: t("dashboard.totalSales", "إجمالي المبيعات"),
        value: totalSalesFormatted,
        suffix: t("common.sar", "ر.س"),
        icon: DollarSign,
        gradient: "from-emerald-400 via-emerald-500 to-teal-600",
        shadow: "shadow-emerald-500/25",
        bgGlow: "bg-emerald-500/5",
        trend: salesTrend?.direction ?? "neutral",
        trendValue: salesTrend?.pct ?? "",
      },
      {
        label: t("dashboard.totalOrders", "إجمالي الطلبات"),
        value: String(summary?.totalOrders ?? 0),
        suffix: "",
        icon: ShoppingCart,
        gradient: "from-blue-400 via-blue-500 to-indigo-600",
        shadow: "shadow-blue-500/25",
        bgGlow: "bg-blue-500/5",
        trend: "neutral",
        trendValue: "",
      },
      {
        label: t("dashboard.newOrders", "طلبات جديدة"),
        value: String(summary?.newOrders ?? 0),
        suffix: "",
        icon: Clock,
        gradient: "from-amber-400 via-amber-500 to-orange-600",
        shadow: "shadow-amber-500/25",
        bgGlow: "bg-amber-500/5",
        trend: "neutral",
        trendValue: "",
      },
      {
        label: t("dashboard.activeProducts", "منتجات نشطة"),
        value: String(summary?.activeProducts ?? 0),
        suffix: "",
        icon: Package,
        gradient: "from-violet-400 via-violet-500 to-purple-600",
        shadow: "shadow-violet-500/25",
        bgGlow: "bg-violet-500/5",
        trend: "neutral",
        trendValue: "",
      },
      {
        label: t("dashboard.wallet", "المحفظة"),
        value: walletBalanceFormatted,
        suffix: t("common.sar", "ر.س"),
        icon: Wallet,
        gradient: "from-rose-400 via-rose-500 to-pink-600",
        shadow: "shadow-rose-500/25",
        bgGlow: "bg-rose-500/5",
        trend: "neutral",
        trendValue: "",
      },
    ],
    [totalSalesFormatted, summary, walletBalanceFormatted, salesTrend],
  );

  type SmartAlert = {
    id: string;
    type: "danger" | "warning" | "info" | "success";
    priority: number;
    icon: React.ElementType;
    title: string;
    description: string;
    action?: { label: string; onClick: () => void };
  };

  const [dismissingAlerts, setDismissingAlerts] = useState<Set<string>>(
    new Set(),
  );
  const [liveSubDays, setLiveSubDays] = useState(
    getRemainingDays(subscription?.currentPeriodEnd ?? null),
  );

  useEffect(() => {
    setLiveSubDays(getRemainingDays(subscription?.currentPeriodEnd ?? null));
    if (!subscription?.currentPeriodEnd) return;
    const interval = setInterval(() => {
      setLiveSubDays(getRemainingDays(subscription?.currentPeriodEnd ?? null));
    }, 60000);
    return () => clearInterval(interval);
  }, [subscription?.currentPeriodEnd]);

  const dismissedAlerts = useMemo(() => {
    try {
      return new Set(
        JSON.parse(localStorage.getItem("dismissed_alerts") || "[]"),
      );
    } catch {
      return new Set<string>();
    }
  }, [refreshKey]);

  const dismissAlert = (id: string) => {
    setDismissingAlerts((prev) => new Set(prev).add(id));
    setTimeout(() => {
      const set = new Set(dismissedAlerts);
      set.add(id);
      localStorage.setItem("dismissed_alerts", JSON.stringify([...set]));
      setDismissingAlerts((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      setRefreshKey((k) => k + 1);
    }, 300);
  };

  const smartAlerts: SmartAlert[] = useMemo(() => {
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
    // === NEW ALERTS ===
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

  const visibleAlerts = smartAlerts.filter((a) => !dismissedAlerts.has(a.id));

  const [onboardingJustDone, setOnboardingJustDone] = useState(
    localStorage.getItem("onboarding_done") &&
      !localStorage.getItem("onboarding_banner_dismissed"),
  );

  // ── Computed values for mobile-first layout ──────────────────────
  const actionableOrderTotal = useMemo(() => {
    if (!summary?.actionCenter) return 0;
    const ac = summary.actionCenter;
    return (
      (ac.newOrdersCount || 0) +
      (ac.readyToShipCount || 0) +
      (ac.readyForPickupCount || 0) +
      (ac.codCollectionCount || 0)
    );
  }, [summary]);

  const todaySales = useMemo(() => {
    if (!salesData?.salesByDay?.length) return 0;
    return Number(
      salesData.salesByDay[salesData.salesByDay.length - 1]?.sales ?? 0,
    );
  }, [salesData]);

  const prevSales = useMemo(() => {
    if (!salesData?.salesByDay || salesData.salesByDay.length < 2) return 0;
    return Number(
      salesData.salesByDay[salesData.salesByDay.length - 2]?.sales ?? 0,
    );
  }, [salesData]);

  const salesTrendLabel = useMemo(() => {
    if (!todaySales && !prevSales) return "";
    if (prevSales === 0) return todaySales > 0 ? "جديد" : "";
    const pct = (((todaySales - prevSales) / prevSales) * 100).toFixed(0);
    return pct.startsWith("-") ? `${pct}%` : `+${pct}%`;
  }, [todaySales, prevSales]);

  const [showMore, setShowMore] = useState(false);
  const [showMoreKpi, setShowMoreKpi] = useState(false);

  // Must be defined unconditionally (before early return) to obey Rules of Hooks
  const acItems: ActionCenterItem[] = useMemo(() => {
    if (!summary?.actionCenter) return [];
    const ac = summary.actionCenter;
    const items: {
      key: string;
      count: number;
      label: string;
      color: string;
      bg: string;
      textColor: string;
      link: string;
    }[] = [];
    if (ac.codCollectionCount > 0)
      items.push({
        key: "cod",
        count: ac.codCollectionCount,
        label: "تحصيل COD",
        color: "from-amber-500 to-orange-600",
        bg: "bg-amber-50",
        textColor: "text-amber-700",
        link: "/orders?paymentMethod=cash_on_delivery&paymentStatus=pending",
      });
    if (ac.readyToShipCount > 0)
      items.push({
        key: "ship",
        count: ac.readyToShipCount,
        label: "جاهز للشحن",
        color: "from-indigo-500 to-indigo-600",
        bg: "bg-indigo-50",
        textColor: "text-indigo-700",
        link: "/orders?status=ready_to_ship",
      });
    if (ac.readyForPickupCount > 0)
      items.push({
        key: "pickup",
        count: ac.readyForPickupCount,
        label: "جاهز للاستلام",
        color: "from-violet-500 to-violet-600",
        bg: "bg-violet-50",
        textColor: "text-violet-700",
        link: "/orders?status=ready_for_pickup",
      });
    if (ac.newOrdersCount > 0)
      items.push({
        key: "new",
        count: ac.newOrdersCount,
        label: "طلبات جديدة",
        color: "from-blue-500 to-blue-600",
        bg: "bg-blue-50",
        textColor: "text-blue-700",
        link: "/orders?status=pending_payment",
      });
    const stockCount =
      (ac.lowStockProductsCount || 0) + (ac.outOfStockProductsCount || 0);
    if (stockCount > 0)
      items.push({
        key: "stock",
        count: stockCount,
        label: "المخزون",
        color: "from-rose-500 to-pink-600",
        bg: "bg-rose-50",
        textColor: "text-rose-700",
        link: "/products",
      });
    return items;
  }, [summary]);

  if (loading) {
    return (
      <div className="space-y-3 max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
        <Skeleton className="h-10 rounded-xl w-full" />
        <div className="grid gap-2 grid-cols-2">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-20 rounded-xl" />
        </div>
        <Skeleton className="h-14 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
        <div className="grid gap-2 grid-cols-2">
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
          <Skeleton className="h-10 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto animate-fade-in px-3 sm:px-4 md:px-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <DashboardHeader
        t={t}
        visibleAlerts={visibleAlerts}
        onRefresh={() => setRefreshKey((k) => k + 1)}
      />

      {/* ── Subscription badge (mobile-compact) ──────────────────── */}
      <SubscriptionBadge subscription={subscription} t={t} />

      {/* Smart Alerts — critical only, compact */}
      <SmartAlertsStrip
        alerts={visibleAlerts as SmartAlert[]}
        dismissingIds={dismissingAlerts}
        onDismiss={dismissAlert}
      />

      {/* Welcome Banner */}
      {onboardingJustDone && (
        <WelcomeBanner
          t={t}
          onDismiss={() => {
            localStorage.setItem("onboarding_banner_dismissed", "true");
            setOnboardingJustDone(false);
          }}
        />
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      {/* Mobile: only 2 primary KPIs visible, rest behind toggle */}
      {/* Desktop: all 5 stats cards */}
      <div>
        {/* Visible on all screens */}
        <PrimaryKpiCards
          todaySales={todaySales}
          salesTrendLabel={salesTrendLabel}
          actionableOrderTotal={actionableOrderTotal}
          t={t}
        />

        {/* "عرض المزيد" toggle (mobile only) */}
        <ShowMoreKpiToggle
          showMore={showMoreKpi}
          onToggle={() => setShowMoreKpi((v) => !v)}
          t={t}
        />

        {/* Extended KPI (desktop: always, mobile: when toggled) */}
        <StatsCards stats={stats} showOnMobile={showMoreKpi} />
      </div>

      {/* ── Action Center ──────────────────────────────────────────── */}
      {acItems.length > 0 && (
        <NextActionBanner items={acItems} t={t} />
      )}

      {/* ── Recent Actionable Orders ────────────────────────────────── */}
      {summary?.recentActionableOrders && summary.recentActionableOrders.length > 0 && (
        <RecentActionableOrders
          orders={summary.recentActionableOrders as ActionableOrder[]}
          t={t}
        />
      )}

      {/* ── Store Readiness (one-liner summary) ───────────────────── */}
      {summary?.readiness && summary.readiness.issues.length > 0 && (
        <StoreReadinessBanner readiness={summary.readiness} t={t} />
      )}

      {/* ── Low Stock (compact, max 3) ─────────────────────────────── */}
      {lowStock.length > 0 && (
        <LowStockList
          products={lowStock}
          updatingStockId={updatingStock}
          onUpdateStock={handleStockUpdate}
          t={t}
        />
      )}

      {/* Quick Actions */}
      <QuickActionsGrid t={t} />

      {/* ── Analytics Section — collapsible ───────────────────────── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card overflow-hidden">
        <button
          onClick={() => setShowAnalytics((v) => !v)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-neutral-50 transition-colors"
        >
          <h3 className="font-bold text-sm sm:text-base text-neutral-900">
            {t("dashboard.analytics", "تحليلات")}
          </h3>
          <ChevronDown
            className={`h-4 w-4 text-neutral-400 transition-transform ${showAnalytics ? "rotate-0" : "-rotate-90"}`}
          />
        </button>
        {showAnalytics && (
          <div className="px-5 pb-5 space-y-5">
            {/* Charts Row */}
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {/* Sales Chart */}
              <SalesChart salesData={salesData} t={t} i18nLanguage={i18n.language} />

              {/* Order Distribution */}
              <CategoryPieChart orderStatusDist={orderStatusDist} t={t} />
            </div>

            {/* Middle Row: Recent Sold Products + Top Products */}
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {/* Recent Sold Products */}
              <RecentSoldProducts orders={recentItems} t={t} />

              {/* Top Products + Quick Actions */}
              <div className="col-span-2 space-y-5">
                {/* Top Products */}
                <TopProductsList products={topProducts} t={t} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── AI Greeting — compact ──────────────────────────────────── */}
      {aiGreeting && <AiGreetingCard greeting={aiGreeting} t={t} />}

      {/* ── المزيد ────────────────────────────────────────────────── */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card overflow-hidden">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          className="w-full flex items-center justify-between px-4 sm:px-5 py-3 sm:py-4 hover:bg-neutral-50 transition-colors"
        >
          <h3 className="font-bold text-sm sm:text-base text-neutral-900">
            {t("dashboard.more", "المزيد")}
          </h3>
          <ChevronDown
            className={`h-4 w-4 text-neutral-400 transition-transform ${showMore ? "" : "-rotate-90"}`}
          />
        </button>
        {showMore && (
          <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-4">
            {/* ── Recent Customers ────────────────────────────────── */}
            <RecentCustomersList customers={recentCustomers} t={t} />

            {/* ── Quick Stats (zero-value items hidden) ──────────── */}
            <QuickStatsGrid
              brandsCount={brands.length}
              tagsCount={tags.length}
              categoriesCount={cats.length}
              productsCount={summary?.totalProducts ?? 0}
              ordersCount={summary?.totalOrders ?? 0}
              t={t}
            />
          </div>
        )}
      </div>
    </div>
  );
}

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
import { cn, formatNumber, formatCurrency } from "@/lib/utils";
import { handleImageError } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle2,
  Plus,
  List,
  Percent,
  Globe,
  Sparkles,
  Bot,
  PartyPopper,
  Clock,
  Wallet,
  Tag,
  Layers,
  RotateCw,
  ImageIcon,
  ArrowUpRight,
  ArrowDownRight,
  Crown,
  X,
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
  Menu,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { toast } from "sonner";

const CHART_COLORS = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

function getRemainingDays(endDate: string | null): number {
  if (!endDate) return 0;
  return Math.max(
    0,
    Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000),
  );
}

function formatTimeAgo(
  t: (key: string, options?: any) => string,
  date: string | Date,
): string {
  const now = new Date();
  const d = new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t("time.now", "الآن");
  if (diffMin < 60)
    return t("time.minutesAgo", "منذ {{count}} دقيقة").replace(
      "{{count}}",
      String(diffMin),
    );
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)
    return t("time.hoursAgo", "منذ {{count}} ساعة").replace(
      "{{count}}",
      String(diffHr),
    );
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7)
    return t("time.daysAgo", "منذ {{count}} يوم").replace(
      "{{count}}",
      String(diffDay),
    );
  return d.toLocaleDateString("ar-SA", { month: "short", day: "numeric" });
}

type SeasonEvent = { key: string; title: string; icon: string; date: Date };
function getUpcomingSeason(): { event: SeasonEvent; daysUntil: number } | null {
  const now = new Date();
  const y = now.getFullYear();
  const events: SeasonEvent[] = [
    {
      key: "valentine",
      title: "عيد الحب",
      icon: "heart",
      date: new Date(y, 1, 14),
    },
    { key: "ramadan", title: "رمضان", icon: "moon", date: new Date(y, 1, 18) },
    {
      key: "eid-fitr",
      title: "عيد الفطر",
      icon: "star",
      date: new Date(y, 2, 20),
    },
    {
      key: "eid-adha",
      title: "عيد الأضحى",
      icon: "star",
      date: new Date(y, 5, 27),
    },
    {
      key: "back-to-school",
      title: "العودة للمدارس",
      icon: "book",
      date: new Date(y, 7, 25),
    },
    {
      key: "national-day",
      title: "اليوم الوطني",
      icon: "flag",
      date: new Date(y, 8, 23),
    },
    {
      key: "white-friday",
      title: "الجمعة البيضاء",
      icon: "shopping-bag",
      date: new Date(y, 10, 27),
    },
  ];
  for (const event of events) {
    const diff = Math.ceil((event.date.getTime() - now.getTime()) / 86400000);
    if (diff >= 0 && diff <= 45) return { event, daysUntil: diff };
  }
  return null;
}

const _orderStatusColors: Record<string, string> = {
  draft: "bg-neutral-200 text-neutral-700",
  checkout_started: "bg-neutral-200 text-neutral-700",
  pending_payment: "bg-amber-100 text-amber-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  ready_to_ship: "bg-indigo-100 text-indigo-700",
  ready_for_pickup: "bg-emerald-100 text-emerald-700",
  shipped: "bg-blue-100 text-blue-700",
  picked_up: "bg-emerald-100 text-emerald-700",
  delivered: "bg-emerald-100 text-emerald-700",
  completed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-amber-100 text-amber-700",
  refunded: "bg-red-100 text-red-700",
  partially_refunded: "bg-amber-100 text-amber-700",
  returned_to_sender: "bg-amber-100 text-amber-700",
};

const _arabicStatusLabels: Record<string, string> = {
  draft: "مسودة",
  pending_payment: "في انتظار الدفع",
  confirmed: "مؤكد",
  processing: "قيد التجهيز",
  ready_to_ship: "جاهز للشحن",
  ready_for_pickup: "جاهز للاستلام",
  shipped: "تم الشحن",
  picked_up: "تم الاستلام",
  delivered: "تم التوصيل",
  completed: "مكتمل",
  cancelled: "ملغي",
  returned: "مرتجع",
  refunded: "مسترد",
  partially_refunded: "مسترد جزئياً",
  returned_to_sender: "مرتجع للمرسل",
};

const _arabicPaymentLabels: Record<string, string> = {
  unpaid: "غير مدفوع",
  pending: "بانتظار التحصيل",
  paid: "مدفوع",
  refunded: "مسترد",
  partially_refunded: "مسترد جزئياً",
};

function getNextActionLabel(order: {
  status: string;
  paymentMethod: string | null;
  paymentStatus: string;
  fulfillmentType: string | null;
}): string {
  if (order.status === "pending_payment") return "بانتظار الدفع";
  if (order.status === "confirmed") return "تأكيد الطلب";
  if (order.status === "processing") return "تجهيز الطلب";
  if (
    order.status === "ready_to_ship" &&
    order.fulfillmentType !== "local_pickup"
  )
    return "شحن الطلب";
  if (
    order.status === "ready_for_pickup" &&
    order.fulfillmentType === "local_pickup"
  )
    return "استلام من الفرع";
  if (
    order.status === "delivered" &&
    order.paymentMethod === "cash_on_delivery" &&
    order.paymentStatus === "pending"
  )
    return "تحصيل COD";
  if (
    order.status === "picked_up" &&
    order.paymentMethod === "cash_on_delivery" &&
    order.paymentStatus === "pending"
  )
    return "تحصيل COD";
  if (order.status === "shipped") return "متابعة الشحن";
  return "—";
}

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

  const stats = useMemo(
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
          onClick: () => navigate("/marketplace"),
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
  const acItems = useMemo(() => {
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            className="lg:hidden p-2 -ml-2 rounded-xl hover:bg-neutral-100 transition-colors shrink-0"
            onClick={() => {/* sidebar toggle handled by layout */}}
          >
            <Menu className="h-5 w-5 text-neutral-700" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold text-neutral-900 truncate">
              {t("dashboard.title", "لوحة التحكم")}
            </h1>
            <p className="text-xs text-neutral-400 truncate">
              {formatTimeAgo(t, new Date())}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-neutral-100 transition-colors relative"
            title={t("common.notifications", "الإشعارات")}
          >
            <Bell className="h-5 w-5 text-neutral-600" />
            {visibleAlerts.filter((a) => a.type === "danger" || a.type === "warning").length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
            )}
          </button>
          <button
            type="button"
            className="p-2 rounded-xl hover:bg-neutral-100 transition-colors"
            onClick={() => setRefreshKey((k) => k + 1)}
            title={t("common.refresh", "تحديث")}
          >
            <RotateCw className="h-4 w-4 text-neutral-600" />
          </button>
        </div>
      </div>

      {/* ── Subscription badge (mobile-compact) ──────────────────── */}
      {subscription && (
        <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl bg-white/80 border border-neutral-200/50 shadow-sm w-fit">
          <Crown className="h-3 w-3 text-amber-500 shrink-0" />
          <span className="font-medium text-neutral-600">
            {subscription.planName}
          </span>
          <span
            className={cn(
              "font-bold px-1.5 py-0.5 rounded-full text-[10px]",
              subscription.status === "active"
                ? "bg-emerald-50 text-emerald-600"
                : subscription.status === "trialing"
                  ? "bg-blue-50 text-blue-600"
                  : "bg-red-50 text-red-600",
            )}
          >
            {subscription.status === "active"
              ? t("subscriptions.status_active", "نشط")
              : subscription.status === "trialing"
                ? t("subscriptions.status_trialing", "تجريبي")
                : subscription.status === "cancelled"
                  ? t("subscriptions.status_cancelled", "ملغي")
                  : subscription.status === "past_due"
                    ? t("subscriptions.status_past_due", "متأخر")
                    : subscription.status}
          </span>
          {(() => {
            const days = getRemainingDays(subscription.currentPeriodEnd);
            const color =
              days <= 7
                ? "text-red-600"
                : days <= 30
                  ? "text-amber-600"
                  : "text-emerald-600";
            return (
              <span className={`font-semibold ${color}`}>
                {t("subscriptions.remainingDays", "{{count}} يوم").replace(
                  "{{count}}",
                  String(days),
                )}
              </span>
            );
          })()}
        </div>
      )}

      {/* Smart Alerts — critical only, compact */}
      {visibleAlerts
        .filter((a) => a.type === "danger" || a.type === "warning")
        .slice(0, 3).length > 0 && (
        <div className="rounded-2xl border border-white/50 bg-white/80 backdrop-blur-xl shadow-card p-3">
          <div className="flex flex-wrap gap-1.5">
            {visibleAlerts
              .filter((a) => a.type === "danger" || a.type === "warning")
              .slice(0, 3)
              .map((alert) => {
                const isDismissing = dismissingAlerts.has(alert.id);
                const borderMap = {
                  danger: "border-red-200 bg-red-50",
                  warning: "border-amber-200 bg-amber-50",
                  info: "border-blue-200 bg-blue-50",
                  success: "border-emerald-200 bg-emerald-50",
                } as const;
                const iconMap = {
                  danger: "text-red-500",
                  warning: "text-amber-500",
                  info: "text-blue-500",
                  success: "text-emerald-500",
                } as const;
                return (
                  <div
                    key={alert.id}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border backdrop-blur-sm transition-all duration-300
                    ${borderMap[alert.type as keyof typeof borderMap] || "border-neutral-100 bg-neutral-50"} ${isDismissing ? "opacity-0 scale-95" : ""}`}
                  >
                    <alert.icon
                      className={`h-3 w-3 shrink-0 ${iconMap[alert.type as keyof typeof iconMap] || "text-neutral-500"}`}
                    />
                    <span className="text-xs font-bold text-neutral-900 whitespace-nowrap">
                      {alert.title}
                    </span>
                    <span className="text-[11px] text-neutral-500 truncate max-w-[160px]">
                      {alert.description}
                    </span>
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
                    >
                      <X className="h-2.5 w-2.5 text-neutral-400" />
                    </button>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Welcome Banner */}
      {onboardingJustDone && (
        <div className="relative overflow-hidden bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-2xl shadow-emerald-500/30">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full -translate-x-32 -translate-y-32 blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 h-48 bg-white/5 rounded-full translate-x-24 translate-y-24 blur-2xl" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <PartyPopper className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-bold text-base">
                  {t("dashboard.firstWelcomeTitle", "تهانينا! متجرك جاهز")}
                </h2>
                <p className="text-emerald-50 text-sm">
                  {t(
                    "dashboard.firstWelcomeDesc",
                    "يمكنك الآن البدء في إدارة متجرك ومتابعة الطلبات",
                  )}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-white/80 hover:text-white hover:bg-white/10 h-10 text-sm rounded-xl"
              onClick={() => {
                localStorage.setItem("onboarding_banner_dismissed", "true");
                setOnboardingJustDone(false);
              }}
            >
              {t("common.close", "إغلاق")}
            </Button>
          </div>
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      {/* Mobile: only 2 primary KPIs visible, rest behind toggle */}
      {/* Desktop: all 5 stats cards */}
      <div>
        {/* Visible on all screens */}
        <div className="grid gap-3 grid-cols-2">
          {/* Today's Sales */}
          <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-card">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/5 rounded-full translate-x-10 -translate-y-10 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                  <DollarSign className="h-3.5 w-3.5" />
                </div>
                {salesTrendLabel && (
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-xl font-bold text-[10px] text-emerald-600 bg-emerald-50">
                    <ArrowUpRight className="h-2.5 w-2.5" />
                    <span>{salesTrendLabel}</span>
                  </div>
                )}
              </div>
              <p className="text-xl font-bold text-neutral-900 tabular-nums leading-none mb-1.5">
                {formatNumber(todaySales)}
                <span className="text-xs font-medium text-neutral-400" style={{ marginInlineEnd: "0.25rem" }}>
                  {t("common.sar", "ر.س")}
                </span>
              </p>
              <p className="text-xs text-neutral-500 font-medium">
                {t("dashboard.todaySales", "مبيعات اليوم")}
              </p>
            </div>
          </div>
          {/* Actionable Orders */}
          <div className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-card">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 rounded-full translate-x-10 -translate-y-10 blur-2xl" />
            <div className="relative">
              <div className="flex items-start justify-between mb-2">
                <div className="p-2 rounded-xl bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25">
                  <ShoppingCart className="h-3.5 w-3.5" />
                </div>
                {actionableOrderTotal > 0 && (
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                )}
              </div>
              <p className="text-xl font-bold text-neutral-900 tabular-nums leading-none mb-1.5">
                {actionableOrderTotal}
              </p>
              <p className="text-xs text-neutral-500 font-medium">
                {t("dashboard.actionableOrders", "طلبات تحتاج إجراء")}
              </p>
            </div>
          </div>
        </div>

        {/* "عرض المزيد" toggle (mobile only) */}
        <div className="sm:hidden mt-2">
          <button
            type="button"
            onClick={() => setShowMoreKpi((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
          >
            {showMoreKpi
              ? t("common.showLess", "عرض أقل")
              : t("common.showMore", "عرض المزيد")}
            <ChevronDown
              className={`h-3 w-3 transition-transform ${showMoreKpi ? "rotate-180" : ""}`}
            />
          </button>
        </div>

        {/* Extended KPI (desktop: always, mobile: when toggled) */}
        <div className={`grid gap-3 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 mt-3 ${showMoreKpi ? "" : "hidden sm:grid"}`}>
          {stats.map((s) => (
            <div
              key={s.label}
              className="relative overflow-hidden bg-white/80 backdrop-blur-xl rounded-2xl p-4 border border-white/50 shadow-card"
            >
              <div className={`absolute top-0 right-0 w-20 h-20 ${s.bgGlow} rounded-full translate-x-10 -translate-y-10 blur-2xl`} />
              <div className="relative">
                <div className="flex items-start justify-between mb-2">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${s.gradient} text-white shadow-lg ${s.shadow}`}>
                    <s.icon className="h-3.5 w-3.5" />
                  </div>
                  {s.trendValue && (
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-xl font-bold text-[10px] ${
                      s.trend === "up"
                        ? "text-emerald-600 bg-emerald-50"
                        : s.trend === "down"
                          ? "text-red-600 bg-red-50"
                          : "text-neutral-500 bg-neutral-100"
                    }`}>
                      {s.trend === "up" ? <ArrowUpRight className="h-2.5 w-2.5" /> : s.trend === "down" ? <ArrowDownRight className="h-2.5 w-2.5" /> : null}
                      <span>{s.trendValue}</span>
                    </div>
                  )}
                </div>
                <p className="text-xl font-bold text-neutral-900 tabular-nums leading-none mb-1.5">
                  {s.value}
                  <span className="text-xs font-medium text-neutral-400" style={{ marginInlineEnd: "0.25rem" }}>{s.suffix}</span>
                </p>
                <p className="text-xs text-neutral-500 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Action Center ──────────────────────────────────────────── */}
      {acItems.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-neutral-900">
                {t("dashboard.actionCenter.title", "مركز الإجراءات")}
              </h2>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                {t(
                  "dashboard.actionCenter.subtitle",
                  "أهم الأشياء التي تحتاج تصرفك الآن",
                )}
              </p>
            </div>
            {acItems.length > 3 && (
              <button
                onClick={() => navigate("/orders")}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
              >
                {t("dashboard.actionCenter.viewAll", "عرض الكل")}
              </button>
            )}
          </div>
          {/* Mobile: flex row, overflow scroll; Desktop: full grid */}
          <div className="flex gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 md:grid-cols-5 sm:overflow-visible sm:pb-0">
            {(acItems.length <= 3 ? acItems : acItems.slice(0, 3)).map((item) => (
              <button
                key={item.key}
                onClick={() => navigate(item.link)}
                className="shrink-0 flex items-center gap-2 px-3 py-2.5 rounded-xl border sm:flex-col sm:items-start sm:p-4 transition-all hover:shadow-sm"
                style={{ borderColor: item.bg === 'bg-amber-50' ? '#fde68a' : item.bg === 'bg-indigo-50' ? '#c7d2fe' : item.bg === 'bg-violet-50' ? '#ddd6fe' : item.bg === 'bg-blue-50' ? '#bfdbfe' : '#fecaca' }}
              >
                <span
                  className={`text-lg sm:text-2xl font-bold tabular-nums leading-none ${item.textColor}`}
                >
                  {item.count}
                </span>
                <div className="text-right sm:mt-1">
                  <p className={`text-xs sm:text-sm font-bold ${item.textColor}`}>
                    {item.label}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Actionable Orders ────────────────────────────────── */}
      {summary?.recentActionableOrders && summary.recentActionableOrders.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-sm sm:text-base text-neutral-900">
              {t(
                "dashboard.recentActionable.title",
                "آخر الطلبات التي تحتاج إجراء",
              )}
            </h2>
            <button
              onClick={() => navigate("/orders")}
              className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors"
            >
              {t("dashboard.recentActionable.viewAll", "عرض الكل")}
            </button>
          </div>
          <div className="divide-y divide-neutral-100">
            {summary.recentActionableOrders.slice(0, 3).map(
              (order: {
                id: number;
                orderNumber: string;
                customerName: string | null;
                total: string;
                status: string;
                paymentStatus: string;
                paymentMethod: string | null;
                fulfillmentType: string | null;
                source: string | null;
                createdAt: string;
              }) => {
                  const statusLabel =
                    _arabicStatusLabels[order.status] || order.status;
                  const statusCls =
                    _orderStatusColors[order.status] ||
                    "bg-neutral-200 text-neutral-700";
                  const payLabel =
                    order.paymentMethod === "cash_on_delivery" &&
                    order.paymentStatus === "pending"
                      ? "COD"
                      : _arabicPaymentLabels[order.paymentStatus] ||
                        order.paymentStatus;
                  const fulfillmentLabel =
                    order.fulfillmentType === "local_pickup"
                      ? "استلام"
                      : "توصيل";
                  const nextAction = getNextActionLabel(order);
                  /* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */
                  return (
                    <div
                      key={order.id}
                      className="flex items-center gap-3 py-3 first:pt-0 last:pb-0 hover:bg-neutral-50/50 rounded-lg px-2 -mx-2 transition-colors cursor-pointer"
                      onClick={() => navigate(`/orders?orderId=${order.id}`)}
                    >
                      {/* Order info: number + customer + total */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-neutral-900 tabular-nums">
                            #{order.orderNumber}
                          </span>
                          <span className="text-xs text-neutral-500">·</span>
                          <span className="text-sm text-neutral-700 truncate">
                            {order.customerName || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span
                            className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${statusCls}`}
                          >
                            {statusLabel}
                          </span>
                          <span className="text-[10px] text-neutral-300">
                            |
                          </span>
                          <span
                            className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${order.fulfillmentType === "local_pickup" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}
                          >
                            {fulfillmentLabel}
                          </span>
                          <span className="text-[10px] text-neutral-300">
                            |
                          </span>
                          <span
                            className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${order.paymentMethod === "cash_on_delivery" && order.paymentStatus === "pending" ? "bg-amber-100 text-amber-700" : order.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600"}`}
                          >
                            {payLabel}
                          </span>
                        </div>
                      </div>
                      {/* Total + next action */}
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-bold tabular-nums text-neutral-900">
                          {formatCurrency(order.total)} {t("common.sar", "ر.س")}
                        </span>
                        <span className="text-[10px] text-neutral-400">
                          {nextAction}
                        </span>
                      </div>
                      {/* Open button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/orders?orderId=${order.id}`);
                        }}
                        className="text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-xl transition-all flex-shrink-0"
                      >
                        {t("dashboard.recentActionable.open", "فتح الطلب")}
                      </button>
                    </div>
                  );
                },
              )}
          </div>
        </div>
      )}

      {/* ── Store Readiness (one-liner summary) ───────────────────── */}
      {summary?.readiness && summary.readiness.issues.length > 0 && (
        <button
          type="button"
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl border border-red-100 bg-red-50/50 hover:bg-red-50 transition-colors text-right"
        >
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span className="text-xs font-bold text-red-700 flex-1 truncate">
            {summary.readiness.issues.length === 1
              ? summary.readiness.issues[0].title
              : t("dashboard.readiness.multipleIssues", "{{count}} مشاكل تحتاج حل").replace("{{count}}", String(summary.readiness.issues.length))}
          </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-500 tabular-nums shrink-0">
            {summary.readiness.score}%
          </span>
          <ChevronDown className="h-3 w-3 text-neutral-400 shrink-0" />
        </button>
      )}

      {/* ── Low Stock (compact, max 3) ─────────────────────────────── */}
      {lowStock.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-4 sm:p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm sm:text-base text-neutral-900 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>{t("dashboard.lowStock", "مخزون منخفض")}</span>
              <span className="text-[11px] font-bold text-white bg-red-500 px-1.5 py-0.5 rounded-full">
                {lowStock.length}
              </span>
            </h3>
            {lowStock.length > 3 && (
              <button
                onClick={() => navigate("/products")}
                className="text-xs font-bold text-blue-600"
              >
                {t("common.viewAll", "عرض الكل")}
              </button>
            )}
          </div>
          <div className="space-y-1.5">
            {lowStock.slice(0, 3).map((p: any) => (
              <div
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl border border-red-100 bg-red-50/50"
              >
                <span className="text-sm font-medium text-neutral-900 truncate flex-1 min-w-0">
                  {p.name}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-red-600 tabular-nums">
                    {t("stock.pieces", "{{count}}").replace("{{count}}", String(p.stockQuantity))}
                  </span>
                  <button
                    onClick={() =>
                      handleStockUpdate(p.id, (p.stockQuantity || 0) + 1)
                    }
                    disabled={updatingStock === p.id}
                    className="px-2 py-0.5 text-[11px] font-bold text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg border border-emerald-200 transition-colors disabled:opacity-50"
                  >
                    +1
                  </button>
                  {updatingStock === p.id && (
                    <span className="text-xs text-neutral-400">...</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-4">
        <h3 className="font-bold text-xs text-neutral-500 mb-3">
          {t("dashboard.quickActions.title", "إجراءات سريعة")}
        </h3>
        <div className="grid gap-2 grid-cols-2 sm:grid-cols-4">
          <button
            onClick={() => navigate("/products?create=true")}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-bold">
              {t("dashboard.quickActions.addProduct", "منتج")}
            </span>
          </button>
          <button
            onClick={() => navigate("/orders")}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-neutral-100 text-neutral-900 hover:bg-neutral-200 transition-all hover:-translate-y-0.5"
          >
            <List className="h-4 w-4" />
            <span className="text-sm font-bold">
              {t("dashboard.quickActions.viewOrders", "طلبات")}
            </span>
          </button>
          <button
            onClick={() => navigate("/coupons")}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-neutral-100 text-neutral-900 hover:bg-neutral-200 transition-all hover:-translate-y-0.5"
          >
            <Percent className="h-4 w-4" />
            <span className="text-sm font-bold">
              {t("dashboard.quickActions.createCoupon", "كوبون")}
            </span>
          </button>
          <button
            onClick={() => {
              const storeSlug =
                window.location.hostname === "localhost"
                  ? "haa-demo"
                  : window.location.pathname.split("/s/")[1]?.split("/")[0] ||
                    "haa-demo";
              const baseUrl =
                import.meta.env.VITE_STOREFRONT_URL ||
                (window.location.hostname === "localhost"
                  ? "http://localhost:3000"
                  : window.location.origin);
              window.open(`${baseUrl}/s/${storeSlug}`, "_blank");
            }}
            className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-neutral-100 text-neutral-900 hover:bg-neutral-200 transition-all hover:-translate-y-0.5"
          >
            <Globe className="h-4 w-4" />
            <span className="text-sm font-bold">
              {t("dashboard.quickActions.openStore", "المتجر")}
            </span>
          </button>
        </div>
      </div>

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
              <div className="col-span-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-base text-neutral-900">
                    {t("dashboard.salesLast30Days", "المبيعات (آخر ٣٠ يوم)")}
                  </h3>
                  {salesData && (
                    <div className="flex items-center gap-3 text-xs text-neutral-500">
                      <span className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-indigo-500" />{" "}
                        {t("common.total", "الإجمالي:")}{" "}
                        {formatNumber(salesData.totalSales ?? 0)}{" "}
                        {t("common.sar", "ر.س")}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-neutral-300" />{" "}
                        {t("common.totalOrders", "الطلبات:")}{" "}
                        {salesData.totalOrders ?? 0}
                      </span>
                    </div>
                  )}
                </div>
                {salesData?.salesByDay?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <AreaChart
                      data={salesData.salesByDay}
                      margin={{ top: 5, right: 5, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="salesGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#6366f1"
                            stopOpacity={0.2}
                          />
                          <stop
                            offset="95%"
                            stopColor="#6366f1"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        tickFormatter={(d: string) =>
                          new Date(d).toLocaleDateString(
                            i18n.language === "ar" ? "ar-SA" : i18n.language,
                            { day: "numeric", month: "short" },
                          )
                        }
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          fontSize: 13,
                        }}
                        formatter={(value: any) => [
                          formatNumber(value) + " " + t("common.sar", "ر.س"),
                          t("common.sales", "المبيعات"),
                        ]}
                        labelFormatter={(d: string) =>
                          new Date(d).toLocaleDateString(
                            i18n.language === "ar" ? "ar-SA" : i18n.language,
                            {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            },
                          )
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#salesGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center text-sm text-neutral-400">
                    {t("dashboard.noSalesData", "لا توجد بيانات مبيعات كافية")}
                  </div>
                )}
              </div>

              {/* Order Distribution */}
              <div className="col-span-2 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-5">
                <h3 className="font-bold text-base text-neutral-900 mb-3">
                  {t("dashboard.orderDistribution", "توزيع الطلبات")}
                </h3>
                {orderStatusDist.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie
                          data={orderStatusDist}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="status"
                        >
                          {orderStatusDist.map((_, i) => (
                            <Cell
                              key={i}
                              fill={CHART_COLORS[i % CHART_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid #e2e8f0",
                            fontSize: 13,
                          }}
                          formatter={(value: any, name: any) => [value, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2">
                      {orderStatusDist.slice(0, 5).map((item, i) => (
                        <div
                          key={item.status}
                          className="flex items-center gap-2 text-sm"
                        >
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                CHART_COLORS[i % CHART_COLORS.length],
                            }}
                          />
                          <span className="flex-1 text-neutral-600">
                            {t(`orders.status_${item.status}`)}
                          </span>
                          <span className="font-bold text-neutral-900">
                            {item.count}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-sm text-neutral-400">
                    {t("dashboard.noOrders", "لا توجد طلبات")}
                  </div>
                )}
              </div>
            </div>

            {/* Middle Row: Recent Sold Products + Top Products */}
            <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
              {/* Recent Sold Products */}
              <div className="col-span-3 bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100">
                  <h3 className="font-bold text-base text-neutral-900">
                    {t("dashboard.recentSoldProducts", "آخر المنتجات المباعة")}
                  </h3>
                  <button
                    className="text-sm text-blue-600 hover:text-blue-700 font-bold"
                    onClick={() => navigate("/orders")}
                  >
                    {t("common.viewAll", "عرض الكل")}
                  </button>
                </div>
                <div className="p-4">
                  {recentItems.length === 0 ? (
                    <div className="text-center py-6">
                      <div className="inline-flex p-3 rounded-xl bg-neutral-100 mb-2">
                        <ShoppingCart className="h-6 w-6 text-neutral-400" />
                      </div>
                      <p className="text-sm text-neutral-500">
                        {t(
                          "dashboard.noProductsSold",
                          "لا توجد منتجات مباعة بعد",
                        )}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-neutral-100">
                      {recentItems.flatMap((order: any) =>
                        order.items?.map((item: any) => (
                          <div
                            key={`${order.id}-${item.id}`}
                            className="flex items-center gap-3 py-3 px-2 hover:bg-neutral-50 rounded-xl transition-colors"
                          >
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shrink-0">
                              {item.productThumbUrl || item.productImageUrl ? (
                                <img
                                  src={
                                    item.productThumbUrl || item.productImageUrl
                                  }
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                  onError={handleImageError}
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center text-neutral-300">
                                  <ImageIcon className="h-5 w-5" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-neutral-900 truncate">
                                {item.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-neutral-400">
                                  {t("common.quantity", "العدد:")}{" "}
                                  {item.quantity}
                                </span>
                                <span className="text-xs text-neutral-300">
                                  •
                                </span>
                                <span className="text-xs text-neutral-500 font-medium">
                                  {formatCurrency(item.totalPrice)}{" "}
                                  {t("common.sar", "ر.س")}
                                </span>
                                <span className="text-xs text-neutral-300">
                                  •
                                </span>
                                <span className="text-xs text-neutral-400">
                                  {order.orderNumber}
                                </span>
                              </div>
                            </div>
                            <span className="text-xs text-neutral-400 shrink-0">
                              {formatTimeAgo(t, order.createdAt)}
                            </span>
                          </div>
                        )),
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Products + Quick Actions */}
              <div className="col-span-2 space-y-5">
                {/* Top Products */}
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-5">
                  <h3 className="font-bold text-base text-neutral-900 mb-3 flex items-center gap-2">
                    {t("dashboard.topProducts", "أفضل المنتجات")}
                    <span className="text-xs font-normal text-neutral-400">
                      {t("dashboard.byRevenue", "(حسب الإيرادات)")}
                    </span>
                  </h3>
                  {topProducts.length > 0 ? (
                    <div className="space-y-4">
                      {(() => {
                        const maxRevenue = Math.max(
                          ...topProducts.map((p) => Number(p.totalRevenue)),
                        );
                        const totalRevenue = topProducts.reduce(
                          (s, p) => s + Number(p.totalRevenue),
                          0,
                        );
                        return topProducts.map((p, i) => {
                          const revenue = Number(p.totalRevenue);
                          const pct =
                            totalRevenue > 0
                              ? (revenue / totalRevenue) * 100
                              : 0;
                          return (
                            <div key={p.productId}>
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={`h-6 w-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-neutral-100 text-neutral-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-neutral-50 text-neutral-400"}`}
                                  >
                                    {i + 1}
                                  </span>
                                  <p className="text-sm font-medium text-neutral-900 truncate">
                                    {p.name}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="text-xs text-neutral-400">
                                    {p.totalQuantity} {t("common.sold", "مباع")}
                                  </span>
                                  <span className="text-xs font-bold text-neutral-900">
                                    {formatNumber(revenue)}{" "}
                                    {t("common.sar", "ر.س")}
                                  </span>
                                  <span
                                    className="text-xs font-bold"
                                    style={{
                                      color:
                                        CHART_COLORS[i % CHART_COLORS.length],
                                    }}
                                  >
                                    {pct.toFixed(0)}%
                                  </span>
                                </div>
                              </div>
                              <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${(revenue / maxRevenue) * 100}%`,
                                    background: `linear-gradient(to left, ${CHART_COLORS[i % CHART_COLORS.length]}, ${CHART_COLORS[(i + 1) % CHART_COLORS.length]})`,
                                  }}
                                />
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm text-neutral-400 text-center py-6">
                      {t("common.noData", "لا توجد بيانات كافية")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── AI Greeting — compact ──────────────────────────────────── */}
      {aiGreeting && (
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 via-indigo-50 to-violet-50 rounded-2xl p-4 border border-blue-200/50 shadow-card">
          <div className="relative flex items-start gap-2.5">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl text-white shadow-lg shadow-blue-500/25 shrink-0">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                <span className="text-sm font-bold text-blue-900">
                  {t("dashboard.aiAssistant", "المساعد الذكي")}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded-full font-medium">
                  <Sparkles className="h-2.5 w-2.5" />
                  {t("dashboard.aiPowered", "AI")}
                </span>
              </div>
              <p className="text-xs text-neutral-600">{aiGreeting}</p>
            </div>
          </div>
        </div>
      )}

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
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
                <h3 className="font-bold text-sm text-neutral-900">
                  {t("dashboard.recentCustomers", "آخر العملاء")}
                </h3>
                <button
                  className="text-xs text-blue-600 hover:text-blue-700 font-bold"
                  onClick={() => navigate("/customers")}
                >
                  {t("common.viewAll", "عرض الكل")}
                </button>
              </div>
              <div className="p-3">
                {recentCustomers.length === 0 ? (
                  <div className="text-center py-4">
                    <div className="inline-flex p-2 rounded-xl bg-neutral-100 mb-1.5">
                      <ShoppingCart className="h-5 w-5 text-neutral-400" />
                    </div>
                    <p className="text-xs text-neutral-500">
                      {t("dashboard.noCustomers", "لا يوجد عملاء")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {recentCustomers.slice(0, 5).map((c: any) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-neutral-100"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                            {c.name?.charAt(0) || "?"}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-neutral-900 truncate">
                              {c.name}
                            </p>
                            <p className="text-[11px] text-neutral-400 truncate dir-ltr text-left">
                              {c.phone || c.email || "—"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[11px] text-neutral-400">
                            {c.totalOrders || 0}
                          </span>
                          {c.phone && (
                            <a
                              href={`tel:${c.phone}`}
                              className="p-0.5 text-blue-500"
                              title={t("common.call", "اتصال")}
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                              </svg>
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Quick Stats (zero-value items hidden) ──────────── */}
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl border border-white/50 shadow-card p-4">
              <h3 className="font-bold text-sm text-neutral-900 mb-3">
                {t("dashboard.quickStats", "إحصائيات سريعة")}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { icon: Tag, label: t("common.brands", "ماركات"), count: brands.length, color: "from-blue-400 to-blue-600", bg: "bg-blue-50" },
                  { icon: Layers, label: t("common.tags", "تاجات"), count: tags.length, color: "from-purple-400 to-purple-600", bg: "bg-purple-50" },
                  { icon: Package, label: t("common.categories", "تصنيفات"), count: cats.length, color: "from-amber-400 to-amber-600", bg: "bg-amber-50" },
                  { icon: ShoppingCart, label: t("common.products", "منتجات"), count: summary?.totalProducts ?? 0, color: "from-emerald-400 to-emerald-600", bg: "bg-emerald-50" },
                  { icon: List, label: t("common.orders", "طلبات"), count: summary?.totalOrders ?? 0, color: "from-rose-400 to-rose-600", bg: "bg-rose-50" },
                ].filter((item) => item.count > 0).map((item) => (
                  <div
                    key={item.label}
                    className={`flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl ${item.bg} border border-transparent transition-colors`}
                  >
                    <div className={`p-1.5 rounded-lg bg-gradient-to-br ${item.color} text-white shadow-sm`}>
                      <item.icon className="h-3 w-3" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-neutral-900 leading-none">
                        {item.count}
                      </p>
                      <p className="text-[11px] text-neutral-500 mt-0.5">
                        {item.label}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

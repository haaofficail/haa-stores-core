/**
 * useDashboardData — orchestrator hook for DashboardHome.
 *
 * T2.3 extraction: handles all the fetching + state + derived data
 * (salesTrend, stats, liveSubDays, dismissedAlerts) that was previously
 * inline in DashboardHome.tsx (~1400 LOC).
 *
 * Returns a clean object that DashboardHome passes down to sub-components.
 */
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  Clock,
  DollarSign,
  Package,
  ShoppingCart,
  Wallet,
} from "lucide-react";
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
import { getRemainingDays } from "../constants";
import type { StatCardData } from "../StatsCards";

export interface DashboardData {
  // Core state
  loading: boolean;
  fetchError: boolean;
  refreshKey: number;
  refresh: () => void;

  // Summary data
  summary: any;
  wallet: any;
  salesData: any;
  topProducts: any[];
  orderStatusDist: any[];
  lowStock: any[];
  recentOrders: any[];
  recentItems: any[];
  recentCustomers: any[];
  brands: any[];
  tags: any[];
  cats: any[];
  subscription: any;
  readiness: any;
  aiGreeting: string | null;

  // Compliance + ops
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

  // Stock mutation
  updatingStock: number | null;
  handleStockUpdate: (productId: number, newStock: number) => Promise<void>;

  // Derived
  liveSubDays: number;
  dismissedAlerts: Set<string>;
  stats: StatCardData[];
  salesTrend: { direction: "up" | "down" | "neutral"; pct: string } | null;
}

export function useDashboardData(): DashboardData {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
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

  const load = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    const id = ++loadIdRef.current;
    setLoading(true);
    setFetchError(false);
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
    else setFetchError(true);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshKey intentionally forces recomputation on manual refresh though unused in body
  }, [storeId, refreshKey, t]);

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

  // Derived
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
        direction: "neutral" as const,
        pct: t("dashboard.trendNewActivity", "نشاط جديد"),
      };
    const pct = (((secondHalf - firstHalf) / firstHalf) * 100).toFixed(1);
    return {
      direction: pct.startsWith("-") ? ("down" as const) : ("up" as const),
      pct: `${pct.startsWith("-") ? "" : "+"}${pct}%`,
    };
  }, [salesData, t]);

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
        gradient: "from-primary-400 via-primary-500 to-primary-700",
        shadow: "shadow-primary-500/25",
        bgGlow: "bg-primary-500/5",
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
    [totalSalesFormatted, summary, walletBalanceFormatted, salesTrend, t],
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

  const dismissedAlerts = useMemo<Set<string>>(() => {
    try {
      return new Set<string>(
        JSON.parse(localStorage.getItem("dismissed_alerts") || "[]"),
      );
    } catch {
      return new Set<string>();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refreshKey intentionally forces recomputation on manual refresh though unused in body
  }, [refreshKey]);

  const refresh = () => setRefreshKey((k) => k + 1);

  return {
    loading,
    fetchError,
    refreshKey,
    refresh,
    summary,
    wallet,
    salesData,
    topProducts,
    orderStatusDist,
    lowStock,
    recentOrders,
    recentItems,
    recentCustomers,
    brands,
    tags,
    cats,
    subscription,
    readiness,
    aiGreeting,
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
    updatingStock,
    handleStockUpdate,
    liveSubDays,
    dismissedAlerts,
    stats,
    salesTrend,
  };
}

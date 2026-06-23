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
  // secondaryLoading is true while the deferred (below-the-fold)
  // batch is still in-flight after the critical batch resolved. UI
  // can show skeletons for secondary cards while letting the
  // primary KPI strip render immediately.
  secondaryLoading: boolean;
  fetchError: boolean;
  refreshKey: number;
  refresh: () => void;

  // Summary data
  summary: unknown;
  wallet: unknown;
  salesData: unknown;
  topProducts: unknown[];
  orderStatusDist: unknown[];
  lowStock: unknown[];
  recentOrders: unknown[];
  recentItems: unknown[];
  recentCustomers: unknown[];
  brands: unknown[];
  tags: unknown[];
  cats: unknown[];
  subscription: unknown;
  readiness: unknown;
  aiGreeting: string | null;

  // Compliance + ops
  abandonedCartStats: unknown;
  paymentConfig: unknown;
  storeSettings: unknown;
  returnsList: unknown[];
  lateShipments: unknown[];
  expiredCoupons: unknown[];
  completedPromotions: unknown[];
  marketplaceHub: unknown;
  notificationLogs: unknown[];
  bankAccount: unknown;
  complianceStatus: unknown;

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
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const loadIdRef = useRef(0);

  const [summary, setSummary] = useState<unknown>(null);
  const [wallet, setWallet] = useState<unknown>(null);
  const [recentOrders, setRecentOrders] = useState<unknown[]>([]);
  const [recentItems, setRecentItems] = useState<unknown[]>([]);
  const [salesData, setSalesData] = useState<unknown>(null);
  const [topProducts, setTopProducts] = useState<unknown[]>([]);
  const [orderStatusDist, setOrderStatusDist] = useState<unknown[]>([]);
  const [lowStock, setLowStock] = useState<unknown[]>([]);
  const [recentCustomers, setRecentCustomers] = useState<unknown[]>([]);
  const [updatingStock, setUpdatingStock] = useState<number | null>(null);
  const [brands, setBrands] = useState<unknown[]>([]);
  const [tags, setTags] = useState<unknown[]>([]);
  const [subscription, setSubscription] = useState<unknown>(null);
  const [cats, setCats] = useState<unknown[]>([]);
  const [readiness, setReadiness] = useState<unknown>(null);
  const [aiGreeting, setAiGreeting] = useState<string | null>(null);
  const [abandonedCartStats, setAbandonedCartStats] = useState<unknown>(null);
  const [paymentConfig, setPaymentConfig] = useState<unknown>(null);
  const [storeSettings, setStoreSettings] = useState<unknown>(null);
  const [returnsList, setReturnsList] = useState<unknown[]>([]);
  const [lateShipments, setLateShipments] = useState<unknown[]>([]);
  const [expiredCoupons, setExpiredCoupons] = useState<unknown[]>([]);
  const [completedPromotions, setCompletedPromotions] = useState<unknown[]>([]);
  const [marketplaceHub, setMarketplaceHub] = useState<unknown>(null);
  const [notificationLogs, setNotificationLogs] = useState<unknown[]>([]);
  const [bankAccount, setBankAccount] = useState<unknown>(null);
  const [complianceStatus, setComplianceStatus] = useState<unknown>(null);

  // P1 audit fix — split 26 parallel calls into two batches.
  //
  // Critical batch (top 6 KPI cards + recent orders + sales chart =
  // above-the-fold): fires immediately on mount and toggles `loading`
  // off as soon as it resolves.
  //
  // Secondary batch (compliance, integrations, marketing, ops): fires
  // ONLY after the critical batch resolved, scheduled via
  // requestIdleCallback so it never blocks the paint of the primary
  // KPIs. UI cards bound to secondary data can show skeletons via the
  // `secondaryLoading` flag while it's in-flight.
  const load = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      setSecondaryLoading(false);
      return;
    }
    const id = ++loadIdRef.current;
    setLoading(true);
    setSecondaryLoading(true);
    setFetchError(false);
    const onboardingDone = localStorage.getItem("onboarding_done");

    // ---- Critical: above-the-fold KPIs + chart (8 calls) ----
    const critical = await Promise.allSettled([
      dashboardApi.summary(storeId),
      walletApi.summary(storeId),
      ordersApi.list(storeId, { limit: 5 }),
      ordersApi.recentItems(storeId, 5),
      reportsApi.salesSummary(storeId),
      settingsApi.readiness(storeId),
      reportsApi.lowStock(storeId, 5),
      subscriptionApi.getCurrent(storeId).catch(() => null),
    ]);

    if (id !== loadIdRef.current) return;
    if (critical[0].status === "fulfilled") setSummary(critical[0].value);
    else setFetchError(true);
    if (critical[1].status === "fulfilled") setWallet(critical[1].value);
    if (critical[2].status === "fulfilled")
      setRecentOrders(critical[2].value?.data ?? []);
    if (critical[3].status === "fulfilled")
      setRecentItems(critical[3].value ?? []);
    if (critical[4].status === "fulfilled") setSalesData(critical[4].value);
    if (critical[5].status === "fulfilled") setReadiness(critical[5].value);
    if (critical[6].status === "fulfilled") setLowStock(critical[6].value ?? []);
    if (critical[7].status === "fulfilled") setSubscription(critical[7].value);

    let hasError = false;
    critical.forEach((r) => {
      if (r.status === "rejected" && !hasError) {
        hasError = true;
        toast.error(t("dashboard.loadError", "فشل تحميل بعض البيانات"));
      }
    });

    setLoading(false);

    // ---- Secondary: below-the-fold (deferred to idle) ----
    const runSecondary = async () => {
      if (id !== loadIdRef.current) return;
      const secondary = await Promise.allSettled([
        reportsApi.topProducts(storeId, 5),
        reportsApi.ordersByStatus(storeId),
        customersApi.list(storeId, { limit: 5 }),
        brandsApi.list(storeId),
        tagsApi.list(storeId),
        categoriesApi.list(storeId),
        onboardingDone
          ? aiApi.dailySummary(storeId).catch(() => null)
          : Promise.resolve(null),
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
      if (secondary[0].status === "fulfilled")
        setTopProducts(secondary[0].value ?? []);
      if (secondary[1].status === "fulfilled")
        setOrderStatusDist(secondary[1].value ?? []);
      if (secondary[2].status === "fulfilled")
        setRecentCustomers(secondary[2].value?.data ?? []);
      if (secondary[3].status === "fulfilled") setBrands(secondary[3].value ?? []);
      if (secondary[4].status === "fulfilled") setTags(secondary[4].value ?? []);
      if (secondary[5].status === "fulfilled") setCats(secondary[5].value ?? []);
      if (secondary[6].status === "fulfilled" && secondary[6].value) {
        setAiGreeting(
          (secondary[6].value as { text?: string })?.text ?? null,
        );
      }
      if (secondary[7].status === "fulfilled")
        setAbandonedCartStats(secondary[7].value);
      if (secondary[8].status === "fulfilled")
        setPaymentConfig(secondary[8].value);
      if (secondary[9].status === "fulfilled")
        setStoreSettings(secondary[9].value);
      if (secondary[10].status === "fulfilled")
        setReturnsList(secondary[10].value);
      if (secondary[11].status === "fulfilled")
        setLateShipments(secondary[11].value);
      if (secondary[12].status === "fulfilled")
        setExpiredCoupons(secondary[12].value);
      if (secondary[13].status === "fulfilled")
        setCompletedPromotions(secondary[13].value);
      if (secondary[14].status === "fulfilled")
        setMarketplaceHub(secondary[14].value);
      if (secondary[15].status === "fulfilled")
        setNotificationLogs(secondary[15].value);
      if (secondary[16].status === "fulfilled")
        setBankAccount(secondary[16].value);
      if (secondary[17].status === "fulfilled")
        setComplianceStatus(secondary[17].value);

      setSecondaryLoading(false);
    };

    const ric =
      typeof window !== "undefined"
        ? (window as Window & {
            requestIdleCallback?: (
              cb: () => void,
              opts?: { timeout?: number },
            ) => number;
          }).requestIdleCallback
        : undefined;
    if (ric) {
      ric(() => {
        void runSecondary();
      }, { timeout: 1500 });
    } else {
      // Safari fallback — setTimeout 0 still yields to paint.
      setTimeout(() => {
        void runSecondary();
      }, 0);
    }
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
  const summaryShape = summary as
    | { totalSales?: number | string; totalOrders?: number; newOrders?: number; activeProducts?: number }
    | null;
  const walletShape = wallet as { balance?: number | string } | null;
  const totalSalesFormatted = summaryShape?.totalSales
    ? formatCurrency(summaryShape.totalSales)
    : "0.00";
  const walletBalanceFormatted = walletShape?.balance
    ? formatCurrency(walletShape.balance)
    : "0.00";

  const salesTrend = useMemo(() => {
    const sd = salesData as { salesByDay?: Array<{ sales: number | string }> } | null;
    if (!sd?.salesByDay?.length) return null;
    const days = sd.salesByDay;
    if (days.length < 2) return null;
    const mid = Math.floor(days.length / 2);
    const firstHalf = days
      .slice(0, mid)
      .reduce((s: number, d: { sales: number | string }) => s + Number(d.sales), 0);
    const secondHalf = days
      .slice(mid)
      .reduce((s: number, d: { sales: number | string }) => s + Number(d.sales), 0);
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
        value: String(summaryShape?.totalOrders ?? 0),
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
        value: String(summaryShape?.newOrders ?? 0),
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
        value: String(summaryShape?.activeProducts ?? 0),
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
    [
      totalSalesFormatted,
      summaryShape?.totalOrders,
      summaryShape?.newOrders,
      summaryShape?.activeProducts,
      walletBalanceFormatted,
      salesTrend,
      t,
    ],
  );

  const subscriptionPeriodEnd =
    (subscription as { currentPeriodEnd?: string | null } | null)
      ?.currentPeriodEnd ?? null;
  const [liveSubDays, setLiveSubDays] = useState(
    getRemainingDays(subscriptionPeriodEnd),
  );

  useEffect(() => {
    setLiveSubDays(getRemainingDays(subscriptionPeriodEnd));
    if (!subscriptionPeriodEnd) return;
    const interval = setInterval(() => {
      setLiveSubDays(getRemainingDays(subscriptionPeriodEnd));
    }, 60000);
    return () => clearInterval(interval);
  }, [subscriptionPeriodEnd]);

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
    secondaryLoading,
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

/**
 * useDashboardComputed — final computed values for DashboardHome rendering.
 *
 * T2.3 extraction: separates "computed display values" (todaySales, prevSales,
 * salesTrendLabel, actionableOrderTotal, acItems, onboardingJustDone) from
 * the data-fetching hook. Pure derivation — no API calls, just `useMemo`.
 */
import { useMemo, useState } from "react";
import type { ActionCenterItem } from "../NextActionBanner";

export interface DashboardComputed {
  todaySales: number;
  prevSales: number;
  salesTrendLabel: string;
  actionableOrderTotal: number;
  acItems: ActionCenterItem[];
  onboardingJustDone: boolean;
  dismissOnboardingBanner: () => void;
}

export function useDashboardComputed(
  salesData: any,
  summary: any,
): DashboardComputed {
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
        // Brand fidelity: ship uses a darker primary shade to differentiate
        // from "new orders" (also primary) without leaving the Haa palette.
        color: "from-primary-600 to-primary-700",
        bg: "bg-primary-100",
        textColor: "text-primary-800",
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
        color: "from-primary-500 to-primary-600",
        bg: "bg-primary-50",
        textColor: "text-primary-700",
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

  const [onboardingJustDone, setOnboardingJustDone] = useState<boolean>(
    Boolean(
      localStorage.getItem("onboarding_done") &&
        !localStorage.getItem("onboarding_banner_dismissed"),
    ),
  );

  const dismissOnboardingBanner = () => {
    localStorage.setItem("onboarding_banner_dismissed", "true");
    setOnboardingJustDone(false);
  };

  return {
    todaySales,
    prevSales,
    salesTrendLabel,
    actionableOrderTotal,
    acItems,
    onboardingJustDone,
    dismissOnboardingBanner,
  };
}

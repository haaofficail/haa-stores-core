/**
 * DashboardHome — merchant dashboard home page.
 *
 * T2.3: This file is now a thin orchestrator that delegates everything:
 *   - `useDashboardData()` → fetch + state + derived stats (salesTrend, stats, liveSubDays)
 *   - `useSmartAlerts()`   → 30+ rule-based alert generation
 *   - `useDashboardComputed()` → display values (todaySales, prevSales, acItems)
 *
 * Each hook lives in `dashboard/hooks/` and can be tested in isolation.
 * The sub-components in `dashboard/` are pure renderers that take props.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { StatsCards, type StatCardData } from "./dashboard/StatsCards";
import { NextActionBanner } from "./dashboard/NextActionBanner";
import { DashboardHeader } from "./dashboard/DashboardHeader";
import { SubscriptionBadge } from "./dashboard/SubscriptionBadge";
import { PrimaryKpiCards } from "./dashboard/PrimaryKpiCards";
import { RecentActionableOrders, type ActionableOrder } from "./dashboard/RecentActionableOrders";
import { StoreReadinessBanner } from "./dashboard/StoreReadinessBanner";
import { LowStockList } from "./dashboard/LowStockList";
import { AiGreetingCard } from "./dashboard/AiGreetingCard";
import { QuickActionsGrid } from "./dashboard/QuickActionsGrid";
import { SmartAlertsStrip, type SmartAlert } from "./dashboard/SmartAlertsStrip";
import { WelcomeBanner } from "./dashboard/WelcomeBanner";
import { ShowMoreKpiToggle } from "./dashboard/ShowMoreKpiToggle";
import { AnalyticsSection } from "./dashboard/AnalyticsSection";
import { MoreSection } from "./dashboard/MoreSection";
import { useDashboardData } from "./dashboard/hooks/useDashboardData";
import { useSmartAlerts } from "./dashboard/hooks/useSmartAlerts";
import { useDashboardComputed } from "./dashboard/hooks/useDashboardComputed";

export default function DashboardHome() {
  const { t, i18n } = useTranslation();
  const data = useDashboardData();
  const computed = useDashboardComputed(data.salesData, data.summary);
  const smartAlerts = useSmartAlerts({ ...data, refreshKey: data.refreshKey });

  const [showMore, setShowMore] = useState(false);
  const [showMoreKpi, setShowMoreKpi] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [dismissingAlerts, setDismissingAlerts] = useState<Set<string>>(new Set());

  const visibleAlerts = smartAlerts.filter((a) => !data.dismissedAlerts.has(a.id));

  const dismissAlert = (id: string) => {
    setDismissingAlerts((prev) => new Set(prev).add(id));
    setTimeout(() => {
      const set = new Set(data.dismissedAlerts);
      set.add(id);
      localStorage.setItem("dismissed_alerts", JSON.stringify([...set]));
      setDismissingAlerts((prev) => {
        const n = new Set(prev);
        n.delete(id);
        return n;
      });
      data.refresh();
    }, 300);
  };

  if (data.loading) {
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

  if (data.fetchError) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-16 text-center">
        <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
          <AlertTriangle className="h-10 w-10 text-red-400" />
        </div>
        <p className="text-base font-medium text-neutral-700 mb-6">فشل تحميل البيانات</p>
        <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" onClick={data.refresh}>
          <RotateCcw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 max-w-7xl mx-auto animate-fade-in motion-reduce:animate-none px-3 sm:px-4 md:px-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <DashboardHeader
        t={t}
        visibleAlerts={visibleAlerts as SmartAlert[]}
        onRefresh={data.refresh}
      />

      {/* ── Subscription badge (mobile-compact) ──────────────────── */}
      <SubscriptionBadge subscription={data.subscription} t={t} />

      {/* Smart Alerts — critical only, compact */}
      <SmartAlertsStrip
        alerts={visibleAlerts as SmartAlert[]}
        dismissingIds={dismissingAlerts}
        onDismiss={dismissAlert}
        t={t}
      />

      {/* Welcome Banner */}
      {computed.onboardingJustDone && (
        <WelcomeBanner t={t} onDismiss={computed.dismissOnboardingBanner} />
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────── */}
      <div>
        <PrimaryKpiCards
          todaySales={computed.todaySales}
          salesTrendLabel={computed.salesTrendLabel}
          actionableOrderTotal={computed.actionableOrderTotal}
          t={t}
        />

        <ShowMoreKpiToggle
          showMore={showMoreKpi}
          onToggle={() => setShowMoreKpi((v) => !v)}
          t={t}
        />

        <StatsCards stats={data.stats as StatCardData[]} showOnMobile={showMoreKpi} />
      </div>

      {/* ── Action Center ──────────────────────────────────────────── */}
      {computed.acItems.length > 0 && (
        <NextActionBanner items={computed.acItems} t={t} />
      )}

      {/* ── Recent Actionable Orders ────────────────────────────────── */}
      {data.summary?.recentActionableOrders && data.summary.recentActionableOrders.length > 0 && (
        <RecentActionableOrders
          orders={data.summary.recentActionableOrders as ActionableOrder[]}
          t={t}
        />
      )}

      {/* ── Store Readiness (one-liner summary) ───────────────────── */}
      {data.summary?.readiness && data.summary.readiness.issues.length > 0 && (
        <StoreReadinessBanner readiness={data.summary.readiness} t={t} />
      )}

      {/* ── Low Stock (compact, max 3) ─────────────────────────────── */}
      {data.lowStock.length > 0 && (
        <LowStockList
          products={data.lowStock}
          updatingStockId={data.updatingStock}
          onUpdateStock={data.handleStockUpdate}
          t={t}
        />
      )}

      {/* Quick Actions */}
      <QuickActionsGrid t={t} />

      {/* ── Analytics Section — collapsible ───────────────────────── */}
      <AnalyticsSection
        showAnalytics={showAnalytics}
        onToggle={() => setShowAnalytics((v) => !v)}
        salesData={data.salesData}
        orderStatusDist={data.orderStatusDist}
        recentItems={data.recentItems}
        topProducts={data.topProducts}
        t={t}
        i18nLanguage={i18n.language}
      />

      {/* ── AI Greeting — compact ──────────────────────────────────── */}
      {data.aiGreeting && <AiGreetingCard greeting={data.aiGreeting} t={t} />}

      {/* ── المزيد ────────────────────────────────────────────────── */}
      <MoreSection
        showMore={showMore}
        onToggle={() => setShowMore((v) => !v)}
        recentCustomers={data.recentCustomers}
        brandsCount={data.brands.length}
        tagsCount={data.tags.length}
        categoriesCount={data.cats.length}
        productsCount={data.summary?.totalProducts ?? 0}
        ordersCount={data.summary?.totalOrders ?? 0}
        t={t}
      />
    </div>
  );
}

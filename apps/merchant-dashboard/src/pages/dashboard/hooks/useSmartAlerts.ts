/**
 * useSmartAlerts — contextual smart-alert composition + ranking.
 *
 * P1 audit Part 2 fix: the original 1096-LOC monolith was split into
 * per-domain rule modules under `./smart-alerts/`. Each module is a
 * pure function `(RuleContext) => SmartAlert[]`. This hook computes
 * the shared derived values once, runs every module, then sorts and
 * returns the union (priority asc).
 *
 * Behaviour parity: all 30+ rules from the previous implementation are
 * preserved; only the file layout changed. The original sort key
 * (`a.priority - b.priority`) is intact.
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { paymentRules } from './smart-alerts/payment-rules';
import { shippingRules } from './smart-alerts/shipping-rules';
import { inventoryRules } from './smart-alerts/inventory-rules';
import { complianceRules } from './smart-alerts/compliance-rules';
import { marketingRules } from './smart-alerts/marketing-rules';
import type {
  RuleContext,
  RuleModule,
  SmartAlert,
} from './smart-alerts/types';

// Re-export so existing imports stay valid.
export type { SmartAlert, SmartAlertType } from './smart-alerts/types';

export interface UseSmartAlertsInput {
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

const MODULES: RuleModule[] = [
  inventoryRules,
  paymentRules,
  shippingRules,
  complianceRules,
  marketingRules,
];

export function useSmartAlerts(input: UseSmartAlertsInput): SmartAlert[] {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return useMemo<SmartAlert[]>(() => {
    const totalOrders = input.summary?.totalOrders ?? 0;
    const totalSales = Number(input.summary?.totalSales ?? 0);
    const hasProducts = (input.summary?.totalProducts ?? 0) > 0;
    const hasOrders = totalOrders > 0;
    const pendingCount = input.recentOrders.filter(
      (o: any) => o.status === 'pending_payment',
    ).length;
    const outOfStock = input.lowStock.filter(
      (p: any) => Number(p.stockQuantity) === 0,
    );
    const cancelledOrders = input.orderStatusDist.find(
      (o: any) => o.status === 'cancelled',
    );
    const cancelledCount = cancelledOrders?.count ?? 0;
    const cancelRatio = hasOrders ? cancelledCount / totalOrders : 0;
    const aov = hasOrders ? totalSales / totalOrders : 0;
    const firstSale = input.summary?.totalOrders === 1;

    const ctx: RuleContext = {
      ...input,
      hasProducts,
      hasOrders,
      totalOrders,
      totalSales,
      aov,
      pendingCount,
      outOfStock,
      cancelledCount,
      cancelRatio,
      firstSale,
      t,
      navigate,
    };

    const merged: SmartAlert[] = [];
    for (const mod of MODULES) merged.push(...mod(ctx));
    return merged.sort((a, b) => a.priority - b.priority);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inputs object is spread; rebuild only when any nested slice or refreshKey changes
  }, [
    input.summary,
    input.wallet,
    input.recentOrders,
    input.recentCustomers,
    input.recentItems,
    input.lowStock,
    input.brands,
    input.tags,
    input.cats,
    input.subscription,
    input.readiness,
    input.salesData,
    input.topProducts,
    input.orderStatusDist,
    input.abandonedCartStats,
    input.paymentConfig,
    input.storeSettings,
    input.returnsList,
    input.lateShipments,
    input.expiredCoupons,
    input.completedPromotions,
    input.marketplaceHub,
    input.notificationLogs,
    input.bankAccount,
    input.complianceStatus,
    input.liveSubDays,
    input.refreshKey,
    t,
    navigate,
  ]);
}

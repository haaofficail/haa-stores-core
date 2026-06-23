/**
 * Smart-alerts modular types — shared across rule modules.
 *
 * Each per-domain rule module exports a pure function that takes the
 * same RuleContext and returns SmartAlert[]. The top-level
 * useSmartAlerts hook composes the modules and sorts the union.
 */
import type { TFunction } from 'i18next';
import type { NavigateFunction } from 'react-router-dom';

export type SmartAlertType = 'danger' | 'warning' | 'info' | 'success';

export interface SmartAlert {
  id: string;
  type: SmartAlertType;
  priority: number;
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

/**
 * RuleContext — what every rule module gets.
 * Mirrors the original useSmartAlerts input shape exactly so we keep
 * 1:1 behaviour parity after the split.
 */
export interface RuleContext {
  // Raw data slices
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

  // Derived helpers (computed once in useSmartAlerts and threaded
  // into every module so each rule stays cheap).
  hasProducts: boolean;
  hasOrders: boolean;
  totalOrders: number;
  totalSales: number;
  aov: number;
  pendingCount: number;
  outOfStock: any[];
  cancelledCount: number;
  cancelRatio: number;
  firstSale: boolean;

  // i18n + navigation
  t: TFunction;
  navigate: NavigateFunction;
}

export type RuleModule = (ctx: RuleContext) => SmartAlert[];

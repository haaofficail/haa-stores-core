import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient for the admin dashboard.
 *
 * Defaults tuned for an internal admin SPA backed by the existing `request()`
 * client (see ./api.ts):
 * - `staleTime` 30s so navigating between pages reuses fresh-enough data
 *   instead of refetching on every mount.
 * - `refetchOnWindowFocus` off — admins tab away constantly; focus refetch
 *   storms are surprising and noisy here. Mutations invalidate explicitly.
 * - `retry` 1 — one transient retry; `ApiClientError` (4xx) is not worth
 *   retrying, so we only retry once and surface the error otherwise.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
});

/**
 * Centralized query-key factory. Keeping keys in one place keeps
 * invalidation call-sites consistent (single source of truth).
 */
export const queryKeys = {
  dashboard: ['admin', 'dashboard'] as const,
  tenants: ['admin', 'tenants'] as const,
  adminUsers: ['admin', 'users'] as const,
  payments: ['admin', 'payments'] as const,
  auditLogs: ['admin', 'audit'] as const,
  stores: ['admin', 'stores'] as const,
  bankAccounts: ['admin', 'bankAccounts'] as const,
  kycProfiles: ['admin', 'kyc'] as const,
  plans: ['admin', 'plans'] as const,
  marketplaceProducts: ['admin', 'marketplaceProducts'] as const,
  financeReports: ['admin', 'financeReports'] as const,
  accountantInbox: ['admin', 'accountantInbox'] as const,
  landingContacts: ['admin', 'landingContacts'] as const,
  settlementBatches: ['admin', 'settlementBatches'] as const,
  settlementReadiness: ['admin', 'settlementReadiness'] as const,
  compliance: ['admin', 'compliance'] as const,
  settings: ['admin', 'settings'] as const,
  settlementDetail: ['admin', 'settlementDetail'] as const,
  settlementBatchDetail: ['admin', 'settlementBatchDetail'] as const,
  accountantSettlementDetail: ['admin', 'accountantSettlementDetail'] as const,
  storePaymentSettings: ['admin', 'storePaymentSettings'] as const,
  storeBillingSettings: ['admin', 'storeBillingSettings'] as const,
};

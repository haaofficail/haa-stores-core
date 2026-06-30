import { QueryClient } from '@tanstack/react-query';

/**
 * Shared QueryClient for the merchant dashboard.
 *
 * Defaults tuned for a merchant-facing SPA backed by the existing `request()`
 * client (see ./api.ts):
 * - `staleTime` 30s so navigating between pages reuses fresh-enough data
 *   instead of refetching on every mount.
 * - `refetchOnWindowFocus` off — predictable behavior; mutations invalidate
 *   the relevant keys explicitly.
 * - `retry` 1 — one transient retry; `ApiClientError` (4xx) is not worth
 *   retrying repeatedly.
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
 * Centralized query-key factory. Merchant data is per-store, so most keys take
 * the storeId as a segment — switching store refetches automatically and each
 * store's data is cached independently. Keeping keys here keeps invalidation
 * call-sites consistent (single source of truth).
 */
export const queryKeys = {
  customers: (storeId: number | null | undefined) => ['merchant', storeId, 'customers'] as const,
  coupons: (storeId: number | null | undefined) => ['merchant', storeId, 'coupons'] as const,
  promotions: (storeId: number | null | undefined) => ['merchant', storeId, 'promotions'] as const,
  abandonedCarts: (storeId: number | null | undefined) => ['merchant', storeId, 'abandonedCarts'] as const,
  whatsappCampaigns: (storeId: number | null | undefined) => ['merchant', storeId, 'whatsappCampaigns'] as const,
  loyalty: (storeId: number | null | undefined) => ['merchant', storeId, 'loyalty'] as const,
  customerSegments: (storeId: number | null | undefined) => ['merchant', storeId, 'customerSegments'] as const,
  notifications: (storeId: number | null | undefined) => ['merchant', storeId, 'notifications'] as const,
  tags: (storeId: number | null | undefined) => ['merchant', storeId, 'tags'] as const,
  brands: (storeId: number | null | undefined) => ['merchant', storeId, 'brands'] as const,
  categories: (storeId: number | null | undefined) => ['merchant', storeId, 'categories'] as const,
};

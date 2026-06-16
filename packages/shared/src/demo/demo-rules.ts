// Demo Store Rules Layer
// Central place for all demo store checks and rules.
// All functions are pure — they inspect the store object and return decisions.

export interface DemoStoreInfo {
  isDemo: boolean;
  demoProfile?: string | null;
  demoSeedVersion?: string | null;
}

export interface DemoCapabilities {
  allFeaturesEnabled: boolean;
  bypassPlanLimits: boolean;
  useMockPayments: boolean;
  useMockShipping: boolean;
  suppressExternalNotifications: boolean;
  suppressWebhooks: boolean;
  excludeFromRealAnalytics: boolean;
  allowReSeed: boolean;
  showInMarketplace: boolean;
  useDemoMarketplaceOrderFlow: boolean;
  excludeFromMarketplaceAnalytics: boolean;
}

export function isDemoStore(store: DemoStoreInfo | null | undefined): boolean {
  return store?.isDemo === true;
}

export function shouldShowDemoBadge(store: DemoStoreInfo | null | undefined): boolean {
  return isDemoStore(store);
}

export function getDemoCapabilities(store: DemoStoreInfo | null | undefined): DemoCapabilities {
  const demo = isDemoStore(store);
  return {
    allFeaturesEnabled: demo,
    bypassPlanLimits: demo,
    useMockPayments: demo,
    useMockShipping: demo,
    suppressExternalNotifications: demo,
    suppressWebhooks: demo,
    excludeFromRealAnalytics: demo,
    allowReSeed: demo,
    showInMarketplace: demo,
    useDemoMarketplaceOrderFlow: demo,
    excludeFromMarketplaceAnalytics: demo,
  };
}

export function shouldBypassPlanLimits(store: DemoStoreInfo | null | undefined): boolean {
  return isDemoStore(store);
}

export function shouldUseMockPayments(store: DemoStoreInfo | null | undefined): boolean {
  return isDemoStore(store);
}

export function shouldUseMockShippingLabels(store: DemoStoreInfo | null | undefined): boolean {
  return isDemoStore(store);
}

export function shouldSuppressExternalNotifications(store: DemoStoreInfo | null | undefined): boolean {
  return isDemoStore(store);
}

export function shouldExcludeFromRealAnalytics(store: DemoStoreInfo | null | undefined): boolean {
  return isDemoStore(store);
}

export function getDemoWatermarkConfig(store: DemoStoreInfo | null | undefined): { showBadge: boolean; labelAr: string; labelEn: string } {
  return {
    showBadge: isDemoStore(store),
    labelAr: 'متجر تجريبي',
    labelEn: 'Demo Store',
  };
}

// ── Marketplace-specific demo rules ──

export interface DemoProfileConfig {
  allowedProfiles: string[];
  marketplaceEnabled: boolean;
  marketplaceOrderFlow: 'mock' | 'blocked';
}

const demoProfileConfigs: Record<string, DemoProfileConfig> = {
  main: {
    allowedProfiles: ['main'],
    marketplaceEnabled: true,
    marketplaceOrderFlow: 'mock',
  },
  perfume: {
    allowedProfiles: ['perfume'],
    marketplaceEnabled: true,
    marketplaceOrderFlow: 'mock',
  },
};

export function getDemoProfileConfig(store: DemoStoreInfo | null | undefined): DemoProfileConfig | null {
  if (!isDemoStore(store)) return null;
  const profile = store!.demoProfile;
  if (!profile) return null;
  return demoProfileConfigs[profile] ?? null;
}

export function shouldShowInMarketplace(store: DemoStoreInfo | null | undefined): boolean {
  const config = getDemoProfileConfig(store);
  return config?.marketplaceEnabled === true;
}

export function shouldUseDemoMarketplaceOrderFlow(store: DemoStoreInfo | null | undefined): boolean {
  const config = getDemoProfileConfig(store);
  return config?.marketplaceOrderFlow === 'mock';
}

export function shouldExcludeFromMarketplaceAnalytics(store: DemoStoreInfo | null | undefined): boolean {
  return isDemoStore(store);
}

export function getMarketplaceDemoBadgeConfig(store: DemoStoreInfo | null | undefined): { showBadge: boolean; label: string } {
  return {
    showBadge: isDemoStore(store),
    label: 'متجر تجريبي',
  };
}

export function isDemoStoreListedInMarketplace(store: DemoStoreInfo | null | undefined): boolean {
  return shouldShowInMarketplace(store);
}

export function isMarketplaceOrderMixedWithDemo(subOrderStores: Array<DemoStoreInfo | null | undefined>): boolean {
  const hasReal = subOrderStores.some((s) => s !== null && s !== undefined && !isDemoStore(s));
  const hasDemo = subOrderStores.some((s) => s !== null && s !== undefined && isDemoStore(s));
  return hasReal && hasDemo;
}

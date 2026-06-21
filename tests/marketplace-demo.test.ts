import { describe, it, expect } from 'vitest';
import {
  shouldShowInMarketplace,
  shouldUseDemoMarketplaceOrderFlow,
  shouldExcludeFromMarketplaceAnalytics,
  getMarketplaceDemoBadgeConfig,
  isMarketplaceOrderMixedWithDemo,
  getDemoCapabilities,
} from '@haa/shared';

const demoStoreMain = { id: 1, isDemo: true, demoProfile: 'main', demoSeedVersion: '2026-06-main-demo-v1' };
const demoStorePerfume = { id: 5, isDemo: true, demoProfile: 'perfume', demoSeedVersion: '2026-06-perfume-v1' };
const realStore = { id: 2, isDemo: false };
const unknownProfile = { id: 3, isDemo: true, demoProfile: 'unknown' };

describe('shouldShowInMarketplace', () => {
  it('returns true for main demo profile', () => {
    expect(shouldShowInMarketplace(demoStoreMain)).toBe(true);
  });

  it('returns true for perfume demo profile', () => {
    expect(shouldShowInMarketplace(demoStorePerfume)).toBe(true);
  });

  it('returns false for real store', () => {
    expect(shouldShowInMarketplace(realStore)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(shouldShowInMarketplace(null)).toBe(false);
    expect(shouldShowInMarketplace(undefined)).toBe(false);
  });

  it('returns false for unknown demo profile', () => {
    expect(shouldShowInMarketplace(unknownProfile)).toBe(false);
  });
});

describe('shouldUseDemoMarketplaceOrderFlow', () => {
  it('returns true for main demo profile', () => {
    expect(shouldUseDemoMarketplaceOrderFlow(demoStoreMain)).toBe(true);
  });

  it('returns true for perfume demo profile', () => {
    expect(shouldUseDemoMarketplaceOrderFlow(demoStorePerfume)).toBe(true);
  });

  it('returns false for real store', () => {
    expect(shouldUseDemoMarketplaceOrderFlow(realStore)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(shouldUseDemoMarketplaceOrderFlow(null)).toBe(false);
    expect(shouldUseDemoMarketplaceOrderFlow(undefined)).toBe(false);
  });
});

describe('shouldExcludeFromMarketplaceAnalytics', () => {
  it('returns true for demo store', () => {
    expect(shouldExcludeFromMarketplaceAnalytics(demoStoreMain)).toBe(true);
    expect(shouldExcludeFromMarketplaceAnalytics(demoStorePerfume)).toBe(true);
  });

  it('returns false for real store', () => {
    expect(shouldExcludeFromMarketplaceAnalytics(realStore)).toBe(false);
  });
});

describe('getMarketplaceDemoBadgeConfig', () => {
  it('returns showBadge=true for demo store', () => {
    const config = getMarketplaceDemoBadgeConfig(demoStorePerfume);
    expect(config.showBadge).toBe(true);
    expect(config.label).toBe('متجر تجريبي');
  });

  it('returns showBadge=false for real store', () => {
    const config = getMarketplaceDemoBadgeConfig(realStore);
    expect(config.showBadge).toBe(false);
  });

  it('handles null/undefined gracefully', () => {
    expect(getMarketplaceDemoBadgeConfig(null).showBadge).toBe(false);
  });
});

describe('isMarketplaceOrderMixedWithDemo', () => {
  it('returns true when real and demo stores mixed', () => {
    expect(isMarketplaceOrderMixedWithDemo([realStore, demoStoreMain])).toBe(true);
    expect(isMarketplaceOrderMixedWithDemo([demoStorePerfume, realStore])).toBe(true);
  });

  it('returns false when only demo stores', () => {
    expect(isMarketplaceOrderMixedWithDemo([demoStoreMain, demoStorePerfume])).toBe(false);
  });

  it('returns false when only real stores', () => {
    expect(isMarketplaceOrderMixedWithDemo([realStore])).toBe(false);
  });

  it('returns false for empty array', () => {
    expect(isMarketplaceOrderMixedWithDemo([])).toBe(false);
  });

  it('handles null/undefined entries gracefully', () => {
    expect(isMarketplaceOrderMixedWithDemo([realStore, demoStoreMain])).toBe(true);
    expect(isMarketplaceOrderMixedWithDemo([realStore, demoStorePerfume])).toBe(true);
    expect(isMarketplaceOrderMixedWithDemo([null, undefined])).toBe(false);
    expect(isMarketplaceOrderMixedWithDemo([])).toBe(false);
  });
});

describe('getDemoCapabilities marketplace fields', () => {
  it('demo store has marketplace capabilities enabled', () => {
    const caps = getDemoCapabilities(demoStoreMain);
    expect(caps.showInMarketplace).toBe(true);
    expect(caps.useDemoMarketplaceOrderFlow).toBe(true);
    expect(caps.excludeFromMarketplaceAnalytics).toBe(true);
  });

  it('real store has marketplace capabilities disabled', () => {
    const caps = getDemoCapabilities(realStore);
    expect(caps.showInMarketplace).toBe(false);
    expect(caps.useDemoMarketplaceOrderFlow).toBe(false);
    expect(caps.excludeFromMarketplaceAnalytics).toBe(false);
  });
});

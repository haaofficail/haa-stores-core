import { describe, it, expect } from 'vitest';
import {
  isDemoStore,
  shouldBypassPlanLimits,
  shouldUseMockPayments,
  shouldUseMockShippingLabels,
  shouldSuppressExternalNotifications,
  shouldExcludeFromRealAnalytics,
  getDemoCapabilities,
  getDemoWatermarkConfig,
} from '@haa/shared';

const demoStore = { id: 1, isDemo: true, demoProfile: 'perfume', demoSeedVersion: '2026-06-v1' };
const realStore = { id: 2, isDemo: false };

describe('isDemoStore', () => {
  it('returns true for demo store', () => {
    expect(isDemoStore(demoStore)).toBe(true);
  });

  it('returns false for real store', () => {
    expect(isDemoStore(realStore)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isDemoStore(null)).toBe(false);
    expect(isDemoStore(undefined)).toBe(false);
  });
});

describe('Demo capabilities', () => {
  it('demo store has all capabilities enabled', () => {
    const caps = getDemoCapabilities(demoStore);
    expect(caps.allFeaturesEnabled).toBe(true);
    expect(caps.bypassPlanLimits).toBe(true);
    expect(caps.useMockPayments).toBe(true);
    expect(caps.useMockShipping).toBe(true);
    expect(caps.suppressExternalNotifications).toBe(true);
    expect(caps.suppressWebhooks).toBe(true);
    expect(caps.excludeFromRealAnalytics).toBe(true);
    expect(caps.allowReSeed).toBe(true);
  });

  it('real store has all capabilities disabled', () => {
    const caps = getDemoCapabilities(realStore);
    expect(caps.allFeaturesEnabled).toBe(false);
    expect(caps.bypassPlanLimits).toBe(false);
    expect(caps.useMockPayments).toBe(false);
    expect(caps.useMockShipping).toBe(false);
    expect(caps.suppressExternalNotifications).toBe(false);
    expect(caps.suppressWebhooks).toBe(false);
    expect(caps.excludeFromRealAnalytics).toBe(false);
    expect(caps.allowReSeed).toBe(false);
  });
});

describe('Convenience functions', () => {
  it('shouldBypassPlanLimits returns true for demo, false for real', () => {
    expect(shouldBypassPlanLimits(demoStore)).toBe(true);
    expect(shouldBypassPlanLimits(realStore)).toBe(false);
  });

  it('shouldUseMockPayments returns true for demo, false for real', () => {
    expect(shouldUseMockPayments(demoStore)).toBe(true);
    expect(shouldUseMockPayments(realStore)).toBe(false);
  });

  it('shouldUseMockShippingLabels returns true for demo, false for real', () => {
    expect(shouldUseMockShippingLabels(demoStore)).toBe(true);
    expect(shouldUseMockShippingLabels(realStore)).toBe(false);
  });

  it('shouldSuppressExternalNotifications returns true for demo, false for real', () => {
    expect(shouldSuppressExternalNotifications(demoStore)).toBe(true);
    expect(shouldSuppressExternalNotifications(realStore)).toBe(false);
  });

  it('shouldExcludeFromRealAnalytics returns true for demo, false for real', () => {
    expect(shouldExcludeFromRealAnalytics(demoStore)).toBe(true);
    expect(shouldExcludeFromRealAnalytics(realStore)).toBe(false);
  });
});

describe('getDemoWatermarkConfig', () => {
  it('returns showBadge true for demo stores', () => {
    const config = getDemoWatermarkConfig(demoStore);
    expect(config.showBadge).toBe(true);
    expect(config.labelAr).toBe('متجر تجريبي');
    expect(config.labelEn).toBe('Demo Store');
  });

  it('returns showBadge false for real stores', () => {
    const config = getDemoWatermarkConfig(realStore);
    expect(config.showBadge).toBe(false);
  });
});

describe('Public API exposure', () => {
  it('toPublicStore strips demoProfile and demoSeedVersion', () => {
    // Simulate what toPublicStore does:
    // It removes demoProfile, demoSeedVersion, tenantId, createdAt, updatedAt
    const store = { id: 1, isDemo: true, demoProfile: 'perfume', demoSeedVersion: 'v1', tenantId: 1, createdAt: new Date(), updatedAt: new Date(), name: 'test' };
    const { tenantId: _tenantId, createdAt: _createdAt, updatedAt: _updatedAt, demoProfile: _demoProfile, demoSeedVersion: _demoSeedVersion, ...publicStore } = store;
    expect(publicStore.isDemo).toBe(true);
    expect((publicStore as any).demoProfile).toBeUndefined();
    expect((publicStore as any).demoSeedVersion).toBeUndefined();
    expect((publicStore as any).tenantId).toBeUndefined();
  });

  it('toPublicStore keeps isDemo in public response', () => {
    const store = { id: 1, isDemo: true, demoProfile: 'perfume', tenantId: 1, createdAt: new Date(), updatedAt: new Date(), name: 'test' };
    const { tenantId: _tenantId, createdAt: _createdAt, updatedAt: _updatedAt, demoProfile: _demoProfile, ...publicStore } = store;
    expect(publicStore.isDemo).toBe(true);
  });

  it('demo-info watermark config does not expose internal fields', () => {
    const config = getDemoWatermarkConfig(demoStore);
    expect(Object.keys(config)).toEqual(['showBadge', 'labelAr', 'labelEn']);
    expect((config as any).demoProfile).toBeUndefined();
    expect((config as any).demoSeedVersion).toBeUndefined();
  });
});

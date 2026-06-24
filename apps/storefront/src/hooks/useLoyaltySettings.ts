// Per-store loyalty settings hook.
//
// Fetches the public loyalty settings ONCE per session per slug and
// caches in module-level state. The settings are tiny (~7 numbers) and
// rarely change — fetching on every product card render would be
// catastrophic.
//
// Returns:
//   - `undefined` while the initial fetch is in flight
//   - `{ enabled: false }` when the store has loyalty disabled
//   - the full settings object when enabled
//
// Components that render conditional UI (e.g. <LoyaltyEarnHint>) MUST
// handle the `undefined` case explicitly to avoid layout jumps.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { loyaltyApi, type LoyaltyStoreSettings } from '@/lib/api';

const cache = new Map<string, LoyaltyStoreSettings>();
const inFlight = new Map<string, Promise<LoyaltyStoreSettings>>();

async function fetchOnce(slug: string): Promise<LoyaltyStoreSettings> {
  const existing = cache.get(slug);
  if (existing) return existing;
  const pending = inFlight.get(slug);
  if (pending) return pending;
  const p = loyaltyApi
    .getSettings(slug)
    .then((s) => {
      cache.set(slug, s);
      inFlight.delete(slug);
      return s;
    })
    .catch(() => {
      inFlight.delete(slug);
      // On error (network, 404, etc.) treat loyalty as disabled so the
      // hint stays hidden and the rest of the storefront keeps working.
      const disabled: LoyaltyStoreSettings = { enabled: false };
      cache.set(slug, disabled);
      return disabled;
    });
  inFlight.set(slug, p);
  return p;
}

export function useLoyaltySettings(): LoyaltyStoreSettings | undefined {
  const { slug } = useParams<{ slug?: string }>();
  const [settings, setSettings] = useState<LoyaltyStoreSettings | undefined>(
    slug ? cache.get(slug) : undefined,
  );

  useEffect(() => {
    if (!slug) return;
    const cached = cache.get(slug);
    if (cached) {
      setSettings(cached);
      return;
    }
    let cancelled = false;
    fetchOnce(slug).then((s) => {
      if (!cancelled) setSettings(s);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return settings;
}

// Exposed for tests + cache invalidation if the merchant flips loyalty
// in the dashboard during the same session.
export function clearLoyaltySettingsCache(slug?: string): void {
  if (slug) {
    cache.delete(slug);
    inFlight.delete(slug);
  } else {
    cache.clear();
    inFlight.clear();
  }
}

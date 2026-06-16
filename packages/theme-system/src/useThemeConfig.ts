'use client';

import { useEffect, useState } from 'react';
import { applyStoreTheme } from './isolation';
import { resolveActiveThemeConfig } from './activeThemeResolver';
import { type ThemeConfig } from './types';

let cachedConfig: ThemeConfig | null = null;
let cachedSlug: string | null = null;
let pending: Promise<void> | null = null;
let apiBase = '';

function isPreviewMode(): boolean {
  return typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('preview');
}

function getAllowedPreviewOrigins(): Set<string> {
  const origins = new Set<string>();
  if (typeof window === 'undefined') return origins;
  origins.add(window.location.origin);
  if (document.referrer) {
    try {
      origins.add(new URL(document.referrer).origin);
    } catch {
      // Ignore malformed referrers.
    }
  }
  return origins;
}

export function setThemeApiBase(url: string) {
  apiBase = url.replace(/\/+$/, '');
}

export async function fetchThemeConfig(slug: string): Promise<ThemeConfig> {
  const res = await fetch(`${apiBase}/s/${slug}/theme`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error?.message ?? 'Failed to load theme');
  return json.data as ThemeConfig;
}

export function loadTheme(config: ThemeConfig, slug?: string) {
  cachedConfig = config;
  cachedSlug = slug ?? cachedSlug;
  applyStoreTheme(config);
}

export function useThemeConfig(slug: string | undefined) {
  const [config, setConfig] = useState<ThemeConfig | null>(() => (cachedSlug === slug ? cachedConfig : null));

  useEffect(() => {
    if (!slug) return;

    if (isPreviewMode()) {
      const allowedOrigins = getAllowedPreviewOrigins();
      const handler = (e: MessageEvent) => {
        if (!allowedOrigins.has(e.origin)) return;
        if (e.data?.type === 'theme-preview' && e.data?.config) {
          const nextConfig = resolveActiveThemeConfig(e.data.config);
          cachedConfig = nextConfig;
          cachedSlug = slug;
          setConfig(nextConfig);
          applyStoreTheme(nextConfig);
        }
      };
      window.addEventListener('message', handler);
      if (cachedConfig && cachedSlug === slug) {
        applyStoreTheme(cachedConfig);
        setConfig(cachedConfig);
      } else {
        fetchThemeConfig(slug).then((nextConfig) => {
          if (cachedSlug && cachedSlug !== slug) return;
          loadTheme(nextConfig, slug);
          setConfig(nextConfig);
        }).catch((err: unknown) => {
          console.warn('[ThemeSystem] Failed to fetch theme config for slug "%s":', slug, err instanceof Error ? err.message : err);
        });
      }
      return () => window.removeEventListener('message', handler);
    }

    if (cachedConfig && cachedSlug === slug) { applyStoreTheme(cachedConfig); setConfig(cachedConfig); return; }
    if (pending) { pending.then(() => { if (cachedConfig && cachedSlug === slug) { applyStoreTheme(cachedConfig); setConfig(cachedConfig); } }); return; }
    pending = fetchThemeConfig(slug).then((nextConfig) => { loadTheme(nextConfig, slug); setConfig(nextConfig); }).catch((err: unknown) => {
      console.warn('[ThemeSystem] Failed to fetch theme config for slug "%s":', slug, err instanceof Error ? err.message : err);
    });
    return () => { pending = null; };
  }, [slug]);

  return config;
}

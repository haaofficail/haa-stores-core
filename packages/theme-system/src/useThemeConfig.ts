'use client';

import { useEffect, useState } from 'react';
import { applyStoreTheme } from './isolation.js';
import { resolveActiveThemeConfig } from './activeThemeResolver.js';
import { type ThemeConfig } from './types.js';

let pendingSlug: string | null = null;
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

/** @deprecated Module-level cache removed — use useThemeConfig() hook instead. */
export function loadTheme(config: ThemeConfig, _slug?: string) {
  applyStoreTheme(config);
}

export function useThemeConfig(slug: string | undefined) {
  const [config, setConfig] = useState<ThemeConfig | null>(null);

  useEffect(() => {
    if (!slug) return;

    if (isPreviewMode()) {
      const allowedOrigins = getAllowedPreviewOrigins();
      const handler = (e: MessageEvent) => {
        if (!allowedOrigins.has(e.origin)) return;
        if (e.data?.type === 'theme-preview' && e.data?.config) {
          const nextConfig = resolveActiveThemeConfig(e.data.config);
          setConfig(nextConfig);
          applyStoreTheme(nextConfig);
        }
      };
      window.addEventListener('message', handler);
      fetchThemeConfig(slug).then((nextConfig) => {
        applyStoreTheme(nextConfig);
        setConfig(nextConfig);
      }).catch((err: unknown) => {
        console.warn('[ThemeSystem] Failed to fetch theme config for slug "%s":', slug, err instanceof Error ? err.message : err);
      });
      return () => window.removeEventListener('message', handler);
    }

    if (pendingSlug === slug) return;
    pendingSlug = slug;
    fetchThemeConfig(slug).then((nextConfig) => {
      applyStoreTheme(nextConfig);
      setConfig(nextConfig);
    }).catch((err: unknown) => {
      console.warn('[ThemeSystem] Failed to fetch theme config for slug "%s":', slug, err instanceof Error ? err.message : err);
    });
  }, [slug]);

  return config;
}

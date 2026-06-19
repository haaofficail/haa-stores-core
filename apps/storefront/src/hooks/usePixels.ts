import { useEffect, useRef } from 'react';

const BASE_URL = (import.meta.env as Record<string, string>).VITE_API_URL ?? '';

interface PixelScripts {
  headScripts: string;
  bodyScripts: string;
}

const cache = new Map<string, PixelScripts>();

async function fetchPixelScripts(slug: string): Promise<PixelScripts> {
  if (cache.has(slug)) return cache.get(slug)!;
  try {
    const res = await fetch(`${BASE_URL}/s/pixels?slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return { headScripts: '', bodyScripts: '' };
    const json = await res.json() as { success: boolean; data: PixelScripts };
    const scripts = json?.data ?? { headScripts: '', bodyScripts: '' };
    cache.set(slug, scripts);
    return scripts;
  } catch {
    return { headScripts: '', bodyScripts: '' };
  }
}

function injectScript(html: string, containerId: string) {
  if (!html) return;
  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.head.appendChild(container);
  }
  container.innerHTML = html;
  // Re-execute inline <script> tags (innerHTML doesn't execute scripts)
  container.querySelectorAll('script').forEach((oldScript) => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
    newScript.textContent = oldScript.textContent;
    oldScript.replaceWith(newScript);
  });
}

/**
 * Fetches and injects pixel tracking scripts for a store.
 * Scripts are cached per slug to avoid re-fetching on navigation.
 * Head scripts go into <head>, body scripts go before </body>.
 */
export function usePixels(slug: string | undefined) {
  const injected = useRef(false);

  useEffect(() => {
    if (!slug || injected.current) return;
    injected.current = true;

    fetchPixelScripts(slug).then(({ headScripts, bodyScripts }) => {
      if (headScripts) injectScript(headScripts, `haa-pixels-head-${slug}`);
      if (bodyScripts) {
        let bodyContainer = document.getElementById(`haa-pixels-body-${slug}`);
        if (!bodyContainer) {
          bodyContainer = document.createElement('div');
          bodyContainer.id = `haa-pixels-body-${slug}`;
          document.body.appendChild(bodyContainer);
        }
        bodyContainer.innerHTML = bodyScripts;
      }
    }).catch(() => null);

    return () => { injected.current = false; };
  }, [slug]);
}

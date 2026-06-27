import { useEffect, useRef } from 'react';
import {
  validatePixelScripts,
  type PixelValidationResult,
} from '@haa/commerce-core/pixel-validation';

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

/**
 * Provider allowlist guard. Defense-in-depth — even though
 * `PixelService.buildScripts` already sanitizes IDs and stamps
 * provider markers, we re-validate here in case the response is
 * tampered with or the backend template is edited unsafely.
 *
 * If the payload contains any <script> whose body matches none of the
 * known provider signatures, the entire payload is dropped and a
 * warning is logged. This blocks XSS-via-pixel-config without
 * breaking legitimate pixels.
 */
function validateOrWarn(html: string, context: string): PixelValidationResult {
  const result = validatePixelScripts(html);
  if (!result.safe) {
    console.warn(
      `[usePixels] dropping unsafe pixel payload (${context}):`,
      result.reason,
      `scriptCount=${result.scriptCount}`,
      `matched=${result.matchedProviders.join(',') || 'none'}`,
    );
    return result;
  }
  return result;
}

function reExecuteScripts(container: HTMLElement) {
  // innerHTML parses but does not execute <script>. We must clone each
  // <script> into a fresh element so the browser runs it. Attributes
  // are preserved so async / src / integrity / nonce all keep working.
  container.querySelectorAll('script').forEach((oldScript) => {
    const newScript = document.createElement('script');
    Array.from(oldScript.attributes).forEach((attr) => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    oldScript.replaceWith(newScript);
  });
}

function injectScript(html: string, containerId: string): PixelValidationResult | null {
  if (!html) return null;
  const validation = validateOrWarn(html, containerId);
  if (!validation.safe) return null;

  let container = document.getElementById(containerId);
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    document.head.appendChild(container);
  }
  // We use innerHTML here ONLY because the upstream payload has just
  // passed `validatePixelScripts`, which enforces the provider
  // signature allowlist on every <script> tag. This is the documented
  // escape hatch in the CSP allowlist (`'unsafe-inline'` is present
  // for the storefront's other inline Vite scripts).
  container.innerHTML = html;
  reExecuteScripts(container);
  return validation;
}

/**
 * Fetches and injects pixel tracking scripts for a store.
 * Scripts are cached per slug to avoid re-fetching on navigation.
 * Head scripts go into <head>, body scripts go before </body>.
 *
 * Security: every payload is run through `validatePixelScripts`
 * before injection. Payloads with unrecognised <script> bodies are
 * dropped silently with a console warning.
 *
 * Observability: successful injections record the matched providers
 * on `window.__haaPixelsLoaded` so any CSP report-only collector or
 * third-party security monitor can audit them post-load.
 */
export function usePixels(slug: string | undefined) {
  const injected = useRef(false);

  useEffect(() => {
    if (!slug || injected.current) return;
    injected.current = true;

    fetchPixelScripts(slug).then(({ headScripts, bodyScripts }) => {
      const loaded: string[] = [];
      if (headScripts) {
        const result = injectScript(headScripts, `haa-pixels-head-${slug}`);
        if (result) loaded.push(...result.matchedProviders);
      }
      if (bodyScripts) {
        let bodyContainer = document.getElementById(`haa-pixels-body-${slug}`);
        if (!bodyContainer) {
          bodyContainer = document.createElement('div');
          bodyContainer.id = `haa-pixels-body-${slug}`;
          document.body.appendChild(bodyContainer);
        }
        const bodyValidation = validateOrWarn(bodyScripts, `haa-pixels-body-${slug}`);
        if (bodyValidation.safe) {
          bodyContainer.innerHTML = bodyScripts;
          reExecuteScripts(bodyContainer);
          loaded.push(...bodyValidation.matchedProviders);
        }
      }
      if (loaded.length > 0 && typeof window !== 'undefined') {
        // Append to the audit log. CSP report-only collectors (added
        // in a follow-up) can scrape this list to confirm only the
        // expected providers executed.
        (window as unknown as { __haaPixelsLoaded?: string[] }).__haaPixelsLoaded = [
          ...((window as unknown as { __haaPixelsLoaded?: string[] }).__haaPixelsLoaded ?? []),
          ...loaded,
        ];
      }
    }).catch(() => null);

    return () => { injected.current = false; };
  }, [slug]);
}

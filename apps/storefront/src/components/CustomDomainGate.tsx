import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { request } from '@/lib/api';
import { isCustomDomainHost } from '@/lib/custom-host';

/**
 * Custom-domain bootstrap (QA Custom Domain).
 *
 * When the SPA is served on a merchant's own domain (shop.example.com), the
 * URL has no /s/:slug prefix. This gate resolves the host -> store slug via
 * GET /api/resolve-host and rewrites the location to /s/:slug + the original
 * sub-path, so every existing store route keeps working unchanged.
 *
 * On the platform host (haastores.com / localhost) it is a no-op pass-through.
 */
export function CustomDomainGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  // On a custom host we must resolve before rendering platform routes.
  const [resolving, setResolving] = useState(() => isCustomDomainHost() && !location.pathname.startsWith('/s/'));

  useEffect(() => {
    if (!resolving) return;
    let cancelled = false;

    (async () => {
      try {
        const res = await request<{ slug: string | null }>(`/api/resolve-host`);
        if (cancelled) return;
        if (res?.slug) {
          const rest = location.pathname === '/' ? '' : location.pathname;
          navigate(`/s/${res.slug}${rest}${location.search}`, { replace: true });
        }
      } catch {
        // تجاهل — نعرض المحتوى الافتراضي إن فشل الحلّ
      } finally {
        if (!cancelled) setResolving(false);
      }
    })();

    return () => { cancelled = true; };
  }, [resolving, navigate, location.pathname, location.search]);

  if (resolving) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="lp-spinner" aria-label="جارٍ التحميل" />
      </div>
    );
  }

  return <>{children}</>;
}

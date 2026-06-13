import { useEffect, useRef, useState } from 'react';
import { Outlet, useParams } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { StoreProvider } from '@/hooks/useStore';
import { CartProvider } from '@/hooks/CartContext';
import { useThemeConfig, setThemeApiBase, getStorefrontThemeComponents, resolveStorefrontThemeKey } from '@haa/storefront-themes';
import { ThemeProvider } from '@/hooks/useTheme';
import '@/theme-registry';

setThemeApiBase(import.meta.env.VITE_API_URL ?? '');

const FALLBACK_TIMEOUT_MS = 8_000;

function ThemeLoadingSkeleton() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fff]" id="storefront-scope" data-theme-scope="storefront" data-storefront-theme="">
      <div className="h-16 bg-gray-100 animate-pulse" />
      <div className="flex-1 px-4 py-8 mx-auto w-full max-w-7xl">
        <div className="space-y-6">
          <div className="h-10 w-3/4 bg-gray-200 rounded animate-pulse" />
          <div className="h-6 w-1/2 bg-gray-200 rounded animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="space-y-3">
                <div className="aspect-square bg-gray-200 rounded-2xl animate-pulse" />
                <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="h-32 bg-gray-100 animate-pulse" />
    </div>
  );
}

export default function Layout() {
  const { slug } = useParams<{ slug: string }>();
  const themeConfig = useThemeConfig(slug);
  const fallbackTimer = useRef<ReturnType<typeof setTimeout>>();
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    if (themeConfig) {
      if (fallbackTimer.current) clearTimeout(fallbackTimer.current);
      setUseFallback(false);
      return;
    }
    fallbackTimer.current = setTimeout(() => setUseFallback(true), FALLBACK_TIMEOUT_MS);
    return () => { if (fallbackTimer.current) clearTimeout(fallbackTimer.current); };
  }, [themeConfig]);

  if (!themeConfig && !useFallback) {
    return (
      <StoreProvider slug={slug}>
        <CartProvider slug={slug}>
          <ThemeLoadingSkeleton />
        </CartProvider>
      </StoreProvider>
    );
  }

  const effectiveConfig = useFallback ? null : themeConfig;
  const runtimeKey = resolveStorefrontThemeKey(effectiveConfig?.themeKey || effectiveConfig?.preset);
  const runtimeComponents = getStorefrontThemeComponents(runtimeKey);
  const RuntimeHeader = runtimeComponents?.Header;
  const RuntimeFooter = runtimeComponents?.Footer;

  return (
    <StoreProvider slug={slug}>
      <CartProvider slug={slug}>
        <ThemeProvider value={effectiveConfig}>
          <div className="min-h-screen flex flex-col" id="storefront-scope" data-theme-scope="storefront" data-storefront-theme={runtimeKey}>
            {RuntimeHeader ? <RuntimeHeader /> : <Header />}
            <main className="flex-1">
              <Outlet />
            </main>
            {RuntimeFooter ? <RuntimeFooter /> : <Footer />}
          </div>
        </ThemeProvider>
      </CartProvider>
    </StoreProvider>
  );
}

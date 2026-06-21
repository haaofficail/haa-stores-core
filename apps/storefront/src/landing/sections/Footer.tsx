/**
 * Footer — landing page footer
 *
 * Extracted from LandingPage.tsx (P2-#1 refactor).
 * Brand badge + copyright notice + "Made in Saudi Arabia" badge.
 */
import { useState as useReactState } from 'react';
import { usePlatformBrand } from '@/hooks/usePlatformBrand';
import { StoreContainer } from '@/components/ui';
import type { TFn } from './types';

export function Footer({ t }: { t: TFn }) {
  const [logoError, setLogoError] = useReactState(false);
  const { platformLogoUrl } = usePlatformBrand();
  const showLogo = !!platformLogoUrl && !logoError;

  return (
    <footer className="border-t border-white/10 bg-white/40 py-8 backdrop-blur-xl sm:py-10">
      <StoreContainer>
        <div className="flex flex-col items-center gap-4 text-center">
          {/* Brand badge */}
          <div className="flex flex-col items-center gap-1.5 sm:flex-row sm:gap-2.5">
            {showLogo ? (
              <img
                key={platformLogoUrl}
                src={platformLogoUrl!}
                alt="Haa"
                className="platform-logo h-12 w-auto"
                onError={() => setLogoError(true)}
              />
            ) : (
              <img src="/assets/haa-logo.png" alt="Haa" className="h-12 w-auto" />
            )}
            <span className="font-extrabold text-text-primary">متاجر هاء</span>
            <span className="hidden text-text-tertiary/50 sm:inline select-none" aria-hidden="true">·</span>
            <span className="flex items-center gap-1 text-sm font-medium text-success">
              <span>صنع في السعودية</span>
              <img src="/assets/saudi-map.png" alt="" className="h-5 w-auto" aria-hidden="true" />
            </span>
          </div>
          {/* Divider */}
          <div className="h-px w-16 bg-border/50" aria-hidden="true" />
          {/* Copyright */}
          <p className="text-sm text-text-tertiary">
            {t('landing.footer.copyright', '© 2026 هاء سوفت')}
          </p>
        </div>
      </StoreContainer>
    </footer>
  );
}

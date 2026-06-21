import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { Store } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { StoreButton } from '@/components/ui';
import { ThemeProvider } from '@/hooks/useTheme';
import { useThemeConfig } from '@haa/storefront-themes';

export default function StoreNotFound() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const effectiveSlug = slug || 'haa-demo';
  const themeConfig = useThemeConfig(effectiveSlug);
  const backHref = slug ? `/s/${slug}` : '/s/haa-demo';

  return (
    <ThemeProvider value={themeConfig}>
      <div id="storefront-scope" data-theme-scope="storefront" className="min-h-screen flex items-center justify-center p-4 bg-surface-1">
        <div className="text-center max-w-md">
          <Icon icon={Store} size="xl" className="text-primary-500 mx-auto mb-4" />
          <h1 className="text-page-title font-bold text-text-primary mb-2">
            {slug ? t('notFound.title') : 'الصفحة غير موجودة'}
          </h1>
          <p className="text-text-secondary mb-6">{t('notFound.description')}</p>
          <StoreButton variant="primary" href={backHref} size="md">
            {t('notFound.backToStore', 'العودة إلى المتجر')}
          </StoreButton>
        </div>
      </div>
    </ThemeProvider>
  );
}

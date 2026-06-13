import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { useStorefrontTheme } from '@/hooks/useTheme';
import { useSharedCart } from '@/hooks/CartContext';
import { productsApi, categoriesApi, type PublicProduct, type PublicCategory } from '@/lib/api';
import { StoreContainer, StoreButton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { useSEO } from '@/hooks/useSEO';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getStorefrontThemeComponents, resolveStorefrontThemeKey } from '@haa/storefront-themes';
import BaseElegantHomePage from '@/themes/base-elegant/HomePage';

export default function Home() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const { store, loading: storeLoading, error: storeError } = useStore();
  const theme = useStorefrontTheme();
  const { addItem } = useSharedCart();

  useSEO({
    title: store?.name ? `${store.name} - ${t('home.title', 'متجر إلكتروني')}` : t('home.loading'),
    description: store?.description || undefined,
    ogImage: store?.logoUrl || undefined,
  });

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    Promise.all([
      productsApi.list(slug, { limit: 50 }),
      categoriesApi.list(slug),
    ])
      .then(([p, c]) => {
        setProducts(p.data);
        setCategories(c);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = useCallback(async (product: PublicProduct) => {
    if (!slug) return;
    await addItem(product.id, 1);
    toast.success(t('product.addedSuccessfully'), {
      action: { label: t('product.viewCart'), onClick: () => window.location.href = `/s/${slug}/cart` },
    });
  }, [addItem, slug, t]);

  if (storeError) {
    return (
      <StoreContainer className="py-16 text-center">
        <Icon icon={AlertTriangle} size="lg" className="mx-auto mb-3 text-warning" />
        <h2 className="text-xl font-bold mb-2">{t('home.loadError')}</h2>
        <StoreButton onClick={() => window.location.reload()}>{t('common.retry')}</StoreButton>
      </StoreContainer>
    );
  }

  if (storeLoading || !store) {
    return (
      <StoreContainer className="py-8">
        <div className="space-y-6">
          <div className="h-12 w-3/4 bg-surface-2 rounded animate-pulse" />
          <div className="h-6 w-1/2 bg-surface-2 rounded animate-pulse" />
          <div className="flex gap-3">
            <div className="h-12 w-36 bg-surface-2 rounded-card animate-pulse" />
            <div className="h-12 w-36 bg-surface-2 rounded-card animate-pulse" />
          </div>
        </div>
      </StoreContainer>
    );
  }

  if (error) {
    return (
      <StoreContainer className="py-16 text-center">
        <Icon icon={AlertTriangle} size="lg" className="mx-auto mb-3 text-warning" />
        <h2 className="text-xl font-bold mb-2">{t('home.loadError')}</h2>
        <StoreButton onClick={() => window.location.reload()}>{t('common.retry')}</StoreButton>
      </StoreContainer>
    );
  }

  const sections = theme?.homepage?.sections || [];

  const runtimeKey = resolveStorefrontThemeKey(theme?.themeKey || theme?.preset);
  const components = getStorefrontThemeComponents(runtimeKey);
  const HomePageComponent = components?.HomePage ?? BaseElegantHomePage;

  return (
    <HomePageComponent
      store={store}
      slug={slug!}
      theme={theme}
      products={products}
      categories={categories}
      sections={sections}
      onAddToCart={handleAddToCart}
    />
  );
}

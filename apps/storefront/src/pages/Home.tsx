import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/hooks/useStore';
import { useStorefrontTheme } from '@/hooks/useTheme';
import { useSharedCart } from '@/hooks/CartContext';
import { productsApi, categoriesApi, type PublicProduct, type PublicCategory } from '@/lib/api';
import { StoreContainer, StoreButton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { useSEO } from '@/hooks/useSEO';
// eslint-disable-next-line @typescript-eslint/no-restricted-imports -- P1-#5: lucide icon as <Icon> definition
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { getStorefrontThemeComponents, resolveStorefrontThemeKey } from '@haa/storefront-themes';
import BaseElegantHomePage from '@/themes/base-elegant/HomePage';

export default function Home() {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { store, loading: storeLoading, error: storeError } = useStore();
  const theme = useStorefrontTheme();
  const { addItem } = useSharedCart();

  useSEO({
    title: store?.name ? `${store.name} - ${t('home.title', 'متجر إلكتروني')}` : t('home.loading', 'جاري تحميل المتجر'),
    description: store?.description || undefined,
    ogImage: store?.logoUrl || undefined,
  });

  const [products, setProducts] = useState<PublicProduct[]>([]);
  const [categories, setCategories] = useState<PublicCategory[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!slug) return;
    // حارس ضد سباق الطلبات عند تبديل المتجر بسرعة (QA review #3).
    let cancelled = false;
    setContentLoading(true);
    setError(false);
    setProducts([]);
    setCategories([]);
    Promise.all([
      productsApi.list(slug, { limit: 50 }),
      categoriesApi.list(slug),
    ])
      .then(([p, c]) => {
        if (cancelled) return;
        setProducts(p);
        setCategories(c);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setContentLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  const handleAddToCart = useCallback(async (product: PublicProduct) => {
    if (!slug) return;
    try {
      await addItem(product.id, 1);
      toast.success(t('product.addedSuccessfully', 'تمت إضافة المنتج للسلة'), {
        action: { label: t('product.viewCart', 'عرض السلة'), onClick: () => navigate(`/s/${slug}/cart`) },
      });
    } catch {
      toast.error(t('product.addFailed', 'تعذّرت إضافة المنتج للسلة'));
    }
  }, [addItem, slug, t, navigate]);

  if (storeError) {
    return (
      <div className="overflow-x-hidden">
        <StoreContainer className="py-16 text-center">
          <Icon icon={AlertTriangle} size="lg" className="mx-auto mb-3 text-warning" />
          <h2 className="text-xl font-bold mb-2">{t('home.loadError', 'تعذّر تحميل الصفحة')}</h2>
          <StoreButton onClick={() => window.location.reload()}>{t('common.retry', 'إعادة المحاولة')}</StoreButton>
        </StoreContainer>
      </div>
    );
  }

  if (storeLoading || !store) {
    return (
      <div className="overflow-x-hidden">
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
      </div>
    );
  }

  if (error) {
    return (
      <div className="overflow-x-hidden">
        <StoreContainer className="py-16 text-center">
          <Icon icon={AlertTriangle} size="lg" className="mx-auto mb-3 text-warning" />
          <h2 className="text-xl font-bold mb-2">{t('home.loadError', 'تعذّر تحميل الصفحة')}</h2>
          <StoreButton onClick={() => window.location.reload()}>{t('common.retry', 'إعادة المحاولة')}</StoreButton>
        </StoreContainer>
      </div>
    );
  }

  // عرض هيكل تحميل للمحتوى بدل تمرير مصفوفات فارغة للثيم (QA review #1).
  if (contentLoading) {
    return (
      <div className="overflow-x-hidden">
        <StoreContainer className="py-8 space-y-6">
          <div className="h-40 w-full bg-surface-2 rounded-card animate-pulse" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-[3/4] bg-surface-2 rounded-card animate-pulse" />
            ))}
          </div>
        </StoreContainer>
      </div>
    );
  }

  const sections = theme?.homepage?.sections || [];

  const runtimeKey = resolveStorefrontThemeKey(theme?.themeKey || theme?.preset);
  const components = getStorefrontThemeComponents(runtimeKey);
  const HomePageComponent = components?.HomePage ?? BaseElegantHomePage;

  return (
    <div className="overflow-x-hidden">
      <HomePageComponent
        store={store}
        slug={slug!}
        theme={theme}
        products={products}
        categories={categories}
        sections={sections}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}

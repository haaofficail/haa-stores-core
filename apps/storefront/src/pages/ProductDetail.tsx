import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { productsApi, featuresApi, giftOptionsApi, checkoutApi, sizeGuidesApi } from '@/lib/api';
import { useSharedCart } from '@/hooks/CartContext';
import { tracker } from '@/lib/tracker';
import { StoreButton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { useSEO } from '@/hooks/useSEO';
import { useStore } from '@/hooks/useStore';
import { useStorefrontTheme } from '@/hooks/useTheme';
import { AlertTriangle, ArrowLeft, Package } from 'lucide-react';
import { toast } from 'sonner';
import { getStorefrontThemeComponents, resolveStorefrontThemeKey } from '@haa/storefront-themes';
import BaseElegantProductPage from '@/themes/base-elegant/ProductPage';

function useRecentlyViewed(slug: string | undefined, product: any | null) {
  const [recentItems, setRecentItems] = useState<Array<{ id: number; name: string; slug: string; image: string }>>([]);

  useEffect(() => {
    if (!slug) return;
    try {
      const key = `recent_${slug}`;
      const current = JSON.parse(localStorage.getItem(key) || '[]');
      if (product) {
        const updated = [{ id: product.id, name: product.name, slug: product.slug, image: product.images?.[0] || '' }, ...current.filter((r: any) => r.id !== product.id)].slice(0, 6);
        localStorage.setItem(key, JSON.stringify(updated));
        setRecentItems(updated);
      } else {
        setRecentItems(current);
      }
    } catch { setRecentItems([]); }
  }, [slug, product]);

  return recentItems;
}

export default function ProductDetail() {
  const { t } = useTranslation();
  const { store } = useStore();
  const theme = useStorefrontTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { slug, productSlug } = useParams<{ slug: string; productSlug: string }>();
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [adding, setAdding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [alsoBought, setAlsoBought] = useState<any[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);
  const [crossSellProducts, setCrossSellProducts] = useState<any[]>([]);
  const [features, setFeatures] = useState<Record<string, boolean> | null>(null);
  const [storeGiftOptions, setStoreGiftOptions] = useState<any | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [sizeGuide, setSizeGuide] = useState<any | null>(null);
  const [giftWrap, setGiftWrap] = useState(false);
  const [sendAsGift, setSendAsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const watcherCount = product?.views ?? null;
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const { addItem } = useSharedCart();
  const cartSource = searchParams.get('source') === 'haa_marketplace' ? 'haa_marketplace' : 'storefront';

  useEffect(() => {
    if (product?.options?.length) {
      const initial: Record<string, string> = {};
      for (const opt of product.options) {
        if (opt.values.length > 0) {
          initial[opt.name] = opt.values[0].value;
        }
      }
      setSelectedOptions(initial);
    }
  }, [product?.options]);

  const selectedVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    const keys = Object.keys(selectedOptions);
    if (keys.length === 0) return null;
    return product.variants.find((v: any) =>
      keys.every(k => v.options[k] === selectedOptions[k])
    ) ?? null;
  }, [product?.variants, selectedOptions]);

  const effectivePrice = selectedVariant?.price ?? product?.price ?? '0';
  const effectiveCompareAtPrice = selectedVariant ? product?.compareAtPrice : product?.compareAtPrice;
  const effectiveStockQuantity = selectedVariant?.stockQuantity ?? product?.stockQuantity ?? 0;
  const hasOptions = product?.options != null && product.options.length > 0;

  const recentlyViewed = useRecentlyViewed(slug, product);

  useSEO({
    title: product ? `${product.name} - ${store?.name || ''}` : t('product.loading'),
    description: product?.description || undefined,
    ogImage: product?.images?.[0],
    ogType: 'product',
  });

  const fetchProduct = useCallback(() => {
    if (!slug || !productSlug) return;
    setLoading(true); setError(false); setAdded(false); setQuantity(1);
    productsApi.getBySlug(slug, productSlug)
      .then((p: any) => setProduct(p.status !== 'active' ? null : p))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug, productSlug]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  useEffect(() => {
    if (slug && product?.id) {
      tracker.trackProductView(slug, product.id);
    }
  }, [slug, product?.id]);

  useEffect(() => {
    if (!slug) return;
    featuresApi.get(slug).then(setFeatures).catch(() => {});
    giftOptionsApi.get(slug).then(setStoreGiftOptions).catch(() => {});
    checkoutApi.getPaymentMethods(slug).then((res: any) => setPaymentMethods(res.methods)).catch(() => setPaymentMethods([]));
  }, [slug]);

  useEffect(() => {
    if (!slug || !product?.id) {
      setSizeGuide(null);
      return;
    }
    sizeGuidesApi.getForProduct(slug, product.id).then(setSizeGuide).catch(() => setSizeGuide(null));
  }, [slug, product?.id]);

  useEffect(() => {
    if (!slug || !product?.categoryId) return;
    productsApi.list(slug, { limit: 5, category: String(product.categoryId) })
      .then((res: any) => setAlsoBought(res.data.filter((p: any) => p.id !== product.id && p.status === 'active').slice(0, 4)))
      .catch(() => {});
  }, [slug, product?.categoryId, product?.id]);

  useEffect(() => {
    if (!slug || !product?.categoryId) return;
    productsApi.list(slug, { limit: 5, category: String(product.categoryId) })
      .then((res: any) => setRelatedProducts(res.data.filter((p: any) => p.id !== product.id && p.status === 'active').slice(0, 4)))
      .catch(() => {});
  }, [slug, product?.categoryId, product?.id]);

  useEffect(() => {
    if (!slug) return;
    productsApi.list(slug, { limit: 4 })
      .then((res: any) => setCrossSellProducts(res.data.filter((p: any) => p.status === 'active').sort((a: any, b: any) => Number(a.price) - Number(b.price)).slice(0, 4)))
      .catch(() => {});
  }, [slug]);

  const handleOptionChange = useCallback((name: string, value: string) => {
    setSelectedOptions(prev => ({ ...prev, [name]: value }));
  }, []);

  const isOutOfStock = Boolean(product?.trackInventory && effectiveStockQuantity <= 0);
  const maxQuantity = product?.trackInventory ? Math.max(1, effectiveStockQuantity) : 99;
  const hasDiscount = product ? effectiveCompareAtPrice && Number(effectiveCompareAtPrice) > Number(effectivePrice) : false;
  const countdownEnd = useMemo(() => hasDiscount && product?.offerEndDate ? new Date(product.offerEndDate).getTime() : 0, [hasDiscount, product?.offerEndDate]);
  const discountPercent = useMemo(() => hasDiscount && product ? Math.round((1 - Number(effectivePrice) / Number(effectiveCompareAtPrice!)) * 100) : 0, [hasDiscount, product, effectivePrice, effectiveCompareAtPrice]);
  const isLowStock = Boolean(product?.trackInventory && effectiveStockQuantity > 0 && effectiveStockQuantity <= 5);
  const hasDimensions = product ? product.lengthCm || product.widthCm || product.heightCm : false;
  const hasWeight = product ? product.weightGrams != null && product.weightGrams > 0 : false;
  const isFreeShipping = true;
  const showSizeGuide = Boolean(product && features?.sizeGuide !== false && sizeGuide && sizeGuide.rows.length > 0);
  const hasElectronicPayment = paymentMethods.some((method: any) =>
    method.available && method.provider !== 'cash_on_delivery' && method.provider !== 'cod'
  );

  const giftData = useMemo(() => ({
    giftWrapSelected: giftWrap,
    sendAsGift,
    giftMessage: sendAsGift ? giftMessage : undefined,
  }), [giftWrap, sendAsGift, giftMessage]);

  const giftWrapPriceDisplay = useMemo(() => {
    if (!giftWrap || !product) return null;
    const override = product.giftWrapPriceOverride ? Number(product.giftWrapPriceOverride) : undefined;
    const defaultPrice = storeGiftOptions?.giftWrapDefaultPrice ? Number(storeGiftOptions.giftWrapDefaultPrice) : undefined;
    return override ?? defaultPrice ?? 0;
  }, [giftWrap, product, storeGiftOptions]);

  const handleAddToCart = useCallback(async () => {
    if (!product || isOutOfStock) return;
    if (hasOptions && !selectedVariant) { toast.error(t('product.variantUnavailable', 'هذا الخيار غير متوفر')); return; }
    if (quantity < 1) { toast.error(t('product.quantityMin')); return; }
    if (quantity > maxQuantity) { toast.error(t('product.quantityMax')); return; }
    setAdding(true);
    try {
      await addItem(product.id, quantity, undefined, giftData, selectedVariant?.id, cartSource);
      setAdded(true);
      toast.success(t('product.addedSuccessfully'), {
        action: { label: t('product.viewCart'), onClick: () => navigate(`/s/${slug}/cart`) },
      });
    } catch { toast.error(t('common.error')); }
    finally { setAdding(false); }
  }, [product, isOutOfStock, hasOptions, selectedVariant, quantity, maxQuantity, addItem, slug, t, navigate, giftData, cartSource]);

  const handleBuyNow = useCallback(async () => {
    if (!product || isOutOfStock) return;
    if (hasOptions && !selectedVariant) { toast.error(t('product.variantUnavailable', 'هذا الخيار غير متوفر')); return; }
    if (quantity < 1) { toast.error(t('product.quantityMin')); return; }
    if (quantity > maxQuantity) { toast.error(t('product.quantityMax')); return; }
    setBuying(true);
    try {
      await addItem(product.id, quantity, undefined, giftData, selectedVariant?.id, cartSource);
      navigate(`/s/${slug}/checkout`);
    } catch { toast.error(t('common.error')); }
    finally { setBuying(false); }
  }, [product, isOutOfStock, hasOptions, selectedVariant, quantity, maxQuantity, addItem, slug, t, navigate, giftData, cartSource]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (slug && product?.id) {
      tracker.trackShare(slug, product.id, 'product');
    }
    if (navigator.share) {
      try { await navigator.share({ title: product?.name, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast.success(t('product.linkCopied', 'تم نسخ الرابط'));
      } catch { toast.error(t('common.error')); }
    }
  }, [slug, product?.name, product?.id, t]);

  useEffect(() => {
    if (!showSizeGuide && sizeGuideOpen) setSizeGuideOpen(false);
  }, [showSizeGuide, sizeGuideOpen]);

  if (loading) {
    return (
      <div className="container-store" style={{ paddingBlock: 'var(--space-8)' }}>
        <div className="animate-pulse" style={{ marginBlockEnd: 'var(--space-8)' }}>
          <div className="h-4 w-48 bg-surface-2" style={{ borderRadius: 'var(--radius-sm, 6px)' }} />
        </div>
        <div className="grid md:grid-cols-2" style={{ gap: 'var(--space-6)' }}>
          <div className="aspect-square bg-surface-2" style={{ borderRadius: 'var(--radius-2xl, 16px)' }} />
          <div className="animate-pulse [&>*+*]:mt-[var(--space-4)]">
            <div className="h-8 w-3/4 bg-surface-2" style={{ borderRadius: 'var(--radius-sm, 6px)' }} />
            <div className="h-6 w-1/3 bg-surface-2" style={{ borderRadius: 'var(--radius-sm, 6px)' }} />
            <div className="h-24 bg-surface-2" style={{ borderRadius: 'var(--radius-lg, 12px)' }} />
            <div className="h-12 bg-surface-2" style={{ borderRadius: 'var(--radius-lg, 12px)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-store text-center" style={{ paddingBlock: 'var(--space-8)' }}>
        <Icon icon={AlertTriangle} size="lg" className="mx-auto text-warning" style={{ marginBlockEnd: 'var(--space-3)' }} />
        <h2 className="text-xl font-bold" style={{ marginBlockEnd: 'var(--space-2)' }}>{t('product.loadError')}</h2>
        <div className="flex items-center justify-center" style={{ gap: 'var(--space-3)', marginBlockStart: 'var(--space-6)' }}>
          <StoreButton onClick={fetchProduct}>{t('common.retry')}</StoreButton>
          <StoreButton variant="secondary" href={`/s/${slug}`}>{t('common.back')}</StoreButton>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container-store text-center" style={{ paddingBlock: 'var(--space-8)' }}>
        <Icon icon={Package} size="xl" className="text-text-disabled mx-auto" style={{ marginBlockEnd: 'var(--space-4)' }} />
        <h2 className="text-xl font-bold" style={{ marginBlockEnd: 'var(--space-2)' }}>{t('product.notFound')}</h2>
        <p className="text-sm text-text-secondary" style={{ marginBlockEnd: 'var(--space-6)' }}>{t('product.notFoundDesc')}</p>
        <StoreButton href={`/s/${slug}`} iconStart={<Icon icon={ArrowLeft} size="xs" />}>{t('cart.continueShopping')}</StoreButton>
      </div>
    );
  }

  const runtimeKey = resolveStorefrontThemeKey(theme?.themeKey || theme?.preset);
  const components = getStorefrontThemeComponents(runtimeKey);
  const ProductPageComponent = components?.ProductPage ?? BaseElegantProductPage;

  return (
    <ProductPageComponent
      store={store}
      product={product}
      slug={slug!}
      theme={theme}
      features={features}
      quantity={quantity}
      selectedOptions={selectedOptions}
      alsoBought={alsoBought}
      relatedProducts={relatedProducts}
      crossSellProducts={crossSellProducts}
      storeGiftOptions={storeGiftOptions}
      paymentMethods={paymentMethods}
      sizeGuide={sizeGuide}
      giftWrap={giftWrap}
      sendAsGift={sendAsGift}
      giftMessage={giftMessage}
      detailsOpen={detailsOpen}
      showFullDesc={showFullDesc}
      sizeGuideOpen={sizeGuideOpen}
      onQuantityChange={setQuantity}
      onGiftWrapChange={setGiftWrap}
      onSendAsGiftChange={setSendAsGift}
      onGiftMessageChange={setGiftMessage}
      onDetailsOpenChange={setDetailsOpen}
      onShowFullDescChange={setShowFullDesc}
      onSizeGuideOpenChange={setSizeGuideOpen}
      onOptionChange={handleOptionChange}
      onAddToCart={handleAddToCart}
      onBuyNow={handleBuyNow}
      onShare={handleShare}
      effectivePrice={effectivePrice}
      effectiveCompareAtPrice={effectiveCompareAtPrice}
      effectiveStockQuantity={effectiveStockQuantity}
      hasOptions={hasOptions}
      isOutOfStock={isOutOfStock}
      maxQuantity={maxQuantity}
      hasDiscount={hasDiscount}
      countdownEnd={countdownEnd}
      discountPercent={discountPercent}
      isLowStock={isLowStock}
      hasDimensions={hasDimensions}
      hasWeight={hasWeight}
      isFreeShipping={isFreeShipping}
      showSizeGuide={showSizeGuide}
      hasElectronicPayment={hasElectronicPayment}
      watcherCount={watcherCount}
      adding={adding}
      buying={buying}
      added={added}
      giftWrapPriceDisplay={giftWrapPriceDisplay}
      recentlyViewed={recentlyViewed}
    />
  );
}

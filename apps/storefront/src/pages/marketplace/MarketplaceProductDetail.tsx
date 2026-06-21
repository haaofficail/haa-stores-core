import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  BadgeCheck, ChevronLeft, ChevronRight, Headphones, Heart, Info, Maximize2, Minus,
  PackageCheck, Plus, RotateCcw, Search, ShieldCheck, ShoppingBag, Store, TrendingUp, Truck,
} from 'lucide-react';
import { haaMarketplaceApi, type HaaMarketplaceProduct } from '@/lib/api';
import { StoreButton, StoreEmptyState, StoreSkeleton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { BNPLBadges, CurrencyAmount, CurrencyStrike, SavingsBadge, MarketplaceProductCard } from '@/components/product-card';
import { useSEO } from '@/hooks/useSEO';
import { marketplaceCart } from '@/lib/marketplace-cart';
import { toast } from 'sonner';
import { RatingStars } from '@/components/product-card';
import { MarketplaceFooter } from './theme/MarketplaceFooter';

const trustItems = [
  { icon: ShieldCheck, title: 'تسوق آمن', text: 'متاجر موثوقة', color: 'text-success' },
  { icon: PackageCheck, title: 'حماية المشتري', text: 'نضمن حقوقك', color: 'text-warning' },
  { icon: Truck, title: 'توصيل سريع', text: 'لكل المناطق', color: 'text-primary-500' },
  { icon: BadgeCheck, title: 'دفع آمن', text: 'خيارات متعددة', color: 'text-info' },
  { icon: RotateCcw, title: 'مرتجعات', text: 'سياسة واضحة', color: 'text-danger' },
  { icon: Headphones, title: 'دعم فني', text: 'مسار دعم واضح', color: 'text-primary-500' },
];

export default function MarketplaceProductDetail() {
  const { storeSlug, productSlug } = useParams<{ storeSlug: string; productSlug: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<HaaMarketplaceProduct | null>(null);
  const [similarProducts, setSimilarProducts] = useState<HaaMarketplaceProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // إغلاق معاينة الصورة بمفتاح Escape (QA A2 — وصولية المودال).
  useEffect(() => {
    if (!imagePreviewOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setImagePreviewOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [imagePreviewOpen]);
  const [cartCount, setCartCount] = useState(() => marketplaceCart.count());

  useSEO({
    title: product ? `${product.name} | سوق هاء` : 'منتج في سوق هاء',
    description: product?.description || 'صفحة منتج في سوق هاء.',
  });

  useEffect(() => {
    if (!storeSlug || !productSlug) return;
    // حارس ضد سباق الطلبات: نتجاهل نتيجة طلب قديم لو تغيّر المنتج (QA review #3).
    let cancelled = false;
    setLoading(true);
    setSimilarProducts([]); // امسح المشابهة من المنتج السابق فوراً (QA review #4)
    setSelectedImage(0);
    setQuantity(1); // صفّر الكمية عند تغيير المنتج (QA review #2)
    haaMarketplaceApi.getProduct(storeSlug, productSlug)
      .then((result) => {
        if (cancelled) return;
        setProduct(result);
        if (!result?.categorySlug) { setSimilarProducts([]); return; }
        return haaMarketplaceApi.listProducts({ category: result.categorySlug, limit: 8 })
          .then((res) => {
            if (cancelled) return;
            setSimilarProducts(res.data.filter(
              (p: HaaMarketplaceProduct) => !(p.store.slug === storeSlug && p.slug === productSlug)
            ).slice(0, 4));
          })
          .catch(() => { if (!cancelled) setSimilarProducts([]); });
      })
      .catch(() => { if (!cancelled) { setProduct(null); setSimilarProducts([]); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [storeSlug, productSlug]);

  useEffect(() => {
    const refresh = () => setCartCount(marketplaceCart.count());
    window.addEventListener('haa-marketplace-cart-change', refresh);
    return () => window.removeEventListener('haa-marketplace-cart-change', refresh);
  }, []);

  const images = product?.images?.length ? product.images : [];
  const activeImage = images[selectedImage] ?? null;
  const hasDiscount = product?.compareAtPrice && Number(product.compareAtPrice) > Number(product.price);
  const outOfStock = !!(product && product.trackInventory && product.stockQuantity <= 0);
  const maxQuantity = product?.trackInventory ? Math.max(1, product.stockQuantity) : 99;
  // مصدر موحّد لحالة الديمو (قد تأتي من المنتج أو من المتجر) — QA review #1
  const isDemoStore = product?.store?.isDemoStore === true || product?.isDemoStore === true;
  const discount = hasDiscount ? Math.round((1 - Number(product.price) / Number(product.compareAtPrice!)) * 100) : null;
  const savings = hasDiscount ? Number(product.compareAtPrice!) - Number(product.price) : 0;
  const installmentAmount = product ? Number(product.price) / 4 : 0;
  const galleryImages = images.length ? images : [null];
  const dimensions = product && product.lengthCm && product.widthCm && product.heightCm
    ? `${product.lengthCm} × ${product.widthCm} × ${product.heightCm} سم`
    : null;
  const specs = product ? [
    { label: 'رقم المنتج', value: product.sku || `MP-${product.id}` },
    { label: 'التصنيف', value: product.categoryName },
    { label: 'المتجر', value: product.store.name },
    { label: 'المدينة', value: product.store.city ?? 'المملكة العربية السعودية' },
    { label: 'المخزون', value: product.trackInventory ? `${Math.max(product.stockQuantity, 0)} قطعة` : 'متاح' },
    { label: 'الشحن', value: product.requiresShipping ? 'يشحن للعميل' : 'لا يتطلب شحنا' },
    { label: 'الوزن', value: product.weightGrams ? `${product.weightGrams} جم` : null },
    { label: 'الأبعاد', value: dimensions },
  ].filter((item) => item.value != null && item.value !== '') : [];

  const safeQuantity = () => {
    if (!product) return 0;
    return product.trackInventory ? Math.min(quantity, Math.max(0, product.stockQuantity)) : quantity;
  };
  const addToCart = () => {
    if (!product || outOfStock) return;
    const qty = safeQuantity();
    if (qty <= 0) return;
    marketplaceCart.add(product, qty);
    toast.success('تمت الإضافة إلى سلة سوق هاء');
  };

  const buyNow = () => {
    if (!product || outOfStock) return;
    const qty = safeQuantity();
    if (qty <= 0) return;
    marketplaceCart.add(product, qty);
    toast.success('تم تجهيز المنتج لإتمام الشراء');
    navigate('/marketplace/checkout');
  };

  const selectRelativeImage = (direction: 1 | -1) => {
    if (galleryImages.length <= 1) return;
    setSelectedImage((current) => (current + direction + galleryImages.length) % galleryImages.length);
  };

  if (loading) {
    return (
      <main id="storefront-scope" data-theme-scope="storefront" className="min-h-screen bg-white text-black overflow-x-hidden">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-4">
          <StoreSkeleton className="h-8 w-40" />
          <div className="mt-4 grid gap-4 lg:grid-cols-[400px_1fr_260px]">
            <StoreSkeleton className="aspect-square rounded-xl" />
            <StoreSkeleton className="h-[400px] rounded-xl" />
            <StoreSkeleton className="h-[300px] rounded-xl" />
          </div>
        </div>
      </main>
    );
  }

  if (!product) {
    return (
      <main id="storefront-scope" data-theme-scope="storefront" className="min-h-screen bg-white text-black overflow-x-hidden">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-8">
          <StoreEmptyState icon={ShoppingBag} title="المنتج غير موجود" description="لم يتم العثور على هذا المنتج داخل سوق هاء." action={<StoreButton href="/marketplace">العودة للسوق</StoreButton>} />
        </div>
      </main>
    );
  }

  return (
    <main id="storefront-scope" data-theme-scope="storefront" className="min-h-screen bg-white text-black pb-20 sm:pb-0 overflow-x-hidden">
      {/* ── Sticky Mini Header ── */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-100">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <div className="grid min-h-[56px] grid-cols-[auto_1fr_auto] items-center gap-3">
            <Link to="/marketplace" className="flex items-center gap-2">
              <span className="text-base font-bold text-black">
                سوق <span className="text-primary-500">هاء</span>
              </span>
            </Link>

            <Link to="/marketplace" className="hidden min-w-0 items-center gap-2 rounded-xl bg-gray-100 px-3 py-1.5 text-sm text-gray-500 lg:flex">
              <Icon icon={Search} size="2xs" />
              <span className="truncate">ابحث في سوق هاء</span>
            </Link>

            <nav className="flex items-center gap-1.5 text-xs font-bold text-primary-600">
              <Link to="/marketplace/sellers" className="hidden px-2 py-1.5 hover:text-primary-500 md:inline-flex">البائعون</Link>
              <Link to="/marketplace/cart" className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200">
                <Icon icon={ShoppingBag} size="2xs" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -end-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-xs text-white">{cartCount}</span>
                )}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-4 sm:px-6 lg:px-8 py-3 sm:py-4">
        {/* ── Breadcrumb ── */}
        <div className="mb-3 flex min-w-0 flex-wrap items-center gap-1.5 text-xs font-bold text-gray-400">
          <Link to="/marketplace" className="hover:text-primary-500 transition-colors">الرئيسية</Link>
          <ChevronRight className="h-3 w-3" />
          <Link to="/marketplace" className="hover:text-primary-500 transition-colors">سوق هاء</Link>
          <ChevronRight className="h-3 w-3" />
          {product.categoryName && (
            <>
              <span className="text-primary-500">{product.categoryName}</span>
              <ChevronRight className="h-3 w-3" />
            </>
          )}
          <span className="max-w-[200px] truncate text-black">{product.name}</span>
        </div>

        {/* ── Main Grid: Gallery + Info + Seller ── */}
        <div className="grid gap-4 lg:grid-cols-[400px_1fr_240px]">
          {/* ═══ Gallery ═══ */}
          <div className="min-w-0">
            <div className="relative overflow-hidden rounded-xl bg-white ring-1 ring-gray-100">
              <button type="button" aria-label="حفظ المنتج" className="absolute top-3 end-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-400 shadow-sm hover:text-danger transition-colors">
                <Icon icon={Heart} size="2xs" />
              </button>
              {activeImage && (
                <button type="button" aria-label="تكبير الصورة" onClick={() => setImagePreviewOpen(true)} className="absolute top-3 start-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg bg-white text-gray-500 shadow-sm hover:text-primary-500 transition-colors">
                  <Icon icon={Maximize2} size="2xs" />
                </button>
              )}
              {galleryImages.length > 1 && (
                <>
                  <button type="button" aria-label="الصورة السابقة" onClick={() => selectRelativeImage(-1)} className="absolute top-1/2 start-3 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm hover:text-primary-500 transition-colors">
                    <Icon icon={ChevronRight} size="2xs" />
                  </button>
                  <button type="button" aria-label="الصورة التالية" onClick={() => selectRelativeImage(1)} className="absolute top-1/2 end-3 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-600 shadow-sm hover:text-primary-500 transition-colors">
                    <Icon icon={ChevronLeft} size="2xs" />
                  </button>
                </>
              )}
              <div className="aspect-square p-1 sm:p-2">
                {activeImage ? (
                  <button type="button" onClick={() => setImagePreviewOpen(true)} className="h-full w-full" aria-label="تكبير صورة المنتج">
                    <img src={activeImage} alt={product.name} referrerPolicy="no-referrer" className="h-full w-full object-contain" />
                  </button>
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300">
                    <Icon icon={ShoppingBag} size="xl" />
                  </div>
                )}
              </div>
              {galleryImages.length > 1 && (
                <span className="absolute bottom-3 start-3 rounded-lg bg-black/60 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
                  {selectedImage + 1} / {galleryImages.length}
                </span>
              )}
            </div>
            {images.length > 0 && (
              <div className="mt-2 grid grid-cols-5 gap-1.5">
                {galleryImages.slice(0, 5).map((image, index) => (
                  <button
                    key={image ?? `ph-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    aria-label={`صورة ${index + 1}`}
                    className={`aspect-square rounded-xl bg-gray-50 p-1 transition-colors ${selectedImage === index ? 'ring-2 ring-primary-500' : 'ring-1 ring-gray-100'}`}
                  >
                    {image ? <img src={image} alt="" className="h-full w-full object-contain" /> : <Icon icon={ShoppingBag} size="2xs" className="mx-auto text-gray-300" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ═══ Product Info ═══ */}
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {hasDiscount && (
                <span className="rounded-lg bg-danger px-2 py-0.5 text-xs font-bold text-white">خصم {discount}%</span>
              )}
              {product.categoryName && (
                <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">{product.categoryName}</span>
              )}
              {product.haaMarketplaceFeatured && (
                <span className="rounded-lg bg-primary-500 px-2 py-0.5 text-xs font-bold text-white">مختار للسوق</span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-black leading-tight">{product.name}</h1>

            <div className="flex min-h-[20px] flex-wrap items-center gap-2">
              {product.rating != null && product.rating > 0 && (
                <RatingStars rating={product.rating} count={product.reviewCount} size="3xs" />
              )}
              <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5 text-xs font-bold text-gray-600 ring-1 ring-gray-100">
                <TrendingUp className="h-3 w-3 text-success" />
                {product.salesCount != null && product.salesCount > 0 ? product.salesCount : 0}+ مبيع
              </span>
            </div>

            {product.description && (
              <p className="text-sm leading-relaxed text-gray-500">{product.description}</p>
            )}

            {/* Price */}
            <div className="space-y-2 py-1">
              <div className="flex flex-wrap items-center gap-2">
                <CurrencyAmount amount={Number(product.price)} size="xl" weight="bold" decimals={2} />
                {hasDiscount && <CurrencyStrike amount={Number(product.compareAtPrice)} size="lg" decimals={2} />}
                {hasDiscount && <SavingsBadge value={savings} />}
              </div>
              <div className="rounded-xl bg-gray-50 px-2.5 py-2 ring-1 ring-gray-100">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-xs font-extrabold text-black">خذها الآن</p>
                      <span className="rounded-full bg-success-soft px-2 py-0.5 text-xs font-extrabold text-success ring-1 ring-success-soft">بدون فوائد</span>
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-gray-500">قسّمها على 4 دفعات مع تابي أو تمارا</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-white px-2.5 py-1.5 text-center ring-1 ring-gray-100">
                      <p className="text-xs font-bold leading-none text-gray-500">ادفع الآن فقط</p>
                      <CurrencyAmount amount={installmentAmount} size="lg" weight="bold" decimals={2} className="mt-1" />
                    </div>
                    <BNPLBadges size="md" />
                  </div>
                </div>
                <p className="mt-1 text-xs leading-4 text-gray-400">
                  يتم تأكيد الأهلية وجدولة الدفعات عند الدفع.
                </p>
              </div>
            </div>
            <p className="text-xs font-medium text-gray-400">
              يُضاف إلى سلة سوق هاء الموحدة.
            </p>

              {/* Info cards */}
              <div className="flex rounded-xl bg-gray-50 overflow-hidden">
                {[
                  { icon: PackageCheck, title: outOfStock ? 'غير متوفر' : 'متوفر', color: 'text-success' },
                  { icon: ShieldCheck, title: 'ضمان من البائع', color: 'text-warning' },
                  { icon: Truck, title: 'توصيل سريع', color: 'text-primary-500' },
                ].map((item) => (
                  <div key={item.title} className="flex flex-1 items-center justify-center gap-1 py-2 sm:border-e sm:border-gray-200 sm:last:border-e-0">
                    <Icon icon={item.icon} size="2xs" className={`shrink-0 ${item.color}`} />
                    <p className="text-xs font-bold text-black whitespace-nowrap">{item.title}</p>
                  </div>
                ))}
              </div>

            {/* Quantity + Add to Cart */}
            <div className="grid gap-2 sm:grid-cols-[90px_1fr_1fr]">
              <div className="grid min-h-[44px] grid-cols-3 overflow-hidden rounded-xl bg-gray-50 ring-1 ring-gray-100">
                <button type="button" aria-label="تقليل الكمية" onClick={() => setQuantity((v) => Math.max(1, v - 1))} className="flex min-h-[44px] items-center justify-center text-black hover:bg-gray-100 transition-colors">
                  <Icon icon={Minus} size="2xs" />
                </button>
                <span className="flex min-h-[44px] items-center justify-center text-sm font-bold">{quantity}</span>
                <button type="button" aria-label="زيادة الكمية" onClick={() => setQuantity((v) => Math.min(maxQuantity, v + 1))} className="flex min-h-[44px] items-center justify-center text-black hover:bg-gray-100 transition-colors">
                  <Icon icon={Plus} size="2xs" />
                </button>
              </div>
              <StoreButton
                type="button"
                disabled={outOfStock}
                onClick={addToCart}
                className="min-h-[44px] rounded-xl bg-primary-500 text-white hover:bg-primary-600 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                iconStart={<Icon icon={ShoppingBag} size="xs" />}
              >
                {outOfStock ? 'نفد المخزون' : <>أضف للسلة</>}
              </StoreButton>
              <StoreButton
                type="button"
                disabled={outOfStock}
                onClick={buyNow}
                className="min-h-[44px] rounded-xl bg-black text-white hover:bg-gray-800 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                iconStart={<Icon icon={ShoppingBag} size="xs" />}
              >
                شراء الآن
              </StoreButton>
            </div>
            <Link
              to={product.merchantProductUrl?.startsWith('/') ? product.merchantProductUrl : `/s/${product.store.slug}/p/${product.slug}?source=haa_marketplace`}
              className="inline-flex text-xs font-bold text-primary-500 hover:text-primary-600"
            >
              عرض في متجر التاجر
            </Link>

          </div>

          {/* ═══ Seller Card ═══ */}
          <aside className="h-fit min-w-0 rounded-xl bg-white ring-1 ring-gray-100 p-4 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-gray-50 text-gray-400 ring-4 ring-gray-50">
              {product.store.logoUrl ? <img src={product.store.logoUrl} alt={product.store.name} referrerPolicy="no-referrer" className="h-full w-full object-cover" /> : <Icon icon={Store} size="md" />}
            </span>
            {/* Trust badge — gated by kycVerified to avoid misleading
                visitors. Demo stores and unverified stores must NOT
                show this badge. The backend should set kycVerified
                only after KYC + MoCI registration is confirmed. */}
            {product.store.kycVerified === true && !isDemoStore && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-lg bg-success/10 px-2 py-0.5 text-xs font-bold text-success">
                <Icon icon={BadgeCheck} size="2xs" />
                متجر موثوق
              </div>
            )}
            {isDemoStore && (
              <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-warning-soft border border-warning-soft px-2 py-0.5 text-xs font-bold text-warning">
                <Info className="h-3 w-3" />
                متجر تجريبي
              </div>
            )}
            <h2 className="mt-1.5 text-sm font-bold text-black">{product.store.name}</h2>
            <p className="mt-0.5 text-xs font-medium text-gray-500">{product.store.city ?? 'المملكة العربية السعودية'}</p>
              <StoreButton href={`/marketplace/sellers/${product.store.slug}`} className="mt-3 w-full min-h-[44px] rounded-xl bg-primary-500 text-white hover:bg-primary-600 text-xs font-bold transition-colors">
              جميع منتجات البائع
            </StoreButton>
          </aside>
        </div>

        {/* ── Mobile Sticky Add-to-Cart ── */}
        <div className="fixed bottom-0 inset-x-0 z-30 border-t border-gray-200 bg-white p-3 sm:hidden">
          <div className="flex items-center justify-between gap-3">
            <CurrencyAmount amount={Number(product.price)} size="md" weight="bold" />
            <StoreButton
              type="button"
              disabled={outOfStock}
              onClick={addToCart}
              className="flex-1 min-h-[44px] rounded-xl bg-primary-500 text-white hover:bg-primary-600 text-sm font-bold flex items-center justify-center gap-1.5 transition-colors disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
              iconStart={<Icon icon={ShoppingBag} size="xs" />}
            >
              {outOfStock ? 'نفد المخزون' : 'أضف للسلة'}
            </StoreButton>
          </div>
        </div>

        {/* ── Trust Strip ── */}
        <section className="mt-2 grid grid-cols-3 gap-x-1 gap-y-0.5 rounded-xl bg-gray-50 p-1 sm:grid-cols-6">
          {trustItems.map((item) => (
            <div key={item.title} className="flex min-w-0 items-center gap-0.5 px-1">
              <Icon icon={item.icon} size="2xs" className={`shrink-0 ${item.color}`} />
              <div className="min-w-0">
                <p className="text-xs font-bold text-black leading-tight">{item.title}</p>
                <p className="text-xs text-gray-500 leading-tight">{item.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="mt-3 grid gap-3 lg:grid-cols-[1.12fr_0.88fr]">
          <div className="rounded-xl bg-white p-3 ring-1 ring-gray-100">
            <h2 className="text-sm font-bold text-black">تفاصيل المنتج</h2>
            <div className="mt-2.5 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-gray-500">الوصف</h3>
                <p className="mt-1 text-sm leading-6 text-gray-600">
                  {product.description || 'منتج مختار من أحد متاجر سوق هاء. راجع المواصفات وسياسات البائع قبل إتمام الطلب.'}
                </p>
              </div>
              <div>
                <h3 className="text-xs font-bold text-gray-500">المواصفات</h3>
                <dl className="mt-1.5 grid grid-cols-1 overflow-hidden rounded-xl border border-gray-100 sm:grid-cols-2">
                  {specs.map((item) => (
                    <div key={item.label} className="flex min-h-[34px] items-center justify-between gap-2 border-b border-gray-100 px-2.5 py-1.5 text-xs last:border-b-0 sm:odd:border-e">
                      <dt className="font-bold text-gray-500">{item.label}</dt>
                      <dd className="text-end font-semibold text-black">{item.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <section className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-100">
              <h2 className="text-xs font-bold text-black">الشحن والاسترجاع</h2>
              <div className="mt-1.5 grid divide-y divide-gray-100">
                {[
                  { icon: Truck, title: 'الشحن', text: product.requiresShipping ? 'يتم تجهيز وشحن الطلب عبر البائع بعد إتمام الدفع.' : 'هذا المنتج لا يتطلب شحنا.' },
                  { icon: RotateCcw, title: 'الاسترجاع', text: 'تطبق سياسة المتجر البائع على الاستبدال والاسترجاع.' },
                  { icon: ShieldCheck, title: 'الضمان', text: product.isFragile ? 'منتج قابل للكسر؛ يراجع البائع التغليف والتسليم بعناية.' : 'الضمان وخدمة ما بعد البيع مسؤولية المتجر البائع.' },
                  { icon: Headphones, title: 'الدعم', text: 'سوق هاء يوضح مسار الطلب، والإجراءات التشغيلية بعد الشراء تتم عبر المتجر.' },
                ].map((item) => (
                  <div key={item.title} className="grid grid-cols-[16px_56px_1fr] items-start gap-1.5 py-1.5 first:pt-0 last:pb-0">
                    <Icon icon={item.icon} size="2xs" className="mt-0.5 shrink-0 text-primary-500" />
                    <p className="text-xs font-bold leading-5 text-black">{item.title}</p>
                    <p className="text-xs leading-5 text-gray-500">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-xl bg-white px-3 py-2 ring-1 ring-gray-100">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold text-black">آراء العملاء</h2>
                {product.rating != null && product.rating > 0 && (
                  <RatingStars rating={product.rating} count={product.reviewCount} size="3xs" />
                )}
              </div>
              <div className="mt-1.5 flex items-start gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5">
                <p className="min-w-0 flex-1 text-xs leading-5 text-gray-500">
                  {product.reviewCount && product.reviewCount > 0
                    ? `متوسط التقييم ${product.rating?.toFixed(1)} من ${product.reviewCount} مراجعة، مع ${product.salesCount != null && product.salesCount > 0 ? product.salesCount : 0}+ مبيع.`
                    : 'لا توجد مراجعات تفصيلية منشورة لهذا المنتج حتى الآن.'}
                </p>
                {product.reviewCount && product.reviewCount > 0 ? (
                  <div className="shrink-0 rounded-full bg-white px-2 py-1 text-xs font-bold text-black ring-1 ring-gray-100">
                    {product.reviewCount} مراجعة
                  </div>
                ) : null}
              </div>
            </section>
          </div>
        </section>

        {/* ── Similar Products ── */}
        {similarProducts.length > 0 && (
          <section className="mt-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="text-sm font-bold text-black">منتجات مشابهة</h2>
              <Link to="/marketplace" className="text-xs font-bold text-primary-500 hover:text-primary-600 transition-colors">عرض الكل</Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
              {similarProducts.map((item) => (
                <MarketplaceProductCard key={`${item.store.slug}-${item.id}`} product={item} />
              ))}
            </div>
          </section>
        )}
      </div>

      <MarketplaceFooter />

      {imagePreviewOpen && activeImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label="معاينة صورة المنتج" onClick={() => setImagePreviewOpen(false)}>
          <button type="button" autoFocus onClick={() => setImagePreviewOpen(false)} className="absolute top-4 end-4 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-black">
            إغلاق
          </button>
          {/* إيقاف انتشار النقر حتى لا يُغلق عند الضغط على الصورة نفسها (QA review #9) */}
          <img src={activeImage} alt={product.name} referrerPolicy="no-referrer" onClick={(e) => e.stopPropagation()} className="max-h-[86vh] max-w-[92vw] object-contain" />
        </div>
      )}
    </main>
  );
}

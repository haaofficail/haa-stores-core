import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { productsApi, categoriesApi, brandsApi, tagsApi, marketplaceApi, settingsApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Search, Package, AlertTriangle, Loader2, Globe, Store, LayoutGrid, List, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api';
import { generateSlug } from '@/lib/slug';
import { getStorefrontOrigin } from '@/lib/storefront-url';
import { validateProduct, getWarnings, type ProductFormData, type ProductOption, type ProductVariant, type ValidationError } from '@/lib/product-validation';
import { ProductBulkActionsBar } from '@/components/products/ProductBulkActionsBar';
import { ProductListTable, type ProductRowData } from '@/components/products/ProductListTable';
import { ProductGrid } from '@/components/products/ProductGrid';
import { ProductFormDialog } from '@/components/products/ProductFormDialog';
import { buildProductsCsv, downloadBlob } from '@/lib/products/csv';
import { PermissionGate } from '@/lib/permissions';

const PROVIDERS = [
  { code: 'salla', name: 'سلة', color: 'from-green-400 via-green-600 to-green-800' },
  { code: 'zid', name: 'زد', color: 'from-primary-400 via-primary-600 to-primary-800' },
  { code: 'noon', name: 'نون', color: 'from-amber-300 via-amber-500 to-amber-600' },
  { code: 'amazon', name: 'أمازون', color: 'from-orange-400 via-orange-600 to-gray-900' },
];

const emptyForm: ProductFormData = {
  name: '', slug: '', description: '', status: 'draft', type: 'physical',
  price: '', compareAtPrice: '', cost: '', sku: '', barcode: '',
  stockQuantity: 0, trackInventory: true, weightGrams: '',
  lengthCm: '', widthCm: '', heightCm: '',
  requiresShipping: true, isFragile: false,
  giftWrapAvailable: false, giftWrapPriceOverride: '',
  haaMarketplaceEnabled: false, haaMarketplaceCommissionRate: '0.05',
  salesCount: 0, seoTitle: '', seoDescription: '', categoryIds: [], brandId: undefined, tagIds: [],
  hasVariants: false, options: [], variants: [],
};

export default function Products() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [products, setProducts] = useState<ProductRowData[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [categories, setCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [brands, setBrands] = useState<Array<{ id: number; name: string }>>([]);
  const [tags, setTags] = useState<Array<{ id: number; name: string }>>([]);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [brandFilter, setBrandFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ProductFormData>(emptyForm);
  const [productImages, setProductImages] = useState<Array<{ id: number; url: string }>>([]);
  const [queuedImages, setQueuedImages] = useState<{ file: File; preview: string }[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [touched, setTouched] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [publishDialog, setPublishDialog] = useState<{ productId: number; open: boolean }>({ productId: 0, open: false });
  const [publishing, setPublishing] = useState(false);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [publishProductData, setPublishProductData] = useState<{ id: number; name: string; status?: string; marketplaceChannels?: Record<string, { status: string; productId?: string }> } | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [storeSlug, setStoreSlug] = useState('');
  const [stockFilter, setStockFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window === 'undefined') return 'table';
    return localStorage.getItem('products_view_mode') === 'grid' ? 'grid' : 'table';
  });
  const STOREFRONT_BASE = getStorefrontOrigin();

  useEffect(() => {
    if (!storeId) return;
    settingsApi.get(storeId).then(s => setStoreSlug((s as { slug: string }).slug)).catch(() => {});
  }, [storeId]);

  const limit = 20;

  // Monotonic load id — every call to loadProducts() bumps this and
  // captures it locally. When the in-flight response resolves, it
  // checks the captured id against the current ref; if a newer
  // call started while we were waiting, the older response is
  // discarded. Without this guard, filter changes in quick
  // succession could show the OLDER response's data because the
  // network returned them in the wrong order. Audit P0 #25
  // (2026-06-25).
  const loadIdRef = useRef(0);

  const loadProducts = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    const myLoadId = ++loadIdRef.current;
    setLoading(true);
    setFetchError(false);
    Promise.all([
      categoriesApi.list(storeId),
      brandsApi.list(storeId),
      tagsApi.list(storeId),
    ]).then(([cats, brs, tgs]) => {
      if (myLoadId !== loadIdRef.current) return; // stale, drop
      setCategories(cats as Array<{ id: number; name: string }>);
      setBrands(brs as Array<{ id: number; name: string }>);
      setTags(tgs as Array<{ id: number; name: string }>);
    }).catch(() => {
      if (myLoadId !== loadIdRef.current) return;
      toast.error(t('common.error', 'فشل تحميل البيانات'));
    });
    productsApi.list(storeId, {
      page, limit,
      status: statusFilter || undefined,
      categoryId: categoryFilter ? Number(categoryFilter) : undefined,
      brandId: brandFilter ? Number(brandFilter) : undefined,
      tagId: tagFilter ? Number(tagFilter) : undefined,
      search: search || undefined,
      stockFilter: stockFilter || undefined,
      typeFilter: typeFilter || undefined,
    })
      .then((raw) => {
        if (myLoadId !== loadIdRef.current) return; // stale
        const res = raw as { data: ProductRowData[]; total?: number; totalPages?: number };
        setProducts(res.data);
        setTotal(res.total ?? 0);
        setTotalPages(res.totalPages ?? 1);
      })
      .catch(() => {
        if (myLoadId !== loadIdRef.current) return;
        setFetchError(true);
        toast.error(t('common.error'));
      })
      .finally(() => {
        if (myLoadId !== loadIdRef.current) return;
        setLoading(false);
      });
  }, [storeId, page, statusFilter, categoryFilter, brandFilter, tagFilter, search, stockFilter, typeFilter, t]);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  useEffect(() => {
    localStorage.setItem('products_view_mode', viewMode);
  }, [viewMode]);

  useEffect(() => {
    setSelectedIds(new Set());
  }, [page, statusFilter, categoryFilter, brandFilter, tagFilter, search, stockFilter, typeFilter]);

  // Debounce search: wait 300ms after typing before sending to API
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleNameChange = (name: string) => {
    updateField('name', name);
    if (!slugManuallyEdited && !editId) {
      updateField('slug', generateSlug(name));
    }
  };

  const handleSlugChange = (slug: string) => {
    setSlugManuallyEdited(true);
    updateField('slug', slug);
  };

  const openCreate = () => {
    setEditId(null);
    setProductImages([]);
    clearQueuedImages();
    setForm(emptyForm);
    setSlugManuallyEdited(false);
    setErrors([]);
    setTouched(false);
    setImageError(null);
    setDialogOpen(true);
  };

  const openEdit = async (id: number) => {
    setEditId(id);
    setSlugManuallyEdited(true);
    setErrors([]);
    setTouched(false);
    setImageError(null);
    try {
      const p = await productsApi.getById(storeId!, id) as {
        images?: Array<{ id: number; url: string }>;
        categories?: Array<{ categoryId: number }>;
        tags?: Array<{ tagId: number }>;
        options?: Array<{ name: string; values: Array<{ value: string }> }>;
        variants?: Array<{ name: string; sku?: string; price?: string; stockQuantity?: number; isActive?: boolean; options?: Record<string, string> }>;
        name?: string; slug?: string; description?: string; status?: string; type?: string;
        price?: string; compareAtPrice?: string; cost?: string;
        sku?: string; barcode?: string; stockQuantity?: number; trackInventory?: boolean;
        weightGrams?: string; lengthCm?: string; widthCm?: string; heightCm?: string;
        requiresShipping?: boolean; isFragile?: boolean;
        giftWrapAvailable?: boolean; giftWrapPriceOverride?: string;
        haaMarketplaceEnabled?: boolean; haaMarketplaceCommissionRate?: string;
        salesCount?: number; seoTitle?: string; seoDescription?: string;
        brand?: { id: number };
      };
      setProductImages(p.images ?? []);
      const catIds = (p.categories ?? []).map((c) => c.categoryId);
      const tagIds = (p.tags ?? []).map((t) => t.tagId);
      const hasVar = !!(p.options?.length);
      const opts: ProductOption[] = hasVar
        ? (p.options ?? []).map((o) => ({ name: o.name, values: (o.values ?? []).map((v) => v.value) }))
        : [];
      const vars: ProductVariant[] = hasVar
        ? (p.variants ?? []).map((v) => ({
            name: v.name,
            sku: v.sku ?? '',
            price: v.price ?? '',
            stockQuantity: v.stockQuantity ?? 0,
            isActive: v.isActive ?? true,
            options: v.options ?? {},
          }))
        : [];
      setForm({
        name: p.name ?? '', slug: p.slug ?? '', description: p.description ?? '', status: p.status ?? 'draft', type: p.type ?? 'physical',
        price: p.price ?? '', compareAtPrice: p.compareAtPrice ?? '', cost: p.cost ?? '', sku: p.sku ?? '', barcode: p.barcode ?? '',
        stockQuantity: p.stockQuantity ?? 0, trackInventory: p.trackInventory ?? true, weightGrams: p.weightGrams ?? '',
        lengthCm: p.lengthCm ?? '', widthCm: p.widthCm ?? '', heightCm: p.heightCm ?? '',
        requiresShipping: p.requiresShipping ?? true, isFragile: p.isFragile ?? false,
        giftWrapAvailable: p.giftWrapAvailable ?? false, giftWrapPriceOverride: p.giftWrapPriceOverride ?? '',
        haaMarketplaceEnabled: p.haaMarketplaceEnabled ?? false,
        haaMarketplaceCommissionRate: p.haaMarketplaceCommissionRate ?? '0.05',
        salesCount: p.salesCount ?? 0, seoTitle: p.seoTitle ?? '', seoDescription: p.seoDescription ?? '', categoryIds: catIds,
        brandId: p.brand?.id ?? undefined, tagIds,
        hasVariants: hasVar, options: opts, variants: vars,
      });
      setDialogOpen(true);
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); }
  };

  const save = async () => {
    if (!storeId) return;
    setTouched(true);
    const validationErrors = validateProduct(form);
    setErrors(validationErrors);
    if (validationErrors.length > 0) {
      toast.error(t('products.fixErrors'));
      return;
    }

    setSaving(true);
    try {
      const data: Record<string, unknown> = {
        ...form,
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : undefined,
        cost: form.cost ? Number(form.cost) : undefined,
        stockQuantity: Number(form.stockQuantity),
        weightGrams: form.weightGrams ? Number(form.weightGrams) : undefined,
        lengthCm: form.lengthCm ? Number(form.lengthCm) : undefined,
        widthCm: form.widthCm ? Number(form.widthCm) : undefined,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        giftWrapPriceOverride: form.giftWrapPriceOverride ? Number(form.giftWrapPriceOverride) : undefined,
        haaMarketplaceCommissionRate: form.haaMarketplaceCommissionRate ? Number(form.haaMarketplaceCommissionRate) : 0.05,
        salesCount: Number(form.salesCount),
        categoryIds: form.categoryIds.length > 0 ? form.categoryIds : undefined,
        brandId: form.brandId,
        tagIds: form.tagIds?.length ? form.tagIds : undefined,
      };
      if (editId) {
        data.options = form.options?.length ? form.options.map(o => ({ name: o.name, values: o.values })) : [];
        data.variants = form.variants?.length ? form.variants.map(v => ({
          name: v.name,
          sku: v.sku || undefined,
          price: v.price ? Number(v.price) : undefined,
          stockQuantity: v.stockQuantity,
          isActive: v.isActive,
          options: v.options,
        })) : [];
      } else if (form.hasVariants) {
        data.options = form.options?.length ? form.options.map(o => ({ name: o.name, values: o.values })) : [];
        data.variants = form.variants?.length ? form.variants.map(v => ({
          name: v.name,
          sku: v.sku || undefined,
          price: v.price ? Number(v.price) : undefined,
          stockQuantity: v.stockQuantity,
          isActive: v.isActive,
          options: v.options,
        })) : [];
      }
      if (editId) {
        await productsApi.update(storeId, editId, data);
        toast.success(t('products.updated'));
      } else {
        const created = await productsApi.create(storeId, data) as { id: number };

        if (queuedImages.length > 0 && created?.id) {
          let successCount = 0;
          let failCount = 0;
          for (const img of queuedImages) {
            try {
              const file = img.file;
              const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
              if (!allowedTypes.includes(file.type)) { failCount++; continue; }
              if (file.size > 5 * 1024 * 1024) { failCount++; continue; }
              await productsApi.uploadImage(storeId, created.id, file);
              successCount++;
            } catch {
              failCount++;
            }
          }
          if (failCount === 0 && successCount > 0) {
            toast.success(`تم رفع ${successCount} ${successCount === 1 ? 'صورة' : 'صور'} بنجاح`);
          } else if (failCount > 0) {
            toast.warning(
              successCount > 0
                ? `تم إنشاء المنتج ورفع ${successCount} صور، لكن فشل رفع ${failCount}. يمكنك المحاولة من التعديل`
                : 'تم إنشاء المنتج، لكن فشل رفع جميع الصور. يمكنك المحاولة من التعديل'
            );
          }
          clearQueuedImages();
        } else {
          toast.success(t('products.created'));
        }

        // Post-create flow: refresh the list, close the dialog. The
        // previous code closed the dialog and immediately re-opened
        // it via `openEdit(created.id)` — causing a visible flicker
        // and wiping the form state mid-transition. The merchant can
        // open the new product from the refreshed list. Audit P0 #26
        // (2026-06-25).
        loadProducts();
        setDialogOpen(false);
        return;
      }
      setDialogOpen(false);
      loadProducts();
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.message.includes('slug') || err.code === 'CONFLICT') {
          toast.error(t('products.duplicateSlug'));
        } else if (err.message.includes('sku') || err.message.includes('SKU')) {
          toast.error(t('products.duplicateSku'));
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error(t('products.error'));
      }
    } finally { setSaving(false); }
  };

  const archive = async (id: number) => {
    if (!storeId) return;
    if (!window.confirm(t('products.archiveConfirm', 'هل أنت متأكد من أرشفة هذا المنتج؟ لن يظهر في المتجر.'))) return;
    try {
      await productsApi.archive(storeId, id);
      toast.success(t('products.archivedMsg'));
      loadProducts();
    } catch (err) { toast.error(err instanceof ApiClientError ? err.message : t('common.error')); }
  };

  const handleSelect = (id: number, checked: boolean) => {
    const next = new Set(selectedIds);
    if (checked) next.add(id); else next.delete(id);
    setSelectedIds(next);
  };

  const handleSelectAll = (all: boolean) => {
    setSelectedIds(all ? new Set(products.map(p => p.id)) : new Set());
  };

  const handleBulkActivate = async () => {
    if (!storeId) return;
    setBulkProcessing(true);
    try {
      const res = await productsApi.bulk(storeId, { productIds: Array.from(selectedIds), action: 'activate' });
      if (res.failed === 0) {
        toast.success(`تم تفعيل ${res.succeeded} ${res.succeeded === 1 ? 'منتج' : 'منتجات'}`);
      } else {
        toast.warning(`تم تفعيل ${res.succeeded} من ${res.total} منتج. ${res.failed} منتج لم يتم تفعيله`);
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'فشل التفعيل الجماعي');
    }
    setBulkProcessing(false);
    setSelectedIds(new Set());
    loadProducts();
  };

  const handleBulkDeactivate = async () => {
    if (!storeId) return;
    setBulkProcessing(true);
    try {
      const res = await productsApi.bulk(storeId, { productIds: Array.from(selectedIds), action: 'deactivate' });
      if (res.failed === 0) {
        toast.success(`تم تعطيل ${res.succeeded} ${res.succeeded === 1 ? 'منتج' : 'منتجات'}`);
      } else {
        toast.warning(`تم تعطيل ${res.succeeded} من ${res.total} منتج. ${res.failed} منتج لم يتم تعطيله`);
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : 'فشل التعطيل الجماعي');
    }
    setBulkProcessing(false);
    setSelectedIds(new Set());
    loadProducts();
  };

  const handleBulkExportCsv = () => {
    const blob = buildProductsCsv(products, selectedIds);
    downloadBlob(blob, `products-${Date.now()}.csv`);
  };

  const handlePublish = (product: ProductRowData) => {
    setPublishProductData(product as { id: number; name: string; status?: string; marketplaceChannels?: Record<string, { status: string; productId?: string }> });
    const existing = Object.keys(product.marketplaceChannels || {}).filter(
      (ch: string) => product.marketplaceChannels?.[ch]?.status === 'active'
    );
    setSelectedChannels(existing);
    setPublishDialog({ productId: product.id, open: true });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !storeId) return;

    setImageError(null);
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024;

    for (const file of Array.from(files)) {
      if (!allowedTypes.includes(file.type)) {
        setImageError(t('products.imageTypeNotAllowed'));
        continue;
      }
      if (file.size > maxSize) {
        setImageError(t('products.imageTooLarge'));
        continue;
      }

      if (editId) {
        setUploadingImage(true);
        try {
          const uploaded = await productsApi.uploadImage(storeId, editId, file) as { id: number; url: string };
          setProductImages((prev) => [...prev, uploaded]);
        } catch (err) {
          setImageError(err instanceof ApiClientError ? err.message : t('common.error'));
        } finally {
          setUploadingImage(false);
        }
      } else {
        const preview = URL.createObjectURL(file);
        setQueuedImages((prev) => [...prev, { file, preview }]);
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearQueuedImages = useCallback(() => {
    setQueuedImages((prev) => {
      for (const img of prev) URL.revokeObjectURL(img.preview);
      return [];
    });
  }, []);

  const handleRemoveQueuedImage = (index: number) => {
    const img = queuedImages[index];
    if (img) URL.revokeObjectURL(img.preview);
    setQueuedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!storeId || !editId) return;
    try {
      await productsApi.deleteImage(storeId, editId, imageId);
      setProductImages((prev) => prev.filter((img) => img.id !== imageId));
      toast.success(t('products.imageDeleted'));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('common.error'));
    }
  };

  const getError = (field: string) => {
    if (!touched) return undefined;
    return errors.find(e => e.field === field)?.message;
  };

  const warnings = getWarnings(form);
  const hasActiveProductFilters = Boolean(
    search || statusFilter || categoryFilter || brandFilter || tagFilter || stockFilter || typeFilter
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('products.title')}</h1>
        <PermissionGate permission="products:create" fallback={null}><Button onClick={openCreate} className="h-9 text-sm px-4">
          <Plus className="h-4 w-4 me-2" />
          {t('products.create')}
        </Button></PermissionGate>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute search-icon top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" style={{ insetInlineEnd: '0.75rem' }} />
            <Input placeholder={t('products.search')} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="h-9 text-sm" style={{ paddingInlineEnd: '2.5rem' }} />
          </div>
          <Select value={statusFilter || undefined} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-32 h-9 text-sm"><SelectValue placeholder={t('products.filterStatus')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('products.all')}</SelectItem>
              <SelectItem value="active">{t('products.active')}</SelectItem>
              <SelectItem value="draft">{t('products.draft')}</SelectItem>
              <SelectItem value="archived">{t('products.archived')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={stockFilter || undefined} onValueChange={(v) => { setStockFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-32 h-9 text-sm"><SelectValue placeholder="المخزون" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="in_stock">متوفر</SelectItem>
              <SelectItem value="low_stock">مخزون منخفض</SelectItem>
              <SelectItem value="out_of_stock">نفذ</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter || undefined} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-32 h-9 text-sm"><SelectValue placeholder="النوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="simple">بسيط</SelectItem>
              <SelectItem value="variants">متغيرات</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter || undefined} onValueChange={(v) => { setCategoryFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-36 h-9 text-sm"><SelectValue placeholder={t('products.filterCategory')} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('products.all')}</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={brandFilter || undefined} onValueChange={(v) => { setBrandFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-32 h-9 text-sm"><SelectValue placeholder="الماركة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tagFilter || undefined} onValueChange={(v) => { setTagFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-32 h-9 text-sm"><SelectValue placeholder="التاج" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {tags.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 mr-auto border border-neutral-200 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
              title={t('products.tableView', 'عرض جدول')}
              aria-label={t('products.tableView', 'عرض جدول')}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-neutral-100 text-neutral-900' : 'text-neutral-400 hover:text-neutral-600'}`}
              title={t('products.gridView', 'عرض شبكي')}
              aria-label={t('products.gridView', 'عرض شبكي')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-3">
            {viewMode === 'table' ? (
              [1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {[1,2,3,4,5,6,7,8,9,10].map(i => (
                  <Skeleton key={i} className="aspect-square w-full rounded-2xl" />
                ))}
              </div>
            )}
          </div>
        ) : fetchError ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-red-50 mb-4">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-sm text-neutral-500 mb-3">{t('products.loadError')}</p>
            <Button variant="outline" size="sm" className="h-8 text-sm" onClick={loadProducts}>{t('common.retry')}</Button>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title={
              hasActiveProductFilters
                ? t('products.noMatchTitle', 'لا توجد نتائج مطابقة')
                : t('products.noProductsTitle', 'لا توجد منتجات بعد')
            }
            description={
              hasActiveProductFilters
                ? t('products.noMatch', 'لم نجد منتجات تطابق الفلاتر. جرّب مسح الفلاتر أو تعديل البحث.')
                : t('products.noProductsDesc', 'أضف منتجك الأول وابدأ البيع. يمكنك الاستيراد لاحقاً من Excel أو CSV.')
            }
            action={
              !hasActiveProductFilters && (
                <PermissionGate permission="products:create" fallback={null}>
                  <Button className="h-11 px-5 text-sm" onClick={openCreate}>
                    <Plus className="h-4 w-4 me-2" />
                    {t('products.createFirst', 'إضافة أول منتج')}
                  </Button>
                </PermissionGate>
              )
            }
          />
        ) : (<>
          <ProductBulkActionsBar
            selectedCount={selectedIds.size}
            onClear={() => setSelectedIds(new Set())}
            onActivate={handleBulkActivate}
            onDeactivate={handleBulkDeactivate}
            onExportCsv={handleBulkExportCsv}
            busy={bulkProcessing}
          />
          {viewMode === 'table' ? (
            <div className="overflow-x-auto">
              <ProductListTable
                products={products}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onSelectAll={handleSelectAll}
                onEdit={openEdit}
                onArchive={archive}
                onPublish={handlePublish}
                page={page}
                totalPages={totalPages}
                total={total}
                onPageChange={setPage}
                storeSlug={storeSlug}
                t={t}
                STOREFRONT_BASE={STOREFRONT_BASE}
              />
            </div>
          ) : (
            <>
              <ProductGrid
                products={products}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onEdit={openEdit}
                onArchive={archive}
                onPublish={handlePublish}
                storeSlug={storeSlug}
                t={t}
                STOREFRONT_BASE={STOREFRONT_BASE}
              />
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 pb-4 px-6 border-t border-neutral-100">
                  <p className="text-sm text-neutral-500">{t('products.showing', 'عرض')} {products.length} {t('products.of', 'من')} {total} {t('products.products', 'منتج')}</p>
                  <div className="flex items-center gap-2">
                    {/* Pagination icon-only buttons — hit area ≥ 44x44 (WCAG 2.5.5). */}
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      aria-label={t('products.prevPage', 'الصفحة السابقة')}
                      className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-medium text-neutral-700">{page} / {totalPages}</span>
                    <button
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      aria-label={t('products.nextPage', 'الصفحة التالية')}
                      className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-neutral-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-400"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </>)}
      </div>

      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={(open) => { if (!saving) { setDialogOpen(open); if (!open && !editId) clearQueuedImages(); } }}
        editId={editId}
        saving={saving}
        form={form}
        warnings={warnings}
        getError={getError}
        onSave={save}
        onFieldChange={updateField}
        onNameChange={handleNameChange}
        onSlugChange={handleSlugChange}
        productImages={productImages}
        queuedImages={queuedImages}
        uploadingImage={uploadingImage}
        imageError={imageError}
        fileInputRef={fileInputRef}
        onImageUpload={handleImageUpload}
        onDeleteImage={handleDeleteImage}
        onRemoveQueuedImage={handleRemoveQueuedImage}
        categories={categories}
        brands={brands}
        tags={tags}
        t={t}
      />

      {/* Publish to Marketplace Dialog */}
      <Dialog open={publishDialog.open} onOpenChange={(open) => { setPublishDialog(prev => ({ ...prev, open })); if (!open) setPublishProductData(null); }}>
        <DialogContent className="max-w-md bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">{t('products.publishTitle', 'نشر المنتج في السوق')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">اختر القنوات التي تريد نشر <strong>{publishProductData?.name}</strong> فيها</p>
            <div className="space-y-2">
              {/* Store channel — always available */}
              <label className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                selectedChannels.includes('store') ? 'border-primary-300 bg-primary-50/50' : 'border-neutral-200 hover:border-neutral-300 bg-white'
              }`}>
                <input type="checkbox" checked={selectedChannels.includes('store')}
                  onChange={() => setSelectedChannels(prev =>
                    prev.includes('store') ? prev.filter(c => c !== 'store') : [...prev, 'store']
                  )}
                  className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-neutral-600 to-neutral-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                  <Store className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900">المتجر</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {publishProductData?.status === 'active' ? (
                      <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">منشور</span>
                    ) : (
                      <span className="text-xs text-neutral-400">غير منشور</span>
                    )}
                  </div>
                </div>
              </label>

              {/* Marketplaces */}
              {PROVIDERS.map(p => {
                const ch = publishProductData?.marketplaceChannels?.[p.code];
                const isPublished = ch?.status === 'active';
                const isSelected = selectedChannels.includes(p.code);
                return (
                  <label key={p.code} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all cursor-pointer ${
                    isSelected ? 'border-primary-300 bg-primary-50/50' : 'border-neutral-200 hover:border-neutral-300 bg-white'
                  }`}>
                    <input type="checkbox" checked={isSelected}
                      onChange={() => setSelectedChannels(prev =>
                        prev.includes(p.code) ? prev.filter(c => c !== p.code) : [...prev, p.code]
                      )}
                      className="h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500" />
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${p.color} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                      <Store className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-neutral-900">{p.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isPublished ? (
                          <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">منشور</span>
                        ) : (
                          <span className="text-xs text-neutral-400">غير منشور</span>
                        )}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-3 pt-3 border-t border-neutral-100">
              <Button variant="outline" size="sm" className="rounded-full border-neutral-200"
                onClick={() => { setPublishDialog(prev => ({ ...prev, open: false })); setPublishProductData(null); }}>
                إلغاء
              </Button>
              <Button size="sm" className="rounded-full bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/25"
                disabled={publishing || !storeId || selectedChannels.length === 0}
                onClick={async () => {
                  if (!storeId || selectedChannels.length === 0) return;
                  setPublishing(true);
                  let successCount = 0;
                  let failCount = 0;
                  for (const ch of selectedChannels) {
                    if (ch === 'store') {
                      try {
                        await productsApi.update(storeId, publishDialog.productId, { status: 'active' });
                        successCount++;
                      } catch { failCount++; }
                      continue;
                    }
                    try {
                      await marketplaceApi.publishProduct(storeId, ch, { productId: publishDialog.productId });
                      successCount++;
                    } catch { failCount++; }
                  }
                  if (successCount > 0) toast.success(`تم النشر في ${successCount} ${successCount === 1 ? 'قناة' : 'قنوات'}`);
                  if (failCount > 0) toast.error(`فشل النشر في ${failCount} ${failCount === 1 ? 'قناة' : 'قنوات'}`);
                  setPublishing(false);
                  setPublishDialog(prev => ({ ...prev, open: false }));
                  setPublishProductData(null);
                  loadProducts();
                }}>
                {publishing ? <Loader2 className="h-4 w-4 ms-1 animate-spin" /> : <Globe className="h-4 w-4 ms-1" />}
                {publishing ? 'جاري النشر...' : selectedChannels.length === 0 ? 'نشر' : `نشر في ${selectedChannels.length} ${selectedChannels.length === 1 ? 'قناة' : 'قنوات'}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

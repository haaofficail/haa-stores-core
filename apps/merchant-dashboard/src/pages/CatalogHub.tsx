// Catalog Hub — overview landing page for /catalog (IA W2).
//
// Final hub of Wave 2. Composes existing catalog endpoints into a
// single "what's the state of my product list?" view.

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Package, Tags, Building2, Tag, FileSpreadsheet, Download } from 'lucide-react';
import { productsApi, categoriesApi, brandsApi, tagsApi } from '@/lib/api';
import { HubHeader, MetricGrid, MetricTile, HubCard } from '@/components/hub/HubShell';

interface CatalogCounts {
  totalProducts: number | null;
  categories: number | null;
  brands: number | null;
  tags: number | null;
}

export default function CatalogHub() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<CatalogCounts>({
    totalProducts: null,
    categories: null,
    brands: null,
    tags: null,
  });

  const load = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    Promise.allSettled([
      productsApi.list(storeId, { page: 1, limit: 1 }),
      categoriesApi.list(storeId),
      brandsApi.list(storeId),
      tagsApi.list(storeId),
    ]).then(([products, cats, brs, tgs]) => {
      setCounts({
        totalProducts:
          products.status === 'fulfilled'
            ? (products.value as { total?: number })?.total ?? 0
            : null,
        categories:
          cats.status === 'fulfilled' && Array.isArray(cats.value)
            ? (cats.value as unknown[]).length
            : null,
        brands:
          brs.status === 'fulfilled' && Array.isArray(brs.value)
            ? (brs.value as unknown[]).length
            : null,
        tags:
          tgs.status === 'fulfilled' && Array.isArray(tgs.value)
            ? (tgs.value as unknown[]).length
            : null,
      });
    }).finally(() => setLoading(false));
  }, [storeId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-fade-in">
      <HubHeader
        tagIcon={<Package className="h-5 w-5 text-primary-500" />}
        tagLabel={t('catalog.hub.tagline', 'مركز الكتالوج')}
        title={t('catalog.hub.title', 'كل ما يخص منتجات متجرك')}
        description={t(
          'catalog.hub.description',
          'المنتجات، التصنيفات، الماركات، والوسوم — نظرة موحّدة على بنية المتجر. ابدأ من هنا لإدارة الكتالوج كاملاً.',
        )}
      />

      <MetricGrid loading={loading}>
        <MetricTile
          label={t('catalog.hub.kpi.totalProducts', 'إجمالي المنتجات')}
          value={counts.totalProducts}
        />
        <MetricTile
          label={t('catalog.hub.kpi.categories', 'التصنيفات')}
          value={counts.categories}
        />
        <MetricTile
          label={t('catalog.hub.kpi.brands', 'الماركات')}
          value={counts.brands}
        />
        <MetricTile
          label={t('catalog.hub.kpi.tags', 'الوسوم')}
          value={counts.tags}
        />
      </MetricGrid>

      <div>
        <h2 className="text-lg font-bold text-neutral-900 mb-4">
          {t('catalog.hub.tools.heading', 'أدوات الكتالوج')}
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <HubCard
            icon={Package}
            iconClass="bg-primary-50 text-primary-600"
            title={t('catalog.hub.tools.products.title', 'إدارة المنتجات')}
            description={t(
              'catalog.hub.tools.products.description',
              'كل منتج في متجرك — إضافة، تعديل، أرشفة، نشر على القنوات، وإدارة الصور والمتغيرات.',
            )}
            to="/products"
            cta={t('catalog.hub.tools.products.cta', 'فتح المنتجات')}
          />
          <HubCard
            icon={Tags}
            iconClass="bg-emerald-50 text-emerald-600"
            title={t('catalog.hub.tools.categories.title', 'التصنيفات')}
            description={t(
              'catalog.hub.tools.categories.description',
              'بنية تصنيفات شجرية — رتّب منتجاتك بحيث يجدها العميل بنقرتين.',
            )}
            to="/categories"
            cta={t('catalog.hub.tools.categories.cta', 'فتح التصنيفات')}
          />
          <HubCard
            icon={Building2}
            iconClass="bg-amber-50 text-amber-600"
            title={t('catalog.hub.tools.brands.title', 'الماركات')}
            description={t(
              'catalog.hub.tools.brands.description',
              'العلامات التجارية في متجرك مع شعاراتها. اربط كل منتج بماركته للبحث والتصفية.',
            )}
            to="/brands"
            cta={t('catalog.hub.tools.brands.cta', 'فتح الماركات')}
          />
          <HubCard
            icon={Tag}
            iconClass="bg-rose-50 text-rose-600"
            title={t('catalog.hub.tools.tags.title', 'الوسوم')}
            description={t(
              'catalog.hub.tools.tags.description',
              'وسوم بحث ملوّنة — تساعد عميلك على إيجاد ما يبحث عنه دون الحاجة لشجرة تصنيفات.',
            )}
            to="/tags"
            cta={t('catalog.hub.tools.tags.cta', 'فتح الوسوم')}
          />
          <HubCard
            icon={FileSpreadsheet}
            iconClass="bg-cyan-50 text-cyan-600"
            title={t('catalog.hub.tools.imports.title', 'استيراد المنتجات')}
            description={t(
              'catalog.hub.tools.imports.description',
              'ارفع كتالوجك من ملف CSV — لإطلاق متجر بسرعة أو نقله من منصة أخرى.',
            )}
            to="/imports"
            cta={t('catalog.hub.tools.imports.cta', 'استيراد')}
          />
          <HubCard
            icon={Download}
            iconClass="bg-purple-50 text-purple-600"
            title={t('catalog.hub.tools.exports.title', 'تصدير المنتجات')}
            description={t(
              'catalog.hub.tools.exports.description',
              'نزّل كل منتجاتك كملف CSV — للنسخ الاحتياطي أو التحرير في Excel.',
            )}
            to="/exports"
            cta={t('catalog.hub.tools.exports.cta', 'تصدير')}
          />
        </div>
      </div>
    </div>
  );
}

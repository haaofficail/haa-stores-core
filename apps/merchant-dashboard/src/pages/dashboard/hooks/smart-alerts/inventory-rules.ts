/**
 * inventory-rules — stock + product-catalog signals.
 */
import {
  AlertTriangle,
  Layers,
  List,
  Package,
  ShoppingCart,
  Tag,
} from 'lucide-react';
import type { RuleContext, SmartAlert } from './types.js';

export function inventoryRules(ctx: RuleContext): SmartAlert[] {
  const {
    lowStock,
    outOfStock,
    hasProducts,
    hasOrders,
    brands,
    cats,
    tags,
    t,
    navigate,
  } = ctx;
  const out: SmartAlert[] = [];

  if (lowStock.length > 0)
    out.push({
      id: 'low-stock',
      type: 'danger',
      priority: 1,
      icon: AlertTriangle,
      title: t('dashboard.alertLowStock', 'مخزون منخفض'),
      description: t(
        'dashboard.alertLowStockDesc',
        '{{count}} منتجات تحتاج إعادة تزويد',
      ).replace('{{count}}', String(lowStock.length)),
      action: {
        label: t('common.viewDetails', 'عرض التفاصيل'),
        onClick: () => navigate('/products'),
      },
    });

  if (outOfStock.length > 0)
    out.push({
      id: 'out-of-stock',
      type: 'danger',
      priority: 1,
      icon: AlertTriangle,
      title: t('dashboard.alertOutOfStock', 'نفذ من المخزون'),
      description: t(
        'dashboard.alertOutOfStockDesc',
        '{{count}} منتجات نفذت بالكامل',
      ).replace('{{count}}', String(outOfStock.length)),
      action: {
        label: t('common.viewDetails', 'عرض التفاصيل'),
        onClick: () => navigate('/products'),
      },
    });

  if (!hasProducts)
    out.push({
      id: 'no-products',
      type: 'warning',
      priority: 2,
      icon: ShoppingCart,
      title: t('dashboard.alertNoProducts', 'لا توجد منتجات نشطة'),
      description: t(
        'dashboard.alertNoProductsDesc',
        'أضف منتجاتك الأولى لبدء البيع',
      ),
      action: {
        label: t('dashboard.quickActions.addProduct', 'إضافة منتج'),
        onClick: () => navigate('/products?create=true'),
      },
    });

  if (hasProducts && brands.length === 0)
    out.push({
      id: 'no-brands',
      type: 'info',
      priority: 4,
      icon: Tag,
      title: t('dashboard.alertNoBrands', 'لم تُضف ماركات'),
      description: t(
        'dashboard.alertNoBrandsDesc',
        'الماركات تساعد العملاء في تصفّح منتجاتك',
      ),
      action: {
        label: t('common.setup', 'الإضافة'),
        onClick: () => navigate('/brands'),
      },
    });

  if (hasProducts && cats.length === 0)
    out.push({
      id: 'no-categories',
      type: 'info',
      priority: 4,
      icon: Layers,
      title: t('dashboard.alertNoCategories', 'لم تُضف تصنيفات'),
      description: t(
        'dashboard.alertNoCategoriesDesc',
        'التصنيفات تنظم متجرك وتساعد في البحث',
      ),
      action: {
        label: t('common.setup', 'الإضافة'),
        onClick: () => navigate('/categories'),
      },
    });

  if (hasProducts && tags.length === 0)
    out.push({
      id: 'no-tags',
      type: 'info',
      priority: 4,
      icon: List,
      title: t('dashboard.alertNoTags', 'لم تُضف تاجات'),
      description: t(
        'dashboard.alertNoTagsDesc',
        'التاجات تحسن ظهور منتجاتك في نتائج البحث',
      ),
      action: {
        label: t('common.setup', 'الإضافة'),
        onClick: () => navigate('/tags'),
      },
    });

  if (hasOrders && !hasProducts)
    out.push({
      id: 'no-stock-missing',
      type: 'warning',
      priority: 3,
      icon: Package,
      title: t('dashboard.alertNoStockMissing', 'منتجات غير متاحة'),
      description: t(
        'dashboard.alertNoStockMissingDesc',
        'لديك طلبات ولكن لا توجد منتجات نشطة',
      ),
    });

  if (lowStock.length >= 3)
    out.push({
      id: 'bulk-stock',
      type: 'warning',
      priority: 3,
      icon: Package,
      title: t('dashboard.alertBulkStock', 'جردة مخزون'),
      description: t(
        'dashboard.alertBulkStockDesc',
        '{{count}} منتجات تحتاج جردة شاملة',
      ).replace('{{count}}', String(lowStock.length)),
      action: {
        label: t('common.manage', 'إدارة'),
        onClick: () => navigate('/products'),
      },
    });

  if (hasProducts && cats.length > 0) {
    const catWithMost = cats.reduce((a: any, b: any) =>
      (a.productCount ?? 0) > (b.productCount ?? 0) ? a : b,
    );
    if (catWithMost && (catWithMost.productCount ?? 0) >= 5)
      out.push({
        id: 'top-category',
        type: 'info',
        priority: 5,
        icon: Layers,
        title: t('dashboard.alertTopCategory', 'التصنيف الأكبر'),
        description: t(
          'dashboard.alertTopCategoryDesc',
          '{{name}} - {{count}} منتجات',
        )
          .replace('{{name}}', catWithMost.name)
          .replace('{{count}}', String(catWithMost.productCount)),
      });
  }

  return out;
}

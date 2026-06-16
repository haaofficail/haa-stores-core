import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Minus, Package, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { StoreButton, StoreContainer, StoreEmptyState, StoreIconButton } from '@/components/ui';
import { Icon } from '@/components/ui/icon';
import { SarIcon } from '@/components/ui/SarIcon';
import { marketplaceCart, type MarketplaceCartItem } from '@/lib/marketplace-cart';
import { useSEO } from '@/hooks/useSEO';

export default function MarketplaceCart() {
  const [items, setItems] = useState<MarketplaceCartItem[]>(() => marketplaceCart.list());
  const subtotal = marketplaceCart.subtotal(items);

  useSEO({ title: 'سلة سوق هاء', noIndex: true });

  useEffect(() => {
    const refresh = () => setItems(marketplaceCart.list());
    window.addEventListener('haa-marketplace-cart-change', refresh);
    return () => window.removeEventListener('haa-marketplace-cart-change', refresh);
  }, []);

  const updateQty = (item: MarketplaceCartItem, quantity: number) => {
    setItems(marketplaceCart.update(item.product.id, item.product.store.slug, quantity));
  };

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-surface-2">
        <StoreContainer className="py-10">
          <StoreEmptyState
            icon={ShoppingBag}
            title="سلة سوق هاء فارغة"
            description="أضف منتجات من المتاجر المشاركة في السوق العام."
            action={<StoreButton href="/marketplace">العودة للسوق</StoreButton>}
          />
        </StoreContainer>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-2">
      <StoreContainer className="py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">سلة سوق هاء</h1>
            <p className="mt-1 text-sm text-text-secondary">طلب موحد، ويتم توزيعه تلقائياً على متاجر المنتجات.</p>
          </div>
          <StoreButton href="/marketplace" variant="outline">متابعة التسوق</StoreButton>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          <div className="space-y-3">
            {items.map((item) => (
              <article key={`${item.product.store.slug}-${item.product.id}`} className="rounded-[8px] border border-border bg-surface-1 p-3 shadow-card">
                <div className="flex gap-3">
                  <Link to={item.product.productUrl} className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[8px] bg-surface-2">
                    {item.product.images?.[0] ? (
                      <img src={item.product.images[0]} alt={item.product.name} className="h-full w-full object-contain p-2" loading="lazy" />
                    ) : (
                      <Icon icon={Package} size="md" className="text-text-disabled" />
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-primary-600">{item.product.store.name}</p>
                    <Link to={item.product.productUrl} className="mt-1 line-clamp-2 text-sm font-semibold text-text-primary hover:text-primary-600">
                      {item.product.name}
                    </Link>
                    <p className="mt-2 text-sm font-bold text-text-primary">
                      {Number(item.product.price).toFixed(2)} <SarIcon size="md" />
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-between gap-3">
                    <StoreIconButton aria-label="حذف" onClick={() => setItems(marketplaceCart.remove(item.product.id, item.product.store.slug))}>
                      <Icon icon={Trash2} size="xs" />
                    </StoreIconButton>
                    <div className="flex items-center gap-1 rounded-[8px] border border-border bg-surface-1 p-1">
                      <button className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-surface-2" onClick={() => updateQty(item, item.quantity - 1)} aria-label="إنقاص">
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                      <button className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-surface-2" onClick={() => updateQty(item, item.quantity + 1)} aria-label="زيادة">
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-[8px] border border-border bg-surface-1 p-4 shadow-card">
            <h2 className="text-base font-bold text-text-primary">ملخص السوق</h2>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-text-secondary">عدد المنتجات</span>
              <span className="font-semibold">{marketplaceCart.count(items)}</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-text-secondary">الإجمالي قبل الشحن</span>
              <span className="font-bold text-text-primary">{subtotal.toFixed(2)} <SarIcon size="md" /></span>
            </div>
            <StoreButton href="/marketplace/checkout" className="mt-5 w-full" iconStart={<Icon icon={ShoppingBag} size="xs" />}>
              إتمام الطلب الموحد
            </StoreButton>
          </aside>
        </div>
      </StoreContainer>
    </main>
  );
}

import type { HaaMarketplaceProduct } from './api';

export interface MarketplaceCartItem {
  product: HaaMarketplaceProduct;
  quantity: number;
}

const MARKETPLACE_CART_KEY = 'haa_marketplace_cart';

function readItems(): MarketplaceCartItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(MARKETPLACE_CART_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeItems(items: MarketplaceCartItem[]) {
  localStorage.setItem(MARKETPLACE_CART_KEY, JSON.stringify(items));
  window.dispatchEvent(new Event('haa-marketplace-cart-change'));
}

export const marketplaceCart = {
  list: readItems,
  add(product: HaaMarketplaceProduct, quantity = 1) {
    const items = readItems();
    const existing = items.find((item) => item.product.id === product.id && item.product.store.slug === product.store.slug);
    if (existing) existing.quantity += quantity;
    else items.push({ product, quantity });
    writeItems(items);
    return items;
  },
  update(productId: number, storeSlug: string, quantity: number) {
    const items = readItems()
      .map((item) => item.product.id === productId && item.product.store.slug === storeSlug ? { ...item, quantity } : item)
      .filter((item) => item.quantity > 0);
    writeItems(items);
    return items;
  },
  remove(productId: number, storeSlug: string) {
    const items = readItems().filter((item) => !(item.product.id === productId && item.product.store.slug === storeSlug));
    writeItems(items);
    return items;
  },
  clear() {
    writeItems([]);
  },
  subtotal(items = readItems()) {
    return items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  },
  count(items = readItems()) {
    return items.reduce((sum, item) => sum + item.quantity, 0);
  },
};

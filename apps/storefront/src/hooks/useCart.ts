import { useState, useEffect, useCallback } from 'react';
import { cartApi, type Cart } from '@/lib/api';
import { tracker } from '@/lib/tracker';

const CART_PREFIX = 'storefront_cart_';

function getCartKey(slug: string): string {
  return `${CART_PREFIX}${slug}`;
}

function loadCartId(slug: string): string | null {
  try {
    return localStorage.getItem(getCartKey(slug));
  } catch {
    return null;
  }
}

function saveCartId(slug: string, cartId: string | null) {
  try {
    if (cartId) {
      localStorage.setItem(getCartKey(slug), cartId);
    } else {
      localStorage.removeItem(getCartKey(slug));
    }
  } catch {}
}

function normalizeCart(cart: Cart): Cart {
  const items = Array.isArray(cart.items) ? cart.items : [];
  return {
    ...cart,
    items,
    subtotal: cart.subtotal ?? '0',
    itemCount: cart.itemCount ?? items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export function useCart(slug: string | undefined) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);

  const initCart = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const cartId = loadCartId(slug);
      if (cartId) {
        try {
          const existing = await cartApi.get(slug, cartId);
          setCart(normalizeCart(existing));
          setLoading(false);
          return;
        } catch {}
      }
      const newCart = await cartApi.create(slug);
      saveCartId(slug, newCart.id);
      setCart(normalizeCart(newCart));
    } catch {} finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    if (slug) initCart();
  }, [slug, initCart]);

  const refreshCart = useCallback(async () => {
    if (!slug || !cart?.id) return;
    try {
      const updated = await cartApi.get(slug, cart.id);
      setCart(normalizeCart(updated));
    } catch {}
  }, [slug, cart?.id]);

  const addItem = useCallback(async (productId: number, quantity: number = 1, notes?: string, giftData?: { giftWrapSelected?: boolean; sendAsGift?: boolean; giftMessage?: string }, variantId?: number, source?: 'storefront' | 'haa_marketplace') => {
    if (!slug || !cart?.id) return;
    const updated = await cartApi.addItem(slug, cart.id, productId, quantity, notes, giftData, variantId, source);
    const normalized = normalizeCart(updated);
    setCart(normalized);
    tracker.trackAddToCart(slug, productId, cart.id, { quantity, variantId, source });
    return normalized;
  }, [slug, cart?.id]);

  const updateItem = useCallback(async (itemId: number, quantity: number) => {
    if (!slug || !cart?.id) return;
    const updated = await cartApi.updateItem(slug, cart.id, itemId, quantity);
    const normalized = normalizeCart(updated);
    setCart(normalized);
    return normalized;
  }, [slug, cart?.id]);

  const removeItem = useCallback(async (itemId: number) => {
    if (!slug || !cart?.id) return;
    const updated = await cartApi.removeItem(slug, cart.id, itemId);
    const normalized = normalizeCart(updated);
    setCart(normalized);
    tracker.trackRemoveFromCart(slug, itemId, cart.id);
    return normalized;
  }, [slug, cart?.id]);

  const clearLocalCart = useCallback(() => {
    if (slug) saveCartId(slug, null);
    setCart(null);
  }, [slug]);

  return {
    cart,
    loading,
    itemCount: cart?.itemCount ?? 0,
    addItem,
    updateItem,
    removeItem,
    refreshCart,
    clearLocalCart,
    initCart,
  };
}

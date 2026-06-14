import { createContext, useContext, type ReactNode } from 'react';
import { useCart } from './useCart';
import type { Cart } from '@/lib/api';

interface CartContextValue {
  cart: Cart | null;
  loading: boolean;
  itemCount: number;
  addItem: (productId: number, quantity?: number, notes?: string, giftData?: { giftWrapSelected?: boolean; sendAsGift?: boolean; giftMessage?: string }, variantId?: number, source?: 'storefront' | 'haa_marketplace') => Promise<Cart | undefined>;
  updateItem: (itemId: number, quantity: number) => Promise<Cart | undefined>;
  removeItem: (itemId: number) => Promise<Cart | undefined>;
  refreshCart: () => Promise<void>;
  clearLocalCart: () => void;
  initCart: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ slug, children }: { slug: string | undefined; children: ReactNode }) {
  const cart = useCart(slug);
  return <CartContext.Provider value={cart}>{children}</CartContext.Provider>;
}

export function useSharedCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useSharedCart must be used within CartProvider');
  return ctx;
}

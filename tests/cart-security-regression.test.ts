import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cartServiceSource = readFileSync(new URL('../packages/commerce-core/src/cart.ts', import.meta.url), 'utf-8');
const storefrontRoutesSource = readFileSync(new URL('../apps/api/src/routes/storefront.ts', import.meta.url), 'utf-8');
const merchantCartRoutesSource = readFileSync(new URL('../apps/api/src/routes/cart.ts', import.meta.url), 'utf-8');

describe('Cart tenant and inventory regression', () => {
  it('scopes cart writes by cartId and storeId before add/update/remove/clear', () => {
    expect(cartServiceSource).toContain('eq(s.carts.id, cartId), eq(s.carts.storeId, storeId)');
    expect(cartServiceSource).toContain('updateItemQuantity(storeId: number, cartId: string, itemId: number, quantity: number)');
    expect(cartServiceSource).toContain('removeItem(storeId: number, cartId: string, itemId: number)');
    expect(cartServiceSource).toContain('clearCart(storeId: number, cartId: string)');
    expect(cartServiceSource).toContain('eq(s.cartItems.id, itemId), eq(s.cartItems.cartId, cartId)');
  });

  it('rejects quantity updates for inactive products or insufficient stock', () => {
    expect(cartServiceSource).toContain("if (row.product.status !== 'active') return false");
    expect(cartServiceSource).toContain('const availableStock = row.variant ? row.variant.stockQuantity : row.product.stockQuantity');
    expect(cartServiceSource).toContain('row.product.trackInventory && availableStock < quantity');
    expect(cartServiceSource).toContain('product.trackInventory && availableStock < newQty');
  });

  it('passes storeId into storefront and merchant cart mutation routes', () => {
    expect(storefrontRoutesSource).toContain('updateItemQuantity(store.id, cartId, itemId, body.quantity)');
    expect(storefrontRoutesSource).toContain('removeItem(store.id, cartId, itemId)');
    expect(merchantCartRoutesSource).toContain('updateItemQuantity(storeId, cartId, itemId, quantity)');
    expect(merchantCartRoutesSource).toContain('removeItem(storeId, cartId, itemId)');
    expect(merchantCartRoutesSource).toContain('clearCart(storeId, cartId)');
  });
});

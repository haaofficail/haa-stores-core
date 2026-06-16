import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const cartServiceSource = readFileSync(new URL('../packages/commerce-core/src/cart.ts', import.meta.url), 'utf-8');
const storefrontCartRoutesSource = readFileSync(new URL('../apps/api/src/routes/storefront/cart.ts', import.meta.url), 'utf-8');
const storefrontCheckoutRoutesSource = readFileSync(new URL('../apps/api/src/routes/storefront/checkout.ts', import.meta.url), 'utf-8');
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
    expect(storefrontCartRoutesSource).toContain('updateItemQuantity(store.id, cartId, itemId, body.quantity)');
    expect(storefrontCartRoutesSource).toContain('removeItem(store.id, cartId, itemId)');
    expect(merchantCartRoutesSource).toContain('updateItemQuantity(storeId, cartId, itemId, quantity)');
    expect(merchantCartRoutesSource).toContain('removeItem(storeId, cartId, itemId)');
    expect(merchantCartRoutesSource).toContain('clearCart(storeId, cartId)');
  });

  it('storefront cart PATCH and DELETE routes exist for items', () => {
    expect(storefrontCartRoutesSource).toMatch(/cartRouter\.(patch|put)\(\s*'\/:slug\/cart\/:cartId\/items\/:itemId'/);
    expect(storefrontCartRoutesSource).toMatch(/cartRouter\.delete\(\s*'\/:slug\/cart\/:cartId\/items\/:itemId'/);
  });

  it('storefront cart PATCH/DELETE resolve store from slug before mutation', () => {
    // The split cart route must still call resolveActiveStore(c) for the PATCH and DELETE
    // endpoints, to enforce that the cart belongs to an active, published store.
    const patchStart = storefrontCartRoutesSource.indexOf("cartRouter.patch('/:slug/cart/:cartId/items/:itemId'");
    const deleteStart = storefrontCartRoutesSource.indexOf("cartRouter.delete('/:slug/cart/:cartId/items/:itemId'");
    expect(patchStart).toBeGreaterThanOrEqual(0);
    expect(deleteStart).toBeGreaterThanOrEqual(0);

    // Find the next route declaration as the boundary for the handler block.
    const afterPatch = storefrontCartRoutesSource.slice(patchStart);
    const nextRoutePatch = afterPatch.search(/\n\w+\.(get|post|patch|put|delete)\(/);
    const patchBlock = nextRoutePatch > 0 ? afterPatch.slice(0, nextRoutePatch) : afterPatch;
    expect(patchBlock).toContain('resolveActiveStore(c)');

    const afterDelete = storefrontCartRoutesSource.slice(deleteStart);
    const nextRouteDelete = afterDelete.search(/\n\w+\.(get|post|patch|put|delete)\(/);
    const deleteBlock = nextRouteDelete > 0 ? afterDelete.slice(0, nextRouteDelete) : afterDelete;
    expect(deleteBlock).toContain('resolveActiveStore(c)');
  });
});

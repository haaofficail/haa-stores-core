import { eq, and, inArray, isNull } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';

export class CartService {
  constructor(private db: DbClient = createDbClient()) {}

  async getCart(storeId: number, cartId: string) {
    const [cart] = await this.db.select()
      .from(s.carts)
      .where(and(eq(s.carts.id, cartId), eq(s.carts.storeId, storeId)))
      .limit(1);
    if (!cart) return null;
    const items = await this.db.select({
      item: s.cartItems,
      product: s.products,
      variant: s.productVariants,
    }).from(s.cartItems)
      .innerJoin(s.products, eq(s.cartItems.productId, s.products.id))
      .leftJoin(s.productVariants, eq(s.cartItems.variantId, s.productVariants.id))
      .where(eq(s.cartItems.cartId, cartId));
    const productIds = items.map(i => i.product.id);
    const allImages = productIds.length > 0
      ? await this.db.select().from(s.productImages)
        .where(inArray(s.productImages.productId, productIds))
      : [];
    const imagesByProduct = new Map<number, typeof allImages>();
    for (const img of allImages) {
      const existing = imagesByProduct.get(img.productId) ?? [];
      existing.push(img);
      imagesByProduct.set(img.productId, existing);
    }
    const itemsWithImages = items.map(i => ({
      ...i,
      product: { ...i.product, images: imagesByProduct.get(i.product.id) ?? [] },
    }));
    const subtotal = itemsWithImages.reduce((sum, i) => sum + Number(i.item.totalPrice), 0);
    return { ...cart, items: itemsWithImages, subtotal };
  }

  async createCart(storeId: number, customerId?: number, sessionToken?: string) {
    const [cart] = await this.db.insert(s.carts).values({
      storeId,
      customerId: customerId ?? null,
      sessionToken: sessionToken ?? null,
    }).returning();
    return cart;
  }

  async addItem(storeId: number, cartId: string, productId: number, quantity: number, notes?: string, giftData?: { giftWrapSelected?: boolean; sendAsGift?: boolean; giftMessage?: string }, variantId?: number) {
    const [cart] = await this.db.select({ id: s.carts.id })
      .from(s.carts)
      .where(and(eq(s.carts.id, cartId), eq(s.carts.storeId, storeId)))
      .limit(1);
    if (!cart) return null;

    const [product] = await this.db.select()
      .from(s.products)
      .where(and(eq(s.products.id, productId), eq(s.products.storeId, storeId)))
      .limit(1);
    if (!product) return null;
    if (product.status !== 'active') return null;

    let variant: typeof s.productVariants.$inferSelect | null = null;
    if (variantId !== undefined) {
      const [selectedVariant] = await this.db.select()
        .from(s.productVariants)
        .where(and(
          eq(s.productVariants.id, variantId),
          eq(s.productVariants.productId, productId),
          eq(s.productVariants.isActive, true),
        ))
        .limit(1);
      if (!selectedVariant) return null;
      variant = selectedVariant;
    }

    const availableStock = variant ? variant.stockQuantity : product.stockQuantity;
    if (product.trackInventory && availableStock < quantity) return null;

    const storeSettings = await this.db.select().from(s.storeSettings)
      .where(eq(s.storeSettings.storeId, storeId)).limit(1);

    let giftWrapPrice: number | undefined;
    if (giftData?.giftWrapSelected) {
      const override = product.giftWrapPriceOverride ? Number(product.giftWrapPriceOverride) : undefined;
      const defaultPrice = storeSettings[0]?.giftWrapDefaultPrice ? Number(storeSettings[0].giftWrapDefaultPrice) : undefined;
      giftWrapPrice = override ?? defaultPrice ?? 0;
    }

    const existingItem = await this.db.select().from(s.cartItems)
      .where(and(
        eq(s.cartItems.cartId, cartId),
        eq(s.cartItems.productId, productId),
        variantId !== undefined ? eq(s.cartItems.variantId, variantId) : isNull(s.cartItems.variantId),
      ))
      .limit(1);

    const unitPrice = Number(variant?.price ?? product.price);
    const totalPrice = unitPrice * quantity;

      if (existingItem.length > 0) {
      const newQty = existingItem[0].quantity + quantity;
      if (product.trackInventory && availableStock < newQty) return null;
      const existingNotes = existingItem[0].notes;
      const mergedNotes = notes && existingNotes
        ? `${existingNotes}; ${notes}`
        : (notes || existingNotes || null);

      const existingGiftWrapPrice = existingItem[0].giftWrapPrice ? Number(existingItem[0].giftWrapPrice) : undefined;
      const mergedGiftWrapPrice = giftData?.giftWrapSelected ? (giftWrapPrice ?? existingGiftWrapPrice) : existingGiftWrapPrice;

      await this.db.update(s.cartItems).set({
        quantity: newQty,
        unitPrice: unitPrice.toString(),
        totalPrice: (unitPrice * newQty).toString(),
        notes: mergedNotes,
        giftWrapSelected: giftData?.giftWrapSelected ?? existingItem[0].giftWrapSelected,
        giftWrapPrice: mergedGiftWrapPrice?.toString() ?? null,
        sendAsGift: giftData?.sendAsGift ?? existingItem[0].sendAsGift,
        giftMessage: giftData?.giftMessage ?? existingItem[0].giftMessage,
        updatedAt: new Date(),
      }).where(eq(s.cartItems.id, existingItem[0].id));
    } else {
      await this.db.insert(s.cartItems).values({
        cartId, productId, variantId: variant?.id ?? null, quantity,
        unitPrice: unitPrice.toString(),
        totalPrice: totalPrice.toString(),
        notes: notes ?? null,
        giftWrapSelected: giftData?.giftWrapSelected ?? false,
        giftWrapPrice: giftWrapPrice?.toString() ?? null,
        sendAsGift: giftData?.sendAsGift ?? false,
        giftMessage: giftData?.giftMessage ?? null,
      });
    }

    return this.getCart(storeId, cartId);
  }

  async updateItemQuantity(storeId: number, cartId: string, itemId: number, quantity: number) {
    const [cart] = await this.db.select({ id: s.carts.id })
      .from(s.carts)
      .where(and(eq(s.carts.id, cartId), eq(s.carts.storeId, storeId)))
      .limit(1);
    if (!cart) return false;

    if (quantity <= 0) {
      await this.db.delete(s.cartItems).where(and(eq(s.cartItems.id, itemId), eq(s.cartItems.cartId, cartId)));
      return true;
    }
    const [row] = await this.db.select({
      item: s.cartItems,
      product: s.products,
      variant: s.productVariants,
    }).from(s.cartItems)
      .innerJoin(s.products, eq(s.cartItems.productId, s.products.id))
      .leftJoin(s.productVariants, eq(s.cartItems.variantId, s.productVariants.id))
      .where(and(
        eq(s.cartItems.id, itemId),
        eq(s.cartItems.cartId, cartId),
        eq(s.products.storeId, storeId),
      ))
      .limit(1);
    if (!row) return false;
    if (row.product.status !== 'active') return false;
    if (row.item.variantId && !row.variant?.isActive) return false;
    const availableStock = row.variant ? row.variant.stockQuantity : row.product.stockQuantity;
    if (row.product.trackInventory && availableStock < quantity) return false;
    const unitPrice = Number(row.variant?.price ?? row.product.price);
    await this.db.update(s.cartItems).set({
      quantity,
      totalPrice: (unitPrice * quantity).toString(),
      unitPrice: unitPrice.toString(),
      updatedAt: new Date(),
    }).where(and(eq(s.cartItems.id, itemId), eq(s.cartItems.cartId, cartId)));
    return true;
  }

  async removeItem(storeId: number, cartId: string, itemId: number) {
    const [cart] = await this.db.select({ id: s.carts.id })
      .from(s.carts)
      .where(and(eq(s.carts.id, cartId), eq(s.carts.storeId, storeId)))
      .limit(1);
    if (!cart) return false;
    await this.db.delete(s.cartItems).where(and(eq(s.cartItems.id, itemId), eq(s.cartItems.cartId, cartId)));
    return true;
  }

  async clearCart(storeId: number, cartId: string) {
    const [cart] = await this.db.select({ id: s.carts.id })
      .from(s.carts)
      .where(and(eq(s.carts.id, cartId), eq(s.carts.storeId, storeId)))
      .limit(1);
    if (!cart) return false;
    await this.db.delete(s.cartItems).where(eq(s.cartItems.cartId, cartId));
    return true;
  }
}

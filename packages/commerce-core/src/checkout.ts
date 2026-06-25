import { eq, and, gte, sql } from 'drizzle-orm';
import { createDbClient, type DbClient, type DbTransaction } from '@haa/db';
import * as s from '@haa/db/schema';
import { CartService } from './cart.js';
import { OrdersService } from './orders.js';
import { CouponsService } from './coupons.js';
import { PaymentService, createPaymentProvider, FakePaymentProvider } from '@haa/payment-providers';
import type { PaymentProvider } from '@haa/payment-providers';
import { WalletLedger, describePlatformFeePolicy } from '@haa/wallet-core';
import { StoreBillingSettingsService } from './billing-settings-service.js';
import { WebhookOutboxService } from '@haa/integration-core';
import { AuditLogService } from '@haa/integration-core';
import { ManualShippingProvider } from '@haa/shipping-core';
import { NotificationService } from '@haa/notification-core';
import { CustomersService } from './customers.js';
import { acquireLock, releaseLock } from './redis.js';
import { isDemoStore, type ProviderCode } from '@haa/shared';
import { WalletPostingService } from './wallet-posting-service.js';
import { LowStockNotifier } from './low-stock-notifier.js';

// Shape of a single cart row as returned by CartService.getCart()
// (one `item` row joined with its `product` + optional `variant`).
// Kept local so the file no longer falls back to `any[]`.
type CartItemWithProduct = {
  item: typeof s.cartItems.$inferSelect;
  product: typeof s.products.$inferSelect & { images: Array<typeof s.productImages.$inferSelect> };
  variant: typeof s.productVariants.$inferSelect | null;
};

export class CheckoutService {
  private cartService: CartService;
  private ordersService: OrdersService;
  private paymentService: PaymentService;
  private paymentProvider: PaymentProvider;
  private walletLedger: WalletLedger;
  private webhookOutbox: WebhookOutboxService;
  private auditLog: AuditLogService;
  private shippingProvider: ManualShippingProvider;
  private customersService: CustomersService;
  private isDemo: boolean;

  constructor(private db: DbClient = createDbClient(), provider?: PaymentProvider, private store?: { id: number; isDemo?: boolean | null }) {
    this.cartService = new CartService(this.db);
    this.ordersService = new OrdersService(this.db);
    this.paymentService = new PaymentService(this.db);
    this.isDemo = isDemoStore(store) ?? false;
    // Demo stores always use FakePaymentProvider (no real API calls)
    this.paymentProvider = this.isDemo ? new FakePaymentProvider() : (provider ?? createPaymentProvider());
    this.walletLedger = new WalletLedger(this.db);
    this.webhookOutbox = new WebhookOutboxService(this.db);
    this.auditLog = new AuditLogService(this.db);
    this.shippingProvider = new ManualShippingProvider();
    this.customersService = new CustomersService(this.db);
  }

  async createSession(storeId: number, input: {
    cartId: string; idempotencyKey: string;
    customerName: string; customerPhone: string; customerEmail?: string;
    shippingAddress?: { street?: string; district?: string; city: string; state?: string; postalCode?: string; country?: string };
    shippingMethodId?: number;
    paymentMethod: string;
    notes?: string;
    couponCode?: string;
    fulfillmentType?: 'shipping' | 'local_pickup';
    pickupLocationId?: number;
    gift?: { sendAsGift?: boolean; message?: string };
  }) {
    const cart = await this.cartService.getCart(storeId, input.cartId);
    if (!cart) throw new Error('Cart not found');

    const customer = await this.customersService.findOrCreate(storeId, {
      name: input.customerName,
      phone: input.customerPhone,
      email: input.customerEmail,
    });

    // Server-side validations for features and data integrity
    const [storeSettings] = await this.db.select().from(s.storeSettings).where(eq(s.storeSettings.storeId, storeId)).limit(1);
    const features = (storeSettings?.productFeatures ?? {}) as Record<string, boolean>;

    const fulfillmentType = input.fulfillmentType ?? 'shipping';

    let shippingCost = 0;
    if (fulfillmentType === 'local_pickup') {
      if (!input.pickupLocationId) throw new Error('Pickup location is required for local pickup');
      if (!features.pickup) throw new Error('Pickup feature is not enabled for this store');
      const [location] = await this.db.select().from(s.pickupLocations)
        .where(and(eq(s.pickupLocations.id, input.pickupLocationId), eq(s.pickupLocations.storeId, storeId))).limit(1);
      if (!location) throw new Error('Pickup location not found');
      if (!location.isActive) throw new Error('Pickup location is not active');
    } else {
      if (!input.shippingMethodId) throw new Error('Shipping method is required');
      if (!input.shippingAddress?.city) throw new Error('Shipping city is required');
      const shippingRates = await this.shippingProvider.calculateRates({
        storeId,
        items: cart.items.map(i => ({
          weightGrams: i.product.weightGrams,
          quantity: i.item.quantity,
          requiresShipping: i.product.requiresShipping,
        })),
        destination: { city: input.shippingAddress.city, country: input.shippingAddress.country ?? 'Saudi Arabia' },
        subtotal: cart.subtotal,
      });
      const selectedRate = shippingRates.find(r => r.methodId === input.shippingMethodId);
      if (!selectedRate) throw new Error('Shipping method not available for this destination');
      shippingCost = selectedRate.cost;
    }

    const subtotal = cart.subtotal;
    const taxAmount = 0;

    let couponCode: string | null = null;
    let couponDiscount = 0;

    if (input.couponCode) {
      const couponService = new CouponsService(this.db);
      const validation = await couponService.validate(storeId, input.couponCode, subtotal);
      if (validation.valid) {
        couponCode = validation.coupon.code;
        couponDiscount = couponService.calculateDiscount(validation.coupon, subtotal, shippingCost);
      }
    }

    const total = Math.max(0, subtotal + shippingCost + taxAmount - couponDiscount);

    const [existingSession] = await this.db.select().from(s.checkoutSessions)
      .where(eq(s.checkoutSessions.idempotencyKey, input.idempotencyKey)).limit(1);
    if (existingSession) {
      return { idempotent: true, session: existingSession };
    }

    if (input.gift?.sendAsGift) {
      if (!features.sendAsGift) throw new Error('Send-as-gift feature is not enabled for this store');
      if (input.gift.message && input.gift.message.length > (storeSettings?.giftMessageMaxLength ?? 250)) {
        throw new Error(`Gift message exceeds maximum length of ${storeSettings?.giftMessageMaxLength ?? 250} characters`);
      }
    }

    // Verify per-item gift options against features and product settings
    for (const item of cart.items) {
      const itemGiftWrap = item.item.giftWrapSelected;
      const itemSendAsGift = item.item.sendAsGift;
      if (itemGiftWrap && !features.giftWrap) throw new Error('Gift wrap feature is not enabled for this store');
      if (itemGiftWrap && !item.product.giftWrapAvailable) throw new Error(`Product "${item.product.name}" does not support gift wrap`);
      if (itemSendAsGift && !features.sendAsGift) throw new Error('Send-as-gift feature is not enabled for this store');
      const giftMsg = item.item.giftMessage;
      if (giftMsg && giftMsg.length > (storeSettings?.giftMessageMaxLength ?? 250)) {
        throw new Error(`Gift message for "${item.product.name}" exceeds maximum length`);
      }
    }

    const giftOptions = input.gift?.sendAsGift ? {
      sendAsGift: true,
      message: input.gift.message ?? null,
    } : null;

    const metadata: Record<string, unknown> = {};
    if (fulfillmentType !== 'shipping') metadata.fulfillmentType = fulfillmentType;
    if (input.pickupLocationId) metadata.pickupLocationId = input.pickupLocationId;
    if (giftOptions) metadata.giftOptions = giftOptions;

    const [session] = await this.db.insert(s.checkoutSessions).values({
      storeId, cartId: input.cartId, idempotencyKey: input.idempotencyKey,
      status: 'pending',
      customerName: input.customerName, customerPhone: input.customerPhone,
      customerEmail: input.customerEmail ?? null,
      // Cast through unknown: the route may pass a partial address (street is optional)
      // while the column's $type<>() requires `street: string`. Trust the caller.
      shippingAddress: (input.shippingAddress ?? null) as typeof s.checkoutSessions.$inferInsert['shippingAddress'],
      shippingMethodId: input.shippingMethodId ?? null,
      shippingCost: shippingCost.toString(),
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      total: total.toString(),
      paymentMethod: input.paymentMethod,
      paymentStatus: 'unpaid',
      notes: input.notes ?? null,
      couponCode,
      couponDiscount: couponDiscount > 0 ? couponDiscount.toString() : null,
      metadata: Object.keys(metadata).length > 0 ? metadata : null,
    }).returning();

    return { idempotent: false, session, customer };
  }

  async confirm(storeId: number, sessionId: string, actorUserId?: number, _ipAddress?: string) {
    const lockKey = `lock:checkout:${sessionId}`;
    const hasLock = process.env.REDIS_URL ? await acquireLock(lockKey) : true;
    if (!hasLock) throw new Error('Checkout is already being processed. Please wait.');

    const [session] = await this.db.select().from(s.checkoutSessions).where(eq(s.checkoutSessions.id, sessionId)).limit(1);
    if (!session) throw new Error('Checkout session not found');

    const isBNPL = session.paymentMethod === 'tabby_installments' || session.paymentMethod === 'tamara_installments';
    if (isBNPL) throw new Error('BNPL payments must use the payment-session endpoint instead of confirm');

    try {
      // Phase 1: Order Creation & Stock Locking (Local Transaction)
      let cartItems: CartItemWithProduct[] = [];

      const orderData = await this.db.transaction(async (tx) => {
        const [existingOrder] = await tx.select().from(s.orders)
          .where(eq(s.orders.checkoutSessionId, sessionId)).limit(1);
        if (existingOrder) return { order: existingOrder, idempotent: true };

        const cart = await this.cartService.getCart(storeId, session.cartId);
        if (!cart) throw new Error('Cart not found');
        cartItems = cart.items;

        const customer = await this.customersService.findOrCreate(storeId, {
          name: session.customerName, phone: session.customerPhone,
          email: session.customerEmail ?? undefined,
        });

        const orderNumber = await new OrdersService(tx).generateOrderNumber(storeId);

        const sessionMeta = (session.metadata ?? {}) as Record<string, unknown>;
        const giftOpts = sessionMeta.giftOptions as { sendAsGift?: boolean; message?: string } | undefined;
        const orderSource = cart.items.some((i) => i.item.source === 'haa_marketplace') ? 'haa_marketplace' : 'storefront';
        const platformCommission = cart.items.reduce((sum, i) => {
          if (i.item.source !== 'haa_marketplace') return sum;
          const rate = Number(i.product.haaMarketplaceCommissionRate ?? 0.05);
          return sum + Math.round(Number(i.item.totalPrice) * rate * 100) / 100;
        }, 0);

        const order = await new OrdersService(tx).create({
          storeId,
          customerId: customer.id,
          orderNumber,
          checkoutSessionId: session.id,
          idempotencyKey: session.idempotencyKey,
          customerName: session.customerName,
          customerPhone: session.customerPhone,
          customerEmail: session.customerEmail ?? undefined,
          shippingAddress: session.shippingAddress as Record<string, unknown> ?? undefined,
          shippingMethodId: session.shippingMethodId ?? undefined,
          shippingCost: session.shippingCost ? Number(session.shippingCost) : undefined,
          subtotal: Number(session.subtotal),
          taxAmount: Number(session.taxAmount ?? 0),
          total: Number(session.total),
          paymentMethod: session.paymentMethod ?? undefined,
          couponCode: session.couponCode ?? undefined,
          couponDiscount: session.couponDiscount ? Number(session.couponDiscount) : undefined,
          source: orderSource,
          platformCommission: platformCommission > 0 ? platformCommission : undefined,
          fulfillmentType: (sessionMeta.fulfillmentType as string) ?? 'shipping',
          pickupLocationId: sessionMeta.pickupLocationId ? Number(sessionMeta.pickupLocationId) : undefined,
          giftOptions: giftOpts,
          items: cart.items.map(i => ({
            productId: i.product.id,
            variantId: i.variant?.id ?? null,
            name: i.variant ? `${i.product.name} - ${i.variant.name}` : i.product.name,
            sku: i.variant?.sku ?? i.product.sku ?? undefined,
            quantity: i.item.quantity,
            unitPrice: Number(i.item.unitPrice),
            totalPrice: Number(i.item.totalPrice),
            notes: i.item.notes ?? undefined,
            giftWrapSelected: i.item.giftWrapSelected ?? false,
            giftWrapPrice: i.item.giftWrapPrice ? Number(i.item.giftWrapPrice) : undefined,
            sendAsGift: i.item.sendAsGift ?? false,
            giftMessage: i.item.giftMessage ?? undefined,
            source: i.item.source ?? 'storefront',
            platformCommissionRate: i.item.source === 'haa_marketplace' ? Number(i.product.haaMarketplaceCommissionRate ?? 0.05) : undefined,
            platformCommission: i.item.source === 'haa_marketplace'
              ? Math.round(Number(i.item.totalPrice) * Number(i.product.haaMarketplaceCommissionRate ?? 0.05) * 100) / 100
              : undefined,
          })),
          notes: session.notes ?? undefined,
        });

        if (session.couponCode && session.couponDiscount) {
          // Atomic coupon claim — runs inside the order transaction so
          // a coupon-cap exhaustion rolls the entire order back. See
          // `CouponsService.tryClaimUse` for the race fix.
          const couponService = new CouponsService(tx);
          const couponRecord = await couponService.getByCode(storeId, session.couponCode);
          if (couponRecord) {
            const claimed = await couponService.tryClaimUse(storeId, couponRecord.id);
            if (!claimed) {
              throw new Error('COUPON_EXHAUSTED');
            }
          }
        }

        await tx.update(s.checkoutSessions).set({ status: 'completed', completedAt: new Date() })
          .where(eq(s.checkoutSessions.id, sessionId));

        const txOrdersService = new OrdersService(tx);
        await txOrdersService.changeStatus(storeId, order.id, 'pending_payment', actorUserId);

        // CRITICAL: Lock stock FIRST before payment
        await this.decrementStock(tx, cart.items);

        return { order, idempotent: false };
      });

      const { order, idempotent } = orderData;
      if (idempotent) return { order, paymentStatus: order.paymentStatus, idempotent: true };

      // Phase 2: Payment (External API - OUTSIDE Transaction)
      let paymentStatus = 'unpaid';
      let paymentMessage = '';
      let redirectUrl: string | undefined; // 3DS challenge URL (SAMA mandatory)

      if (order.paymentMethod !== 'bank_transfer' && order.paymentMethod !== 'cash_on_delivery') {
        const session = await this.db.select().from(s.checkoutSessions).where(eq(s.checkoutSessions.id, order.checkoutSessionId!)).limit(1);

        const payment = await this.paymentProvider.createPaymentIntent(order.id, Number(session[0].total), {
          paymentMethod: order.paymentMethod,
        });
        // 3DS challenge: if the provider returned a redirectUrl, the
        // payment is in 'requires_3ds' and the storefront must redirect
        // the customer to the issuer's challenge page. We skip the
        // synchronous confirmPayment — the 3DS callback (webhook or
        // storefront callback) will trigger confirmation later.
        if (payment.redirectUrl) {
          paymentStatus = 'requires_3ds';
          redirectUrl = payment.redirectUrl;
        } else {
          const confirmResult = await this.paymentProvider.confirmPayment(payment.paymentId);
          paymentStatus = confirmResult.status;
          paymentMessage = confirmResult.message ?? '';
        }
      } else if (order.paymentMethod === 'bank_transfer') {
        paymentStatus = 'paid'; // Auto-paid for bank transfer
      } else {
        paymentStatus = 'pending'; // COD: pending until collection at delivery/pickup
      }

      // Phase 3: Finalize (Local Transaction)
      await this.db.transaction(async (tx) => {
        const txOrdersService = new OrdersService(tx);

        await tx.insert(s.marketingEvents).values({
          storeId, sessionId: `order-${order.orderNumber}`, orderId: order.id,
          eventType: 'order_created', cartId: session.cartId ?? null,
          path: '/checkout/confirm',
          metadata: { orderNumber: order.orderNumber, total: Number(order.total), paymentMethod: order.paymentMethod },
        });
        
        if (paymentStatus === 'paid') {
          await txOrdersService.updatePaymentStatus(storeId, order.id, 'paid', Number(order.total));
          await txOrdersService.changeStatus(storeId, order.id, 'confirmed', actorUserId);

          for (const item of cartItems) {
            await tx.update(s.products)
              .set({ salesCount: sql`${s.products.salesCount} + ${item.item.quantity}` })
              .where(eq(s.products.id, item.product.id));
          }

          // Centralize wallet entry creation via WalletPostingService
          // (TASK-0033 + TASK-0034 sub-item 5). The service provides
          // the entry type + amount; the actual DB write is delegated
          // to WalletLedger. The order.orderNumber is available here
          // (already looked up above) so it's used for the service's
          // metadata field.
          const txPosting = new WalletPostingService(tx);
          const txWallet = new WalletLedger(tx);
          const saleResult = await txPosting.postSale({
            storeId,
            orderId: order.id,
            orderTotal: Number(order.total),
            orderNumber: order.orderNumber,
            method: order.paymentMethod === 'cash_on_delivery' ? 'cod' : 'online',
          });
          await txWallet.recordEntry({
            storeId, type: saleResult.entryType, direction: 'credit',
            amount: saleResult.amount,
            referenceType: 'order', referenceId: order.id,
            description: `Order ${order.orderNumber} payment`,
            status: 'available',
          });

          // Phase 4: read the store's configurable platform-fee policy and
          // snapshot the rate + fixed amount onto the fee entry. The policy
          // is locked to this order — changing the policy later never
          // re-prices this order. The service now owns the calculation;
          // the ledger write still attaches the audit-trail fields
          // (feeRatePct / feeFixed / feeSource / metadata) so the
          // existing wallet summary UI and admin reporting continue
          // to work.
          const txBilling = new StoreBillingSettingsService(tx);
          const platformPolicy = await txBilling.getPlatformFeePolicy(storeId);
          const platformResult = await txPosting.postPlatformFee({
            storeId,
            orderId: order.id,
            orderTotal: Number(order.total),
            orderNumber: order.orderNumber,
            policy: platformPolicy,
          });
          if (platformResult.amount > 0) {
            // Idempotency: skip if a platform_fee entry already exists for
            // this order (e.g. webhook replay or accidental double-
            // invocation). Cross-flow dedup is the responsibility of
            // hasPlatformFeeForOrder — the service's per-instance dedup
            // only protects within a single transaction.
            const alreadyCharged = await txWallet.hasPlatformFeeForOrder(storeId, order.id);
            if (!alreadyCharged) {
              await txWallet.recordEntry({
                storeId, type: platformResult.entryType, direction: 'debit',
                amount: platformResult.amount,
                referenceType: 'order', referenceId: order.id,
                description: `رسوم منصة Haa (${describePlatformFeePolicy(platformPolicy)}) للطلب ${order.orderNumber}`,
                status: 'available',
                feeRatePct: platformPolicy.pct ?? null,
                feeFixed: platformPolicy.fixed ?? null,
                feeSource: 'platform_policy',
                metadata: {
                  orderTotal: Number(order.total),
                  platformFeeMode: platformPolicy.mode,
                  platformFeePct: platformPolicy.pct ?? null,
                  platformFeeFixed: platformPolicy.fixed ?? null,
                  platformFeeLabel: describePlatformFeePolicy(platformPolicy),
                  appliedAt: new Date().toISOString(),
                },
              });
            }
          }

          await tx.insert(s.marketingEvents).values({
            storeId, sessionId: `order-${order.orderNumber}`, orderId: order.id,
            eventType: 'payment_succeeded', cartId: session.cartId ?? null,
            path: '/checkout/confirm',
            metadata: { orderNumber: order.orderNumber, paidAmount: Number(order.total) },
          });

          if (!this.isDemo) {
            const txOutbox = new WebhookOutboxService(tx);
            await txOutbox.recordEvent('order.created', storeId, 0, { orderId: order.id, orderNumber: order.orderNumber, total: Number(order.total) });
            await txOutbox.recordEvent('order.paid', storeId, 0, { orderId: order.id, orderNumber: order.orderNumber, paidAmount: Number(order.total) });
          }
        } else if (paymentStatus === 'pending' && order.paymentMethod === 'cash_on_delivery') {
          // COD: mark payment as pending, confirm order, no wallet entries until collection
          await txOrdersService.updatePaymentStatus(storeId, order.id, 'pending', Number(order.total));
          await txOrdersService.changeStatus(storeId, order.id, 'confirmed', actorUserId);

          for (const item of cartItems) {
            await tx.update(s.products)
              .set({ salesCount: sql`${s.products.salesCount} + ${item.item.quantity}` })
              .where(eq(s.products.id, item.product.id));
          }

          await tx.insert(s.marketingEvents).values({
            storeId, sessionId: `order-${order.orderNumber}`, orderId: order.id,
            eventType: 'payment_succeeded', cartId: session.cartId ?? null,
            path: '/checkout/confirm',
            metadata: { orderNumber: order.orderNumber, paymentMethod: 'cash_on_delivery', status: 'pending_collection' },
          });

          if (!this.isDemo) {
            const txOutbox = new WebhookOutboxService(tx);
            await txOutbox.recordEvent('order.created', storeId, 0, { orderId: order.id, orderNumber: order.orderNumber, total: Number(order.total) });
          }
        } else if (paymentStatus === 'requires_3ds') {
          // 3DS challenge: the order is created and the payment is in
          // 'requires_3ds'. The customer is now at the issuer's challenge
          // page; the 3DS callback (webhook or storefront redirect) will
          // finalize the payment later. We do NOT mark the order as paid,
          // do NOT fire 'order.paid' webhook, and do NOT release stock
          // (stock stays reserved until 3DS completes).
          await txOrdersService.updatePaymentStatus(storeId, order.id, 'requires_3ds', Number(order.total));
          await txOrdersService.changeStatus(storeId, order.id, 'awaiting_3ds', actorUserId);

          await tx.insert(s.marketingEvents).values({
            storeId, sessionId: `order-${order.orderNumber}`, orderId: order.id,
            eventType: 'order_created', cartId: session.cartId ?? null,
            path: '/checkout/confirm',
            metadata: { orderNumber: order.orderNumber, paymentMethod: order.paymentMethod, status: 'requires_3ds' },
          });

          if (!this.isDemo) {
            const txOutbox = new WebhookOutboxService(tx);
            await txOutbox.recordEvent('order.created', storeId, 0, { orderId: order.id, orderNumber: order.orderNumber, total: Number(order.total) });
          }
        } else {
          // Payment failed or pending
          await txOrdersService.changeStatus(storeId, order.id, 'payment_failed', actorUserId);

          await tx.insert(s.marketingEvents).values({
            storeId, sessionId: `order-${order.orderNumber}`, orderId: order.id,
            eventType: 'payment_failed', cartId: session.cartId ?? null,
            path: '/checkout/confirm',
            metadata: { orderNumber: order.orderNumber, paymentMethod: order.paymentMethod, paymentMessage },
          });

          // Here we should ideally release the stock back
          await this.incrementStock(tx, cartItems.map(i => ({ productId: i.product.id, variantId: i.variant?.id ?? null, quantity: i.item.quantity }))); 
        }

        const txAudit = new AuditLogService(tx);
        await txAudit.record({
          actorUserId: actorUserId ?? null,
          storeId, action: 'order_status_changed',
          entityType: 'order', entityId: order.id,
          newValue: { status: order.paymentStatus, paymentStatus, orderNumber: order.orderNumber },
        });

        await this.cartService.clearCart(storeId, session.cartId);
      });

      // HAA-LOW-STOCK-EMAIL — fire-and-forget merchant alert AFTER the
      // payment transaction commits. NEVER inside the transaction —
      // email failure must never roll back the order. The notifier
      // itself swallows errors with structured logs; the outer
      // `.catch(() => {})` is belt-and-suspenders for the rare case
      // where the constructor/import throws.
      //
      // We feed the union of product ids and variant→product ids that
      // actually had stock decremented (track_inventory=true filter
      // already happened in decrementStock).
      //
      // The flip side: on payment failure we ran incrementStock inside
      // the Phase 3 tx (line ~478). Once stock is restocked above the
      // threshold the dedupe stamp must be cleared so the next dip
      // re-arms — `resetForUpdatedProducts` is a no-op for products
      // still at-or-below the threshold (e.g. partial restock).
      if (!this.isDemo) {
        const stockProductIds = cartItems
          .filter((i) => i.product.trackInventory)
          .map((i) => i.product.id);
        if (paymentStatus === 'paid' || (paymentStatus === 'pending' && order.paymentMethod === 'cash_on_delivery')) {
          void new LowStockNotifier(this.db)
            .fireForUpdatedProducts(storeId, stockProductIds)
            .catch(() => {});
        } else if (paymentStatus !== 'requires_3ds') {
          // Payment failed → stock was incremented in the Phase 3 tx.
          void new LowStockNotifier(this.db)
            .resetForUpdatedProducts(storeId, stockProductIds)
            .catch(() => {});
        }
      }

      // Send notifications (demo stores skip real notifications)
      if (!this.isDemo && (paymentStatus === 'paid' || (paymentStatus === 'pending' && order.paymentMethod === 'cash_on_delivery'))) {
        const isCOD = order.paymentMethod === 'cash_on_delivery';
        try {
          const sessionMeta = (session.metadata ?? {}) as Record<string, unknown>;
          const fType = (sessionMeta.fulfillmentType as string) ?? 'shipping';
          const giftOpt = sessionMeta.giftOptions as { sendAsGift?: boolean; message?: string } | undefined;

          const itemsList = cartItems.map((i) =>
            `• ${i.product.name} × ${i.item.quantity} = ${Number(i.item.totalPrice).toFixed(2)} ر.س${i.item.giftWrapSelected ? ' (🎁 تغليف هدية)' : ''}${i.item.sendAsGift ? ' (💌 إرسال كهدية)' : ''}`
          ).join('\n');

          const fulfillmentSummary = fType === 'local_pickup'
            ? '📍 استلام من الفرع'
            : `🚚 شحن إلى: ${session.shippingAddress?.city ?? ''}`;

          const giftString = giftOpt ? `💌 إرسال كهدية${giftOpt.message ? `: ${giftOpt.message}` : ''}` : '';

          const notifService = new NotificationService();
          await notifService.send(storeId, 'order_created', {
            orderNumber: order.orderNumber,
            total: Number(order.total).toFixed(2),
            fulfillmentSummary,
            itemsList,
            giftSummary: giftString || 'بدون إهداء',
          });
          if (!isCOD) {
            await notifService.send(storeId, 'payment_success', {
              orderNumber: order.orderNumber,
              amount: Number(order.total).toFixed(2),
              fulfillmentSummary,
              giftSummary: giftString || 'بدون إهداء',
              itemsList,
            });
          }
        } catch { /* notification failure should not block checkout */ }
      }

      const refreshedOrder = await this.ordersService.getById(storeId, order.id);
      return { order: refreshedOrder ?? order, paymentStatus, paymentMessage, redirectUrl };

    } finally {
      await releaseLock(lockKey);
    }
  }

  async initiateBNPLPayment(
    storeId: number,
    sessionId: string,
    returnUrls: {
      frontendSuccessUrl: string;
      frontendCancelUrl: string;
      frontendFailureUrl?: string;
      callbackSuccessUrl: string;
      callbackCancelUrl: string;
      callbackFailureUrl: string;
    },
    actorUserId?: number,
  ) {
    const lockKey = `lock:checkout:${sessionId}`;
    const hasLock = process.env.REDIS_URL ? await acquireLock(lockKey) : true;
    if (!hasLock) throw new Error('Checkout is already being processed. Please wait.');

    const [session] = await this.db.select().from(s.checkoutSessions).where(eq(s.checkoutSessions.id, sessionId)).limit(1);
    if (!session) throw new Error('Checkout session not found');

    try {
      const isTabby = session.paymentMethod === 'tabby_installments';
      const isTamara = session.paymentMethod === 'tamara_installments';
      if (!isTabby && !isTamara) throw new Error('Payment method is not a BNPL provider');

      // Demo stores use mock payment provider for BNPL too
      if (this.isDemo) {
        const demoOrderData = await this.db.transaction(async (tx) => {
          const [existingOrder] = await tx.select().from(s.orders)
            .where(eq(s.orders.checkoutSessionId, sessionId)).limit(1);
          if (existingOrder) return { order: existingOrder, idempotent: true };

          const cart = await this.cartService.getCart(storeId, session.cartId);
          if (!cart) throw new Error('Cart not found');

          const customer = await this.customersService.findOrCreate(storeId, {
            name: session.customerName, phone: session.customerPhone,
            email: session.customerEmail ?? undefined,
          });

          const orderNumber = await new OrdersService(tx).generateOrderNumber(storeId);
          const sessionMeta = (session.metadata ?? {}) as Record<string, unknown>;
          const giftOpts = sessionMeta.giftOptions as { sendAsGift?: boolean; message?: string } | undefined;

          const order = await new OrdersService(tx).create({
            storeId,
            customerId: customer.id,
            orderNumber,
            checkoutSessionId: session.id,
            idempotencyKey: session.idempotencyKey,
            customerName: session.customerName,
            customerPhone: session.customerPhone,
            customerEmail: session.customerEmail ?? undefined,
            shippingAddress: session.shippingAddress as Record<string, unknown> ?? undefined,
            shippingMethodId: session.shippingMethodId ?? undefined,
            shippingCost: session.shippingCost ? Number(session.shippingCost) : undefined,
            subtotal: Number(session.subtotal),
            taxAmount: Number(session.taxAmount ?? 0),
            total: Number(session.total),
            paymentMethod: session.paymentMethod ?? undefined,
            couponCode: session.couponCode ?? undefined,
            couponDiscount: session.couponDiscount ? Number(session.couponDiscount) : undefined,
            fulfillmentType: (sessionMeta.fulfillmentType as string) ?? 'shipping',
            pickupLocationId: sessionMeta.pickupLocationId ? Number(sessionMeta.pickupLocationId) : undefined,
            giftOptions: giftOpts,
            items: cart.items.map((i) => ({
              productId: i.product.id,
              variantId: i.variant?.id ?? null,
              name: i.variant ? `${i.product.name} - ${i.variant.name}` : i.product.name,
              sku: i.variant?.sku ?? i.product.sku ?? undefined,
              quantity: i.item.quantity,
              unitPrice: Number(i.item.unitPrice),
              totalPrice: Number(i.item.totalPrice),
              notes: i.item.notes ?? undefined,
              giftWrapSelected: i.item.giftWrapSelected ?? false,
              giftWrapPrice: i.item.giftWrapPrice ? Number(i.item.giftWrapPrice) : undefined,
              sendAsGift: i.item.sendAsGift ?? false,
              giftMessage: i.item.giftMessage ?? undefined,
            })),
            notes: session.notes ?? undefined,
            metadata: { isDemoPayment: true },
          });

          if (session.couponCode && session.couponDiscount) {
            const couponService = new CouponsService(tx);
            const couponRecord = await couponService.getByCode(storeId, session.couponCode);
            if (couponRecord) {
              const claimed = await couponService.tryClaimUse(storeId, couponRecord.id);
              if (!claimed) {
                throw new Error('COUPON_EXHAUSTED');
              }
            }
          }

          await tx.update(s.checkoutSessions).set({ status: 'completed', completedAt: new Date() })
            .where(eq(s.checkoutSessions.id, sessionId));

          const txOrders = new OrdersService(tx);
          await txOrders.changeStatus(storeId, order.id, 'confirmed', actorUserId);
          await this.decrementStock(tx, cart.items);

          return { order, idempotent: false };
        });

        const { order } = demoOrderData;
        return {
          order,
          paymentId: `demo-payment-${order.id}`,
          redirectUrl: '',
        };
      }

      const providerCode = isTabby ? 'tabby' : 'tamara';
      const provider = createPaymentProvider(providerCode as ProviderCode);
      if (!provider.isAvailable) throw new Error(`${providerCode} provider is not configured`);

      const orderData = await this.db.transaction(async (tx) => {
        const [existingOrder] = await tx.select().from(s.orders)
          .where(eq(s.orders.checkoutSessionId, sessionId)).limit(1);
        if (existingOrder) return { order: existingOrder, idempotent: true };

        const cart = await this.cartService.getCart(storeId, session.cartId);
        if (!cart) throw new Error('Cart not found');

        const customer = await this.customersService.findOrCreate(storeId, {
          name: session.customerName, phone: session.customerPhone,
          email: session.customerEmail ?? undefined,
        });

        const orderNumber = await new OrdersService(tx).generateOrderNumber(storeId);
        const sessionMeta = (session.metadata ?? {}) as Record<string, unknown>;
        const giftOpts = sessionMeta.giftOptions as { sendAsGift?: boolean; message?: string } | undefined;

        const order = await new OrdersService(tx).create({
          storeId,
          customerId: customer.id,
          orderNumber,
          checkoutSessionId: session.id,
          idempotencyKey: session.idempotencyKey,
          customerName: session.customerName,
          customerPhone: session.customerPhone,
          customerEmail: session.customerEmail ?? undefined,
          shippingAddress: session.shippingAddress as Record<string, unknown> ?? undefined,
          shippingMethodId: session.shippingMethodId ?? undefined,
          shippingCost: session.shippingCost ? Number(session.shippingCost) : undefined,
          subtotal: Number(session.subtotal),
          taxAmount: Number(session.taxAmount ?? 0),
          total: Number(session.total),
          paymentMethod: session.paymentMethod ?? undefined,
          couponCode: session.couponCode ?? undefined,
          couponDiscount: session.couponDiscount ? Number(session.couponDiscount) : undefined,
          fulfillmentType: (sessionMeta.fulfillmentType as string) ?? 'shipping',
          pickupLocationId: sessionMeta.pickupLocationId ? Number(sessionMeta.pickupLocationId) : undefined,
          giftOptions: giftOpts,
          items: cart.items.map((i) => ({
            productId: i.product.id,
            variantId: i.variant?.id ?? null,
            name: i.variant ? `${i.product.name} - ${i.variant.name}` : i.product.name,
            sku: i.variant?.sku ?? i.product.sku ?? undefined,
            quantity: i.item.quantity,
            unitPrice: Number(i.item.unitPrice),
            totalPrice: Number(i.item.totalPrice),
            notes: i.item.notes ?? undefined,
            giftWrapSelected: i.item.giftWrapSelected ?? false,
            giftWrapPrice: i.item.giftWrapPrice ? Number(i.item.giftWrapPrice) : undefined,
            sendAsGift: i.item.sendAsGift ?? false,
            giftMessage: i.item.giftMessage ?? undefined,
          })),
          notes: session.notes ?? undefined,
        });

        if (session.couponCode && session.couponDiscount) {
          const couponService = new CouponsService(tx);
          const couponRecord = await couponService.getByCode(storeId, session.couponCode);
          if (couponRecord) {
            const claimed = await couponService.tryClaimUse(storeId, couponRecord.id);
            if (!claimed) {
              throw new Error('COUPON_EXHAUSTED');
            }
          }
        }

        await tx.update(s.checkoutSessions).set({ status: 'completed', completedAt: new Date() })
          .where(eq(s.checkoutSessions.id, sessionId));

        const txOrders = new OrdersService(tx);
        await txOrders.changeStatus(storeId, order.id, 'pending_payment', actorUserId);
        await this.decrementStock(tx, cart.items);

        return { order, idempotent: false };
      });

      const { order } = orderData;

      const frontendFailure = returnUrls.frontendFailureUrl ?? returnUrls.frontendCancelUrl;

      const payment = await provider.createPaymentIntent(order.id, Number(session.total), {
        paymentMethod: session.paymentMethod,
        customerName: session.customerName,
        customerPhone: session.customerPhone,
        customerEmail: session.customerEmail ?? '',
        successUrl: returnUrls.callbackSuccessUrl,
        cancelUrl: returnUrls.callbackCancelUrl,
        failureUrl: returnUrls.callbackFailureUrl,
        frontendSuccessUrl: returnUrls.frontendSuccessUrl,
        frontendCancelUrl: returnUrls.frontendCancelUrl,
        frontendFailureUrl: frontendFailure,
      });

      return {
        order,
        paymentId: payment.paymentId,
        redirectUrl: payment.redirectUrl ?? '',
      };
    } finally {
      await releaseLock(lockKey);
    }
  }

  async handleBNPLCallback(
    storeId: number,
    providerPaymentId: string,
    actorUserId?: number,
  ): Promise<{ redirectUrl: string; status: 'paid' | 'cancelled' | 'failed'; orderNumber: string }> {
    const [payment] = await this.db.select().from(s.payments)
      .where(eq(s.payments.providerPaymentId, providerPaymentId)).limit(1);
    if (!payment) throw new Error('Payment not found');

    const isTabby = payment.provider === 'tabby';
    const isTamara = payment.provider === 'tamara';
    if (!isTabby && !isTamara) throw new Error('Not a BNPL payment');

    const providerCode = isTabby ? 'tabby' : 'tamara';
    const provider = createPaymentProvider(providerCode as ProviderCode);

    const confirmResult = await provider.confirmPayment(payment.id);
    const meta = (payment.metadata ?? {}) as Record<string, string>;
    const frontendSuccess = meta.frontendSuccessUrl;
    const frontendCancel = meta.frontendCancelUrl;
    const frontendFailure = meta.frontendFailureUrl ?? frontendCancel;

    if (confirmResult.success && (confirmResult.status === 'paid' || confirmResult.status === 'authorized')) {
      await this.db.transaction(async (tx) => {
        const txOrders = new OrdersService(tx);
        await txOrders.updatePaymentStatus(storeId, payment.orderId, 'paid', Number(payment.amount));
        await txOrders.changeStatus(storeId, payment.orderId, 'confirmed', actorUserId);

        const orderItemRows = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, payment.orderId));
        for (const item of orderItemRows) {
          await tx.update(s.products)
            .set({ salesCount: sql`${s.products.salesCount} + ${item.quantity}` })
            .where(eq(s.products.id, item.productId));
        }

        // Centralize wallet entry creation via WalletPostingService
        // (TASK-0033 + TASK-0034 sub-item 5). Same pattern as the
        // regular checkout flow above and collectCOD in orders.ts.
        // The BNPL flow doesn't have the order looked up at the
        // call site, so orderNumber is a placeholder (String(orderId))
        // — the dedup key is unaffected since orderNumber is metadata.
        const txPosting = new WalletPostingService(tx);
        const txWallet = new WalletLedger(tx);
        const saleResult = await txPosting.postSale({
          storeId,
          orderId: payment.orderId,
          orderTotal: Number(payment.amount),
          orderNumber: String(payment.orderId),
          method: 'online',
        });
        await txWallet.recordEntry({
          storeId, type: saleResult.entryType, direction: 'credit',
          amount: saleResult.amount,
          referenceType: 'order', referenceId: payment.orderId,
          description: `Order payment (BNPL)`,
          status: 'available',
        });
        // Phase 4: same configurable policy path as the regular checkout.
        const txBilling = new StoreBillingSettingsService(tx);
        const platformPolicy = await txBilling.getPlatformFeePolicy(storeId);
        const platformResult = await txPosting.postPlatformFee({
          storeId,
          orderId: payment.orderId,
          orderTotal: Number(payment.amount),
          orderNumber: String(payment.orderId),
          policy: platformPolicy,
        });
        if (platformResult.amount > 0) {
          // Idempotency: skip if a platform_fee entry already exists for
          // this order (e.g. webhook replay).
          const alreadyCharged = await txWallet.hasPlatformFeeForOrder(storeId, payment.orderId);
          if (!alreadyCharged) {
            await txWallet.recordEntry({
              storeId, type: platformResult.entryType, direction: 'debit',
              amount: platformResult.amount,
              referenceType: 'order', referenceId: payment.orderId,
              description: `رسوم منصة Haa (${describePlatformFeePolicy(platformPolicy)})`,
              status: 'available',
              feeRatePct: platformPolicy.pct ?? null,
              feeFixed: platformPolicy.fixed ?? null,
              feeSource: 'platform_policy',
              metadata: {
                orderTotal: Number(payment.amount),
                platformFeeMode: platformPolicy.mode,
                platformFeePct: platformPolicy.pct ?? null,
                platformFeeFixed: platformPolicy.fixed ?? null,
                platformFeeLabel: describePlatformFeePolicy(platformPolicy),
                appliedAt: new Date().toISOString(),
              },
            });
          }
        }

        if (!this.isDemo) {
          const txOutbox = new WebhookOutboxService(tx);
          await txOutbox.recordEvent('order.paid', storeId, 0, {
            orderId: payment.orderId, paidAmount: Number(payment.amount),
          });
        }
      });

      const [order] = await this.db.select().from(s.orders).where(eq(s.orders.id, payment.orderId)).limit(1);
      const orderNumber = order?.orderNumber ?? '';
      if (order && !this.isDemo) {
        try {
          const notifService = new NotificationService();
          await notifService.send(storeId, 'payment_success', {
            orderNumber: order.orderNumber,
            amount: Number(payment.amount).toFixed(2),
          });
        } catch { /* notification failure non-blocking */ }

        // HAA-LOW-STOCK-EMAIL — fire-and-forget merchant alert AFTER
        // the BNPL paid tx commits. Same contract as the synchronous
        // checkout path: never inside the tx, never throws.
        const orderItemRows = await this.db
          .select({ productId: s.orderItems.productId })
          .from(s.orderItems)
          .where(eq(s.orderItems.orderId, payment.orderId));
        const productIds = orderItemRows.map((r) => r.productId);
        void new LowStockNotifier(this.db)
          .fireForUpdatedProducts(storeId, productIds)
          .catch(() => {});
      }

      return { redirectUrl: frontendSuccess, status: 'paid' as const, orderNumber };
    }

    if (confirmResult.status === 'cancelled') {
      await this.db.transaction(async (tx) => {
        const txOrders = new OrdersService(tx);
        await txOrders.changeStatus(storeId, payment.orderId, 'cancelled', actorUserId);
      });
      const [cancelledOrder] = await this.db.select().from(s.orders).where(eq(s.orders.id, payment.orderId)).limit(1);
      return { redirectUrl: frontendCancel, status: 'cancelled' as const, orderNumber: cancelledOrder?.orderNumber ?? '' };
    }

    let restockedProductIds: number[] = [];
    await this.db.transaction(async (tx) => {
      const txOrders = new OrdersService(tx);
      await txOrders.changeStatus(storeId, payment.orderId, 'payment_failed', actorUserId);
      const orderItems = await tx.select({ productId: s.orderItems.productId, variantId: s.orderItems.variantId, quantity: s.orderItems.quantity })
        .from(s.orderItems).where(eq(s.orderItems.orderId, payment.orderId));
      if (orderItems.length > 0) {
        await this.incrementStock(tx, orderItems);
        restockedProductIds = orderItems.map((i) => i.productId);
      }
    });

    // HAA-LOW-STOCK-EMAIL — fire-and-forget dedupe reset AFTER the
    // incrementStock tx commits. Products whose stock is now strictly
    // above the threshold get their last_low_stock_alerted_at cleared
    // so the next dip re-arms the alert.
    if (!this.isDemo && restockedProductIds.length > 0) {
      void new LowStockNotifier(this.db)
        .resetForUpdatedProducts(storeId, restockedProductIds)
        .catch(() => {});
    }

    const [failedOrder] = await this.db.select().from(s.orders).where(eq(s.orders.id, payment.orderId)).limit(1);
    return { redirectUrl: frontendFailure, status: 'failed' as const, orderNumber: failedOrder?.orderNumber ?? '' };
  }

  private async decrementStock(tx: DbTransaction, items: Array<{ product: { id: number; trackInventory: boolean }; variant?: { id: number } | null; item: { productId: number; variantId?: number | null; quantity: number } }>) {
    for (const i of items) {
      if (i.product.trackInventory) {
        const variantId = i.item.variantId ?? i.variant?.id;
        const [updated] = variantId
          ? await tx.update(s.productVariants).set({
              stockQuantity: sql`${s.productVariants.stockQuantity} - ${i.item.quantity}`,
            }).where(and(
              eq(s.productVariants.id, variantId),
              eq(s.productVariants.productId, i.item.productId),
              gte(s.productVariants.stockQuantity, i.item.quantity),
            )).returning()
          : await tx.update(s.products).set({
              stockQuantity: sql`${s.products.stockQuantity} - ${i.item.quantity}`,
            }).where(and(
              eq(s.products.id, i.item.productId),
              gte(s.products.stockQuantity, i.item.quantity),
            )).returning();
        if (!updated) throw new Error('Insufficient stock for product');
      }
    }
  }

  private async incrementStock(tx: DbTransaction, items: Array<{ productId: number; variantId?: number | null; quantity: number }>) {
    for (const i of items) {
      if (i.variantId) {
        await tx.update(s.productVariants).set({
          stockQuantity: sql`${s.productVariants.stockQuantity} + ${i.quantity}`,
        }).where(and(eq(s.productVariants.id, i.variantId), eq(s.productVariants.productId, i.productId)));
      } else {
        await tx.update(s.products).set({
          stockQuantity: sql`${s.products.stockQuantity} + ${i.quantity}`,
        }).where(eq(s.products.id, i.productId));
      }
    }
  }
}

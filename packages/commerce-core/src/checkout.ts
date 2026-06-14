import { eq, and, gte, sql } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import { CartService } from './cart.js';
import { OrdersService } from './orders.js';
import { CouponsService } from './coupons.js';
import { PaymentService, createPaymentProvider, FakePaymentProvider } from '@haa/payment-providers';
import type { PaymentProvider } from '@haa/payment-providers';
import { WalletLedger } from '@haa/wallet-core';
import { WebhookOutboxService } from '@haa/integration-core';
import { AuditLogService } from '@haa/integration-core';
import { ManualShippingProvider } from '@haa/shipping-core';
import { NotificationService } from '@haa/notification-core';
import { CustomersService } from './customers.js';
import { acquireLock, releaseLock } from './redis.js';
import { isDemoStore } from '@haa/shared';

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
    this.isDemo = isDemoStore(store as any) ?? false;
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
      const itemGiftWrap = (item.item as any).giftWrapSelected;
      const itemSendAsGift = (item.item as any).sendAsGift;
      if (itemGiftWrap && !features.giftWrap) throw new Error('Gift wrap feature is not enabled for this store');
      if (itemGiftWrap && !(item.product as any).giftWrapAvailable) throw new Error(`Product "${item.product.name}" does not support gift wrap`);
      if (itemSendAsGift && !features.sendAsGift) throw new Error('Send-as-gift feature is not enabled for this store');
      const giftMsg = (item.item as any).giftMessage;
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
      shippingAddress: (input.shippingAddress ?? null) as any,
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
      metadata: Object.keys(metadata).length > 0 ? metadata as any : null,
    }).returning();

    return { idempotent: false, session, customer };
  }

  async confirm(storeId: number, sessionId: string, actorUserId?: number, ipAddress?: string) {
    const lockKey = `lock:checkout:${sessionId}`;
    const hasLock = process.env.REDIS_URL ? await acquireLock(lockKey) : true;
    if (!hasLock) throw new Error('Checkout is already being processed. Please wait.');

    const [session] = await this.db.select().from(s.checkoutSessions).where(eq(s.checkoutSessions.id, sessionId)).limit(1);
    if (!session) throw new Error('Checkout session not found');

    const isBNPL = session.paymentMethod === 'tabby_installments' || session.paymentMethod === 'tamara_installments';
    if (isBNPL) throw new Error('BNPL payments must use the payment-session endpoint instead of confirm');

    try {
      // Phase 1: Order Creation & Stock Locking (Local Transaction)
      let cartItems: any[] = [];

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

        const orderNumber = await new OrdersService(tx as any).generateOrderNumber(storeId);

        const sessionMeta = (session.metadata ?? {}) as Record<string, unknown>;
        const giftOpts = sessionMeta.giftOptions as { sendAsGift?: boolean; message?: string } | undefined;
        const orderSource = cart.items.some((i: any) => i.item.source === 'haa_marketplace') ? 'haa_marketplace' : 'storefront';
        const platformCommission = cart.items.reduce((sum: number, i: any) => {
          if (i.item.source !== 'haa_marketplace') return sum;
          const rate = Number(i.product.haaMarketplaceCommissionRate ?? 0.05);
          return sum + Math.round(Number(i.item.totalPrice) * rate * 100) / 100;
        }, 0);

        const order = await new OrdersService(tx as any).create({
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
            giftWrapSelected: (i.item as any).giftWrapSelected ?? false,
            giftWrapPrice: (i.item as any).giftWrapPrice ? Number((i.item as any).giftWrapPrice) : undefined,
            sendAsGift: (i.item as any).sendAsGift ?? false,
            giftMessage: (i.item as any).giftMessage ?? undefined,
            source: i.item.source ?? 'storefront',
            platformCommissionRate: i.item.source === 'haa_marketplace' ? Number(i.product.haaMarketplaceCommissionRate ?? 0.05) : undefined,
            platformCommission: i.item.source === 'haa_marketplace'
              ? Math.round(Number(i.item.totalPrice) * Number(i.product.haaMarketplaceCommissionRate ?? 0.05) * 100) / 100
              : undefined,
          })),
          notes: session.notes ?? undefined,
        });

        if (session.couponCode && session.couponDiscount) {
          const couponService = new CouponsService(this.db);
          const couponRecord = await couponService.getByCode(storeId, session.couponCode);
          if (couponRecord) await couponService.incrementUsed(storeId, couponRecord.id);
        }

        await tx.update(s.checkoutSessions).set({ status: 'completed', completedAt: new Date() })
          .where(eq(s.checkoutSessions.id, sessionId));

        const txOrdersService = new OrdersService(tx as any);
        await txOrdersService.changeStatus(storeId, order.id, 'pending_payment', actorUserId);

        // CRITICAL: Lock stock FIRST before payment
        await this.decrementStock(tx as any, cart.items);

        return { order, idempotent: false };
      });

      const { order, idempotent } = orderData;
      if (idempotent) return { order, paymentStatus: order.paymentStatus, idempotent: true };

      // Phase 2: Payment (External API - OUTSIDE Transaction)
      let paymentStatus = 'unpaid';
      let paymentMessage = '';

      if (order.paymentMethod !== 'bank_transfer' && order.paymentMethod !== 'cash_on_delivery') {
        const session = await this.db.select().from(s.checkoutSessions).where(eq(s.checkoutSessions.id, order.checkoutSessionId!)).limit(1);
        
        const payment = await this.paymentProvider.createPaymentIntent(order.id, Number(session[0].total), {
          paymentMethod: order.paymentMethod,
        });
        const confirmResult = await this.paymentProvider.confirmPayment(payment.paymentId);
        
        paymentStatus = confirmResult.status;
        paymentMessage = confirmResult.message ?? '';
      } else if (order.paymentMethod === 'bank_transfer') {
        paymentStatus = 'paid'; // Auto-paid for bank transfer
      } else {
        paymentStatus = 'pending'; // COD: pending until collection at delivery/pickup
      }

      // Phase 3: Finalize (Local Transaction)
      await this.db.transaction(async (tx) => {
        const txOrdersService = new OrdersService(tx as any);

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
              .set({ salesCount: sql`${s.products.salesCount} + ${item.quantity}` })
              .where(eq(s.products.id, item.product.id));
          }

          const txWallet = new WalletLedger(tx as any);
          await txWallet.recordEntry({
            storeId, type: 'sale', direction: 'credit',
            amount: Number(order.total),
            referenceType: 'order', referenceId: order.id,
            description: `Order ${order.orderNumber} payment`,
            status: 'available',
          });

          await txWallet.recordEntry({
            storeId, type: 'platform_fee', direction: 'debit',
            amount: Math.round(Number(order.total) * 0.02 * 100) / 100,
            referenceType: 'order', referenceId: order.id,
            description: `Platform fee (2%) for order ${order.orderNumber}`,
            status: 'available',
          });

          await tx.insert(s.marketingEvents).values({
            storeId, sessionId: `order-${order.orderNumber}`, orderId: order.id,
            eventType: 'payment_succeeded', cartId: session.cartId ?? null,
            path: '/checkout/confirm',
            metadata: { orderNumber: order.orderNumber, paidAmount: Number(order.total) },
          });

          if (!this.isDemo) {
            const txOutbox = new WebhookOutboxService(tx as any);
            await txOutbox.recordEvent('order.created', storeId, 0, { orderId: order.id, orderNumber: order.orderNumber, total: Number(order.total) });
            await txOutbox.recordEvent('order.paid', storeId, 0, { orderId: order.id, orderNumber: order.orderNumber, paidAmount: Number(order.total) });
          }
        } else if (paymentStatus === 'pending' && order.paymentMethod === 'cash_on_delivery') {
          // COD: mark payment as pending, confirm order, no wallet entries until collection
          await txOrdersService.updatePaymentStatus(storeId, order.id, 'pending', Number(order.total));
          await txOrdersService.changeStatus(storeId, order.id, 'confirmed', actorUserId);

          for (const item of cartItems) {
            await tx.update(s.products)
              .set({ salesCount: sql`${s.products.salesCount} + ${item.quantity}` })
              .where(eq(s.products.id, item.product.id));
          }

          await tx.insert(s.marketingEvents).values({
            storeId, sessionId: `order-${order.orderNumber}`, orderId: order.id,
            eventType: 'payment_succeeded', cartId: session.cartId ?? null,
            path: '/checkout/confirm',
            metadata: { orderNumber: order.orderNumber, paymentMethod: 'cash_on_delivery', status: 'pending_collection' },
          });

          if (!this.isDemo) {
            const txOutbox = new WebhookOutboxService(tx as any);
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
          await this.incrementStock(tx as any, cartItems.map(i => ({ productId: i.product.id, variantId: i.variant?.id ?? null, quantity: i.item.quantity }))); 
        }

        const txAudit = new AuditLogService(tx as any);
        await txAudit.record({
          actorUserId: actorUserId ?? null,
          storeId, action: 'order_status_changed',
          entityType: 'order', entityId: order.id,
          newValue: { status: order.paymentStatus, paymentStatus, orderNumber: order.orderNumber },
        });

        await this.cartService.clearCart(storeId, session.cartId);
      });

      // Send notifications (demo stores skip real notifications)
      if (!this.isDemo && (paymentStatus === 'paid' || (paymentStatus === 'pending' && order.paymentMethod === 'cash_on_delivery'))) {
        const isCOD = order.paymentMethod === 'cash_on_delivery';
        try {
          const sessionMeta = (session.metadata ?? {}) as Record<string, unknown>;
          const fType = (sessionMeta.fulfillmentType as string) ?? 'shipping';
          const giftOpt = sessionMeta.giftOptions as { sendAsGift?: boolean; message?: string } | undefined;

          const itemsList = (cartItems as any[]).map((i: any) =>
            `• ${i.product.name} × ${i.quantity} = ${Number(i.item.totalPrice).toFixed(2)} ر.س${i.item.giftWrapSelected ? ' (🎁 تغليف هدية)' : ''}${i.item.sendAsGift ? ' (💌 إرسال كهدية)' : ''}`
          ).join('\n');

          const fulfillmentSummary = fType === 'local_pickup'
            ? '📍 استلام من الفرع'
            : `🚚 شحن إلى: ${session.shippingAddress ? (session.shippingAddress as any).city : ''}`;

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
      return { order: refreshedOrder ?? order, paymentStatus, paymentMessage };

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

          const orderNumber = await new OrdersService(tx as any).generateOrderNumber(storeId);
          const sessionMeta = (session.metadata ?? {}) as Record<string, unknown>;
          const giftOpts = sessionMeta.giftOptions as { sendAsGift?: boolean; message?: string } | undefined;

          const order = await new OrdersService(tx as any).create({
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
            items: cart.items.map((i: any) => ({
              productId: i.product.id,
              variantId: i.variant?.id ?? null,
              name: i.variant ? `${i.product.name} - ${i.variant.name}` : i.product.name,
              sku: i.variant?.sku ?? i.product.sku ?? undefined,
              quantity: i.item.quantity,
              unitPrice: Number(i.item.unitPrice),
              totalPrice: Number(i.item.totalPrice),
              notes: i.item.notes ?? undefined,
              giftWrapSelected: (i.item as any).giftWrapSelected ?? false,
              giftWrapPrice: (i.item as any).giftWrapPrice ? Number((i.item as any).giftWrapPrice) : undefined,
              sendAsGift: (i.item as any).sendAsGift ?? false,
              giftMessage: (i.item as any).giftMessage ?? undefined,
            })),
            notes: session.notes ?? undefined,
            metadata: { isDemoPayment: true },
          });

          if (session.couponCode && session.couponDiscount) {
            const couponService = new CouponsService(this.db);
            const couponRecord = await couponService.getByCode(storeId, session.couponCode);
            if (couponRecord) await couponService.incrementUsed(storeId, couponRecord.id);
          }

          await tx.update(s.checkoutSessions).set({ status: 'completed', completedAt: new Date() })
            .where(eq(s.checkoutSessions.id, sessionId));

          const txOrders = new OrdersService(tx as any);
          await txOrders.changeStatus(storeId, order.id, 'confirmed', actorUserId);
          await this.decrementStock(tx as any, cart.items);

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
      const provider = createPaymentProvider(providerCode as any);
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

        const orderNumber = await new OrdersService(tx as any).generateOrderNumber(storeId);
        const sessionMeta = (session.metadata ?? {}) as Record<string, unknown>;
        const giftOpts = sessionMeta.giftOptions as { sendAsGift?: boolean; message?: string } | undefined;

        const order = await new OrdersService(tx as any).create({
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
          items: cart.items.map((i: any) => ({
            productId: i.product.id,
            variantId: i.variant?.id ?? null,
            name: i.variant ? `${i.product.name} - ${i.variant.name}` : i.product.name,
            sku: i.variant?.sku ?? i.product.sku ?? undefined,
            quantity: i.item.quantity,
            unitPrice: Number(i.item.unitPrice),
            totalPrice: Number(i.item.totalPrice),
            notes: i.item.notes ?? undefined,
            giftWrapSelected: (i.item as any).giftWrapSelected ?? false,
            giftWrapPrice: (i.item as any).giftWrapPrice ? Number((i.item as any).giftWrapPrice) : undefined,
            sendAsGift: (i.item as any).sendAsGift ?? false,
            giftMessage: (i.item as any).giftMessage ?? undefined,
          })),
          notes: session.notes ?? undefined,
        });

        if (session.couponCode && session.couponDiscount) {
          const couponService = new CouponsService(this.db);
          const couponRecord = await couponService.getByCode(storeId, session.couponCode);
          if (couponRecord) await couponService.incrementUsed(storeId, couponRecord.id);
        }

        await tx.update(s.checkoutSessions).set({ status: 'completed', completedAt: new Date() })
          .where(eq(s.checkoutSessions.id, sessionId));

        const txOrders = new OrdersService(tx as any);
        await txOrders.changeStatus(storeId, order.id, 'pending_payment', actorUserId);
        await this.decrementStock(tx as any, cart.items);

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
    const provider = createPaymentProvider(providerCode as any);

    const confirmResult = await provider.confirmPayment(payment.id);
    const meta = (payment.metadata ?? {}) as Record<string, string>;
    const frontendSuccess = meta.frontendSuccessUrl;
    const frontendCancel = meta.frontendCancelUrl;
    const frontendFailure = meta.frontendFailureUrl ?? frontendCancel;

    if (confirmResult.success && (confirmResult.status === 'paid' || confirmResult.status === 'authorized')) {
      await this.db.transaction(async (tx) => {
        const txOrders = new OrdersService(tx as any);
        await txOrders.updatePaymentStatus(storeId, payment.orderId, 'paid', Number(payment.amount));
        await txOrders.changeStatus(storeId, payment.orderId, 'confirmed', actorUserId);

        const orderItemRows = await tx.select().from(s.orderItems).where(eq(s.orderItems.orderId, payment.orderId));
        for (const item of orderItemRows) {
          await tx.update(s.products)
            .set({ salesCount: sql`${s.products.salesCount} + ${item.quantity}` })
            .where(eq(s.products.id, item.productId));
        }

        const txWallet = new WalletLedger(tx as any);
        await txWallet.recordEntry({
          storeId, type: 'sale', direction: 'credit',
          amount: Number(payment.amount),
          referenceType: 'order', referenceId: payment.orderId,
          description: `Order payment (BNPL)`,
          status: 'available',
        });
        await txWallet.recordEntry({
          storeId, type: 'platform_fee', direction: 'debit',
          amount: Math.round(Number(payment.amount) * 0.02 * 100) / 100,
          referenceType: 'order', referenceId: payment.orderId,
          description: `Platform fee (2%)`,
          status: 'available',
        });

        if (!this.isDemo) {
          const txOutbox = new WebhookOutboxService(tx as any);
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
      }

      return { redirectUrl: frontendSuccess, status: 'paid' as const, orderNumber };
    }

    if (confirmResult.status === 'cancelled') {
      await this.db.transaction(async (tx) => {
        const txOrders = new OrdersService(tx as any);
        await txOrders.changeStatus(storeId, payment.orderId, 'cancelled', actorUserId);
      });
      const [cancelledOrder] = await this.db.select().from(s.orders).where(eq(s.orders.id, payment.orderId)).limit(1);
      return { redirectUrl: frontendCancel, status: 'cancelled' as const, orderNumber: cancelledOrder?.orderNumber ?? '' };
    }

    await this.db.transaction(async (tx) => {
      const txOrders = new OrdersService(tx as any);
      await txOrders.changeStatus(storeId, payment.orderId, 'payment_failed', actorUserId);
      const orderItems = await tx.select({ productId: s.orderItems.productId, variantId: s.orderItems.variantId, quantity: s.orderItems.quantity })
        .from(s.orderItems).where(eq(s.orderItems.orderId, payment.orderId));
      if (orderItems.length > 0) {
        await this.incrementStock(tx as any, orderItems);
      }
    });

    const [failedOrder] = await this.db.select().from(s.orders).where(eq(s.orders.id, payment.orderId)).limit(1);
    return { redirectUrl: frontendFailure, status: 'failed' as const, orderNumber: failedOrder?.orderNumber ?? '' };
  }

  private async decrementStock(tx: any, items: Array<{ product: { id: number; trackInventory: boolean }; variant?: { id: number } | null; item: { productId: number; variantId?: number | null; quantity: number } }>) {
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

  private async incrementStock(tx: any, items: Array<{ productId: number; variantId?: number | null; quantity: number }>) {
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

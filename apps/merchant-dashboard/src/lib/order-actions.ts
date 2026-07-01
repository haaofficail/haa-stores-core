export interface OrderAction {
  key: string;
  label: string;
  icon: string;
  targetStatus: string;
  /** Set on preparation-workflow actions; absent on order-status actions. */
  targetPreparationStatus?: 'not_started' | 'preparing' | 'prepared' | 'packed';
  isDestructive: boolean;
  needsConfirm: boolean;
  section: 'primary' | 'payment' | 'shipping' | 'pickup' | 'gift' | 'documents' | 'danger' | 'preparation';
  description?: string;
  disabledReason?: string;
}

export interface OrderActions {
  actions: OrderAction[];
  primaryAction: OrderAction | null;
  hasGift: boolean;
  isPickup: boolean;
  isCOD: boolean;
  isBankTransfer: boolean;
}

const getStatusDescription = (key: string): string | undefined => {
  switch (key) {
    case 'confirm': return 'تأكيد استلام الدفع ونقل الطلب إلى قيد التجهيز';
    case 'process': return 'بدء تجهيز الطلب';
    case 'ready_to_ship': return 'تجهيز الطلب للشحن';
    case 'hand_to_carrier': return 'تسليم الطلب لشركة الشحن';
    case 'deliver': return 'تأكيد توصيل الطلب للعميل';
    case 'complete': return 'إكمال الطلب';
    case 'ready_for_pickup': return 'تجهيز الطلب للاستلام من الفرع';
    case 'confirm_pickup': return 'تأكيد استلام العميل للطلب';
    case 'collect_payment': return 'تسجيل تحصيل المبلغ دون تغيير حالة الطلب';
    case 'confirm_bank_transfer': return 'تأكيد استلام التحويل البنكي في حساب المتجر';
    default: return undefined;
  }
};


const TERMINAL = new Set([
  'completed', 'cancelled', 'refunded',
  'partially_refunded', 'returned_to_sender',
]);

// Providers whose refund UI is intentionally hidden until live
// implementation lands. W4 (Autopilot Phase 3) — DECISION-OS-011 +
// GEIDEA_READINESS.md: GeideaPaymentProvider.refundPayment is still
// a stub returning success:false, and GEIDEA_CAPABILITIES.supportsRefunds
// is false. Showing the merchant a refund button that does nothing is
// worse than not showing it at all. Remove from this set ONLY when
// the provider's refund pipeline is verified end-to-end.
const PROVIDERS_WITHOUT_REFUND_UI = new Set(['geidea']);

function orderProviderCode(order: { paymentMethod?: string; paymentProvider?: string; provider?: string } | null | undefined): string | undefined {
  // Field naming varies by call site:
  //  - `paymentMethod` is the storefront-facing label (e.g. 'geidea_card', 'cash_on_delivery')
  //  - `paymentProvider` / `provider` is the canonical provider code in payments table
  // We accept any of the three, lower-case, and strip the "_card" / "_pay" suffix
  // so 'geidea_card' resolves to 'geidea'.
  const raw = (order?.paymentProvider ?? order?.provider ?? order?.paymentMethod ?? '').toString().toLowerCase();
  return raw.replace(/_(card|pay|gateway)$/, '') || undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderActions(order: any): OrderActions {
  const status = order?.status;
  const isPickup = order?.fulfillmentType === 'local_pickup';
  const isCOD = order?.paymentMethod === 'cash_on_delivery';
  const isBankTransfer = order?.paymentMethod === 'bank_transfer';
  const providerCode = orderProviderCode(order);
  const refundUiAllowed = !providerCode || !PROVIDERS_WITHOUT_REFUND_UI.has(providerCode);
  const hasGift = !!(
    order?.sendAsGift ||
    order?.giftMessage ||
    order?.giftOptions?.sendAsGift ||
    order?.giftOptions?.message ||
    order?.giftOptions?.recipientName
  );

  const hasShipment = !!(order?.shipment?.id);
  const hasLabel = !!(order?.shipment?.labelUrl || order?.labelUrl);
  const hasTracking = !!(order?.shipment?.trackingNumber);
  const hasTrackingUrl = !!(order?.shipment?.trackingUrl);

  const actions: OrderAction[] = [];

  if (!status || TERMINAL.has(status)) {
    return { actions, primaryAction: null, hasGift, isPickup, isCOD, isBankTransfer };
  }

  const pushPrimary = (target: string, key: string, label: string, icon: string) => {
    actions.push({
      key, label, icon, targetStatus: target,
      isDestructive: false, needsConfirm: false,
      section: 'primary',
    });
  };

  const pushDanger = (target: string, key: string, label: string) => {
    actions.push({
      key, label, icon: 'Ban', targetStatus: target,
      isDestructive: true, needsConfirm: true,
      section: 'danger',
    });
  };

  if (isPickup) {
    if (status === 'pending_payment') {
      pushPrimary('confirmed', 'confirm', 'تأكيد الدفع', 'Check');
      pushDanger('cancelled', 'cancel', 'إلغاء');
    } else if (status === 'confirmed') {
      pushPrimary('processing', 'process', 'بدء التجهيز', 'Package');
      pushDanger('cancelled', 'cancel', 'إلغاء');
    } else if (status === 'processing') {
      pushPrimary('ready_for_pickup', 'ready_for_pickup', 'جاهز للاستلام', 'Check');
      pushDanger('cancelled', 'cancel', 'إلغاء');
    } else if (status === 'ready_for_pickup') {
      pushPrimary('picked_up', 'confirm_pickup', 'تأكيد الاستلام', 'CheckCircle2');
      pushDanger('cancelled', 'cancel', 'إلغاء');
    }
  } else {
    // Delivery flow
    if (status === 'pending_payment') {
      pushPrimary('confirmed', 'confirm', 'تأكيد الدفع', 'Check');
      pushDanger('cancelled', 'cancel', 'إلغاء');
    } else if (status === 'confirmed') {
      pushPrimary('processing', 'process', 'بدء التجهيز', 'Package');
      pushDanger('cancelled', 'cancel', 'إلغاء');
    } else if (status === 'processing') {
      // Preparation workflow actions (HAA-PREP-001).
      // These call PATCH /:orderId/preparation-status, not the order-status endpoint.
      const prepStatus = (order?.preparationStatus ?? 'not_started') as string;
      if (prepStatus === 'not_started') {
        actions.push({
          key: 'prep_start', label: 'بدء التجهيز', icon: 'PackageOpen',
          targetStatus: status, targetPreparationStatus: 'preparing',
          isDestructive: false, needsConfirm: false, section: 'preparation',
          description: 'الانتقال إلى مرحلة تجهيز الطلب',
        });
      } else if (prepStatus === 'preparing') {
        actions.push({
          key: 'prep_done', label: 'تم التجهيز', icon: 'PackageCheck',
          targetStatus: status, targetPreparationStatus: 'prepared',
          isDestructive: false, needsConfirm: false, section: 'preparation',
          description: 'تأكيد انتهاء تجهيز الطلب',
        });
      } else if (prepStatus === 'prepared') {
        actions.push({
          key: 'prep_packed', label: 'تم التغليف', icon: 'Package',
          targetStatus: status, targetPreparationStatus: 'packed',
          isDestructive: false, needsConfirm: false, section: 'preparation',
          description: 'تأكيد تغليف الطلب وجاهزيته للشحن',
        });
      }
      const isPacked = prepStatus === 'packed';
      const readyAction: OrderAction = {
        key: 'ready_to_ship', label: 'جاهز للشحن', icon: 'Package',
        targetStatus: 'ready_to_ship', isDestructive: false, needsConfirm: false,
        section: 'primary',
        disabledReason: isPacked ? undefined : 'أكمل تغليف الطلب أولاً (preparationStatus يجب أن يكون packed)',
      };
      actions.push(readyAction);
      pushDanger('cancelled', 'cancel', 'إلغاء');
    } else if (status === 'ready_to_ship') {
      if (!hasShipment) {
        const paymentStatus = order?.paymentStatus;
        // Mirror backend guard: COD is only ok when paymentStatus=pending (confirmed for collection).
        // paymentStatus=unpaid on a COD order means the merchant has not confirmed COD intent yet.
        const codConfirmed = isCOD && paymentStatus === 'pending';
        const paymentOk = paymentStatus === 'paid' || codConfirmed;
        const addr = order?.shippingAddress as Record<string, unknown> | null | undefined;
        const addressOk = !!(addr?.city && (addr?.street || addr?.addressLine1 || addr?.address) && (addr?.country || addr?.countryCode));
        const prepStatus = (order?.preparationStatus ?? 'not_started') as string;
        const isPacked = prepStatus === 'packed';

        let labelDisabledReason: string | undefined;
        if (!paymentOk) {
          if (isCOD) labelDisabledReason = 'الدفع عند الاستلام غير مؤكد';
          else if (isBankTransfer) labelDisabledReason = 'لم يتم تأكيد استلام التحويل البنكي بعد';
          else labelDisabledReason = 'الطلب غير مدفوع';
        } else if (!isPacked) {
          labelDisabledReason = 'لا يمكن إنشاء بوليصة لأن الطلب لم يتم تغليفه بعد';
        } else if (!addressOk) {
          labelDisabledReason = 'عنوان الشحن غير مكتمل';
        }

        actions.push({
          key: 'create_label', label: 'إنشاء بوليصة', icon: 'FileText',
          targetStatus: 'ready_to_ship', isDestructive: false, needsConfirm: false,
          section: 'shipping',
          disabledReason: labelDisabledReason,
        });
      } else {
        if (hasLabel) {
          actions.push({
            key: 'print_label', label: 'طباعة البوليصة', icon: 'Printer',
            targetStatus: 'ready_to_ship', isDestructive: false, needsConfirm: false,
            section: 'shipping',
          });
          actions.push({
            key: 'download_pdf', label: 'تحميل PDF', icon: 'FileText',
            targetStatus: 'ready_to_ship', isDestructive: false, needsConfirm: false,
            section: 'shipping',
          });
        }
        if (hasTracking) {
          actions.push({
            key: 'copy_tracking', label: 'نسخ رقم التتبع', icon: 'Copy',
            targetStatus: 'ready_to_ship', isDestructive: false, needsConfirm: false,
            section: 'shipping',
          });
        }
        if (hasTrackingUrl) {
          actions.push({
            key: 'open_tracking', label: 'فتح رابط التتبع', icon: 'ExternalLink',
            targetStatus: 'ready_to_ship', isDestructive: false, needsConfirm: false,
            section: 'shipping',
          });
        }
        if (hasLabel) {
          pushPrimary('shipped', 'hand_to_carrier', 'تسليم لشركة الشحن', 'Truck');
        }
      }
      pushDanger('cancelled', 'cancel', 'إلغاء');
    } else if (status === 'shipped') {
      // `resend_tracking` removed (audit P0 #10, 2026-06-25): the
      // handler showed a success toast without calling any API. There
      // is no backend route for re-sending the tracking notification
      // today. If this is wanted, wire it to ordersApi.* and the
      // notification service first, then add the action back.
      if (hasTrackingUrl) {
        actions.push({
          key: 'open_tracking', label: 'فتح رابط التتبع', icon: 'ExternalLink',
          targetStatus: 'shipped', isDestructive: false, needsConfirm: false,
          section: 'shipping',
        });
      }
      if (hasTracking) {
        actions.push({
          key: 'copy_tracking', label: 'نسخ رقم التتبع', icon: 'Copy',
          targetStatus: 'shipped', isDestructive: false, needsConfirm: false,
          section: 'shipping',
        });
      }
      if (hasLabel) {
        actions.push({
          key: 'print_label', label: 'طباعة البوليصة', icon: 'Printer',
          targetStatus: 'shipped', isDestructive: false, needsConfirm: false,
          section: 'shipping',
        });
      }
      pushPrimary('delivered', 'deliver', 'توصيل', 'CheckCircle2');
      pushDanger('returned', 'return', 'إرجاع');
    } else if (status === 'delivered') {
      pushPrimary('completed', 'complete', 'مكتمل', 'CheckCircle2');
      pushDanger('returned', 'return', 'إرجاع');
    }
  }

  if (status === 'returned' && refundUiAllowed) {
    pushDanger('refunded', 'refund', 'استرجاع');
  }

  if (hasGift) {
    if (order?.giftOptions?.message) {
      actions.push({
        key: 'view_gift_message', label: 'عرض رسالة الهدية', icon: 'Heart',
        targetStatus: status, isDestructive: false, needsConfirm: false,
        section: 'gift',
      });
      actions.push({
        key: 'print_gift_message', label: 'طباعة رسالة الهدية', icon: 'Printer',
        targetStatus: status, isDestructive: false, needsConfirm: false,
        section: 'gift',
      });
      actions.push({
        key: 'copy_gift_message', label: 'نسخ رسالة الهدية', icon: 'Copy',
        targetStatus: status, isDestructive: false, needsConfirm: false,
        section: 'gift',
      });
    }
    actions.push({
      key: 'notify_buyer', label: 'إرسال إشعار للمشتري', icon: 'Bell',
      targetStatus: status, isDestructive: false, needsConfirm: false,
      section: 'gift',
    });
    if (order?.giftOptions?.recipientName || order?.giftOptions?.recipientPhone) {
      actions.push({
        key: 'notify_recipient', label: 'إرسال إشعار للمستلم', icon: 'Bell',
        targetStatus: status, isDestructive: false, needsConfirm: false,
        section: 'gift',
      });
    }
  }

  // COD payment actions
  if (isCOD) {
    if (status === 'delivered' && !isPickup) {
      actions.push({
        key: 'collect_payment', label: 'تسجيل تحصيل المبلغ', icon: 'Wallet',
        targetStatus: 'delivered', isDestructive: false, needsConfirm: true,
        section: 'payment',
      });
      actions.push({
        key: 'collection_failed', label: 'تسجيل فشل التحصيل', icon: 'AlertTriangle',
        targetStatus: 'delivered', isDestructive: false, needsConfirm: false,
        section: 'payment',
      });
      actions.push({
        key: 'customer_refused', label: 'رفض العميل الدفع', icon: 'XCircle',
        targetStatus: 'delivered', isDestructive: false, needsConfirm: true,
        section: 'payment',
      });
    }
    // Pickup COD: collection happens after customer picks up
    if (status === 'picked_up' && isPickup) {
      actions.push({
        key: 'collect_payment', label: 'تسجيل تحصيل المبلغ', icon: 'Wallet',
        targetStatus: 'picked_up', isDestructive: false, needsConfirm: true,
        section: 'payment',
      });
    }
  }

  // Bank transfer payment actions (P0-1 fix: no longer auto-paid — the
  // merchant must confirm the transfer landed before shipping is allowed).
  if (isBankTransfer && order?.paymentStatus === 'pending') {
    actions.push({
      key: 'confirm_bank_transfer', label: 'تأكيد استلام التحويل', icon: 'Wallet',
      targetStatus: status, isDestructive: false, needsConfirm: true,
      section: 'payment',
    });
    actions.push({
      key: 'bank_transfer_failed', label: 'لم يصل التحويل', icon: 'AlertTriangle',
      targetStatus: status, isDestructive: false, needsConfirm: true,
      section: 'payment',
    });
  }

  // Attach descriptions to primary and payment actions
  for (const action of actions) {
    if (action.section === 'primary' || action.key === 'collect_payment' || action.key === 'confirm_bank_transfer') {
      action.description = getStatusDescription(action.key);
    }
  }

  // Compute the single primary next action
  const primaryAction: OrderAction | null = (() => {
    const primary = actions.find(a => a.section === 'primary');
    if (primary) return primary;
    const collect = actions.find(a => a.key === 'collect_payment' || a.key === 'confirm_bank_transfer');
    if (collect) return collect;
    return null;
  })();

  return { actions, primaryAction, hasGift, isPickup, isCOD, isBankTransfer };
}

export interface OrderAction {
  key: string;
  label: string;
  icon: string;
  targetStatus: string;
  isDestructive: boolean;
  needsConfirm: boolean;
  section: 'primary' | 'payment' | 'shipping' | 'pickup' | 'gift' | 'documents' | 'danger';
  description?: string;
  disabledReason?: string;
}

export interface OrderActions {
  actions: OrderAction[];
  primaryAction: OrderAction | null;
  hasGift: boolean;
  isPickup: boolean;
  isCOD: boolean;
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
    default: return undefined;
  }
};


const TERMINAL = new Set([
  'completed', 'cancelled', 'refunded',
  'partially_refunded', 'returned_to_sender',
]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getOrderActions(order: any): OrderActions {
  const status = order?.status;
  const isPickup = order?.fulfillmentType === 'local_pickup';
  const isCOD = order?.paymentMethod === 'cash_on_delivery';
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
    return { actions, primaryAction: null, hasGift, isPickup, isCOD };
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
      pushPrimary('ready_to_ship', 'ready_to_ship', 'جاهز للشحن', 'Package');
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
        // NOTE: fulfillmentStatus is intentionally NOT checked here.
        // In this codebase fulfillmentStatus becomes 'fulfilled' only after an order is
        // completed/picked_up (post-delivery). A ready_to_ship order always has
        // fulfillmentStatus = 'unfulfilled'. The ORDER STATUS is the preparation signal.
        // TODO: add preparationStatus field (prepared/packed) and gate here when implemented.

        let labelDisabledReason: string | undefined;
        if (!paymentOk) {
          labelDisabledReason = isCOD
            ? 'الدفع عند الاستلام غير مؤكد'
            : 'الطلب غير مدفوع';
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
      actions.push({
        key: 'resend_tracking', label: 'إعادة إرسال بيانات الشحن', icon: 'RefreshCw',
        targetStatus: 'shipped', isDestructive: false, needsConfirm: false,
        section: 'shipping',
      });
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

  if (status === 'returned') {
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

  // Attach descriptions to primary and payment actions
  for (const action of actions) {
    if (action.section === 'primary' || action.key === 'collect_payment') {
      action.description = getStatusDescription(action.key);
    }
  }

  // Compute the single primary next action
  const primaryAction: OrderAction | null = (() => {
    const primary = actions.find(a => a.section === 'primary');
    if (primary) return primary;
    const collect = actions.find(a => a.key === 'collect_payment');
    if (collect) return collect;
    return null;
  })();

  return { actions, primaryAction, hasGift, isPickup, isCOD };
}

/**
 * shipping-rules — shipping setup + delivery + returns signals.
 */
import { Package, Truck } from 'lucide-react';
import type { RuleContext, SmartAlert } from './types.js';

export function shippingRules(ctx: RuleContext): SmartAlert[] {
  const {
    summary,
    hasProducts,
    totalOrders,
    returnsList,
    lateShipments,
    t,
    navigate,
  } = ctx;
  const out: SmartAlert[] = [];

  if (
    (summary?.activeShippingMethods ?? 0) === 0 &&
    hasProducts &&
    totalOrders === 0
  )
    out.push({
      id: 'no-shipping',
      type: 'warning',
      priority: 2,
      icon: Package,
      title: t('dashboard.alertNoShipping', 'لم يتم إعداد الشحن'),
      description: t(
        'dashboard.alertNoShippingDesc',
        'أضف طرق شحن ليتمكن العملاء من الشراء',
      ),
      action: {
        label: t('common.setup', 'الإعداد'),
        onClick: () => navigate('/settings/shipping'),
      },
    });

  if (returnsList.length > 0) {
    const returnRatio = returnsList.length / Math.max(totalOrders, 1);
    if (returnRatio > 0.2)
      out.push({
        id: 'high-returns',
        type: 'warning',
        priority: 2,
        icon: Package,
        title: t('dashboard.alertReturns', 'نسبة مرتجعات مرتفعة'),
        description: t(
          'dashboard.alertReturnsDesc',
          '{{pct}}% من الطلبات مرتجعة - راجع الأسباب',
        ).replace('{{pct}}', String(Math.round(returnRatio * 100))),
        action: {
          label: t('orders.viewOrders', 'عرض'),
          onClick: () => navigate('/orders'),
        },
      });
  }

  if (lateShipments.length > 0)
    out.push({
      id: 'late-shipment',
      type: 'danger',
      priority: 2,
      icon: Truck,
      title: t('dashboard.alertLateShipment', 'طلبات متأخرة عن التسليم'),
      description: t(
        'dashboard.alertLateShipmentDesc',
        '{{count}} طلبات تجاوزت موعد التسليم',
      ).replace('{{count}}', String(lateShipments.length)),
      action: {
        label: t('orders.viewOrders', 'عرض'),
        onClick: () => navigate('/orders'),
      },
    });

  return out;
}

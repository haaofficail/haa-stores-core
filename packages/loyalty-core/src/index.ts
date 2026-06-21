import Decimal from 'decimal.js';

/**
 * @haa/loyalty-core — منطق نقاط الولاء النقي (QA Loyalty).
 *
 * دوال خالصة بلا أي وصول لقاعدة بيانات: الكسب، الاستبدال، والانتهاء.
 * الواجهة (الخدمة + المسارات) تستدعي هذه الدوال وتتولّى الـ ledger.
 * كل الحسابات النقدية بـ decimal.js لتفادي أخطاء الفاصلة العائمة.
 */

export interface LoyaltyRules {
  /** نقاط مكتسبة لكل وحدة عملة (ر.س) — مثال 1 = نقطة لكل ريال */
  earnRatePerCurrency: number;
  /** قيمة النقطة عند الاستبدال (ر.س لكل نقطة) — مثال 0.01 = 100 نقطة = ريال */
  redeemValuePerPoint: number;
  /** أقل عدد نقاط يسمح باستبداله */
  minRedeemPoints: number;
  /** أقصى نسبة من إجمالي الطلب يمكن تغطيتها بالنقاط (0..1) */
  maxRedeemPercent: number;
  /** انتهاء النقاط بعد كم شهر من الكسب (0 = لا تنتهي) */
  pointsExpiryMonths: number;
  /** هل تُحتسب الضريبة ضمن المبلغ المؤهّل للكسب */
  earnOnTax: boolean;
  /** هل يُحتسب الشحن ضمن المبلغ المؤهّل للكسب */
  earnOnShipping: boolean;
  /** أقل إجمالي طلب ليكسب نقاطاً (0 = لا حدّ) */
  minOrderForEarn: number;
  /** هل برنامج الولاء مفعّل */
  enabled: boolean;
}

export const DEFAULT_LOYALTY_RULES: LoyaltyRules = {
  earnRatePerCurrency: 1,
  redeemValuePerPoint: 0.01,
  minRedeemPoints: 100,
  maxRedeemPercent: 0.5,
  pointsExpiryMonths: 12,
  earnOnTax: false,
  earnOnShipping: false,
  minOrderForEarn: 0,
  enabled: false,
};

export interface OrderAmounts {
  subtotal: number;
  tax?: number;
  shipping?: number;
}

function d(n: number | string): Decimal {
  const x = new Decimal(n);
  return x.isFinite() ? x : new Decimal(0);
}

/**
 * احسب النقاط المكتسبة من طلب. النقاط أعداد صحيحة (تُقرّب للأسفل).
 * يُستثنى الضريبة/الشحن ما لم تسمح القواعد. يُحترم حدّ أدنى للطلب.
 */
export function computeEarnedPoints(rules: LoyaltyRules, amounts: OrderAmounts): number {
  if (!rules.enabled || rules.earnRatePerCurrency <= 0) return 0;

  const subtotal = d(amounts.subtotal);
  const tax = d(amounts.tax ?? 0);
  const shipping = d(amounts.shipping ?? 0);

  const orderTotal = subtotal.plus(tax).plus(shipping);
  if (rules.minOrderForEarn > 0 && orderTotal.lessThan(rules.minOrderForEarn)) return 0;

  let eligible = subtotal;
  if (rules.earnOnTax) eligible = eligible.plus(tax);
  if (rules.earnOnShipping) eligible = eligible.plus(shipping);
  if (eligible.lessThanOrEqualTo(0)) return 0;

  return eligible.times(rules.earnRatePerCurrency).floor().toNumber();
}

/** القيمة النقدية لعدد نقاط (ر.س)، مُقرّبة لهللتين */
export function pointsToValue(rules: LoyaltyRules, points: number): number {
  if (points <= 0 || rules.redeemValuePerPoint <= 0) return 0;
  return d(points).times(rules.redeemValuePerPoint).toDecimalPlaces(2, Decimal.ROUND_DOWN).toNumber();
}

/** أقل عدد نقاط يكفي لتغطية قيمة نقدية معطاة */
export function valueToPoints(rules: LoyaltyRules, value: number): number {
  if (value <= 0 || rules.redeemValuePerPoint <= 0) return 0;
  return d(value).dividedBy(rules.redeemValuePerPoint).ceil().toNumber();
}

export interface RedeemRequest {
  /** النقاط التي يريد العميل استبدالها */
  requestedPoints: number;
  /** رصيد النقاط المتاح للعميل */
  availablePoints: number;
  /** إجمالي الطلب القابل للخصم */
  orderTotal: number;
}

export interface RedeemResult {
  /** النقاط التي ستُخصم فعلاً (بعد كل القيود) */
  points: number;
  /** القيمة النقدية المخصومة من الطلب (ر.س) */
  value: number;
  /** سبب الرفض إن لم يُسمح بأي استبدال */
  reason?: 'disabled' | 'below_min' | 'insufficient_balance' | 'no_redeemable_value';
}

/**
 * احسب الاستبدال المسموح مع تطبيق كل القيود بترتيب آمن:
 * الرصيد المتاح → سقف نسبة الطلب → ثم تحقّق الحدّ الأدنى أخيراً.
 * لا يُخصم أبداً أكثر من الرصيد ولا أكثر من سقف النسبة من الطلب.
 */
export function computeRedemption(rules: LoyaltyRules, req: RedeemRequest): RedeemResult {
  if (!rules.enabled || rules.redeemValuePerPoint <= 0) {
    return { points: 0, value: 0, reason: 'disabled' };
  }

  const requested = Math.max(0, Math.floor(req.requestedPoints));
  const available = Math.max(0, Math.floor(req.availablePoints));

  if (requested < rules.minRedeemPoints) {
    return { points: 0, value: 0, reason: 'below_min' };
  }
  if (available < rules.minRedeemPoints) {
    return { points: 0, value: 0, reason: 'insufficient_balance' };
  }

  // 1) لا تتجاوز الرصيد المتاح
  let points = Math.min(requested, available);

  // 2) لا تتجاوز سقف النسبة من إجمالي الطلب
  const maxValue = d(req.orderTotal).times(Math.max(0, Math.min(1, rules.maxRedeemPercent)));
  const maxPointsByOrder = maxValue.dividedBy(rules.redeemValuePerPoint).floor().toNumber();
  points = Math.min(points, maxPointsByOrder);

  if (points < rules.minRedeemPoints) {
    return { points: 0, value: 0, reason: 'below_min' };
  }

  const value = pointsToValue(rules, points);
  if (value <= 0) {
    return { points: 0, value: 0, reason: 'no_redeemable_value' };
  }

  return { points, value };
}

export interface PointsLot {
  points: number;
  earnedAt: Date;
}

export interface ExpiryResult {
  expiredPoints: number;
  activePoints: number;
}

/**
 * احسب النقاط المنتهية مقابل النشطة من دفعات الكسب (lots) بتاريخ مرجعي.
 * pointsExpiryMonths=0 يعني لا انتهاء. لا يطرح النقاط المستبدلة سابقاً —
 * تمرّر الـ lots المتبقية فقط (الخدمة تتولّى FIFO الخصم).
 */
export function computeExpiry(rules: LoyaltyRules, lots: PointsLot[], asOf: Date): ExpiryResult {
  if (rules.pointsExpiryMonths <= 0) {
    const total = lots.reduce((s, l) => s + Math.max(0, l.points), 0);
    return { expiredPoints: 0, activePoints: total };
  }

  let expired = 0;
  let active = 0;
  for (const lot of lots) {
    const pts = Math.max(0, lot.points);
    const expiresAt = new Date(lot.earnedAt);
    expiresAt.setMonth(expiresAt.getMonth() + rules.pointsExpiryMonths);
    if (expiresAt.getTime() <= asOf.getTime()) expired += pts;
    else active += pts;
  }
  return { expiredPoints: expired, activePoints: active };
}

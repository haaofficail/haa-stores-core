export const MARKETING_EVENT_TYPES = [
  'page_view',
  'view_product',
  'search',
  'add_to_cart',
  'remove_from_cart',
  'begin_checkout',
  'purchase',
  'order_created',
  'payment_succeeded',
  'payment_failed',
  'order_cancelled',
  'order_refunded',
  'coupon_applied',
  'campaign_click',
  'whatsapp_click',
  'product_share',
] as const;

export type MarketingEventType = typeof MARKETING_EVENT_TYPES[number];

export interface MarketingEventPayload {
  eventType: MarketingEventType;
  sessionId: string;
  customerId?: number;
  productId?: number;
  cartId?: string;
  orderId?: number;
  path?: string;
  referrer?: string;
  deviceType?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  metadata?: Record<string, unknown>;
}

export interface MarketingSession {
  sessionId: string;
  storeId: number;
  customerId?: number | null;
  cartId?: string | null;
  orderId?: number | null;
  firstSeenAt?: string;
  lastSeenAt?: string;
}

export interface ProductPerformanceDaily {
  productId: number;
  productName?: string;
  views: number;
  addToCarts: number;
  purchases: number;
  revenue: string;
}

export interface OverviewMetrics {
  visits: number;
  productViews: number;
  addToCarts: number;
  checkouts: number;
  purchases: number;
  revenue: string;
}

export interface ProductMetrics extends ProductPerformanceDaily {
  conversionRate?: number;
}

export interface SourceMetrics {
  source: string;
  visits: number;
  purchases: number;
  revenue: string;
}

export interface CampaignMetrics extends SourceMetrics {
  campaign: string;
}

export interface GrowthInsight {
  id: string;
  type: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface HeartbeatPayload {
  sessionId: string;
  currentPath: string;
  currentPageType: string;
  currentProductId?: number;
  cartId?: string;
  currentCartValue?: number;
  isInCheckout: boolean;
  deviceType?: string;
  os?: string;
  browser?: string;
  screenSize?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  countryCode?: string;
  countryName?: string;
  regionName?: string;
  cityName?: string;
  geoAccuracy?: string;
}

export interface LiveOverview {
  onlineVisitors: number;
  activeProductViewers: number;
  activeCarts: number;
  activeCheckouts: number;
  currentCartValueTotal: string;
  ordersLast30Min: number;
  paidOrdersLast30Min: number;
  revenueLast30Min: string;
  paymentFailuresLast30Min: number;
  updatedAt: string;
}

export interface LivePageInfo {
  path: string;
  pageType: string;
  visitorCount: number;
}

export interface LivePages {
  activePages: LivePageInfo[];
  activeProductPages: LivePageInfo[];
  topViewedProductsNow: { productId: number; productName: string; viewers: number }[];
}

export interface LiveDevices {
  visitorsByDeviceType: { label: string; count: number }[];
  visitorsByOs: { label: string; count: number }[];
  visitorsByBrowser: { label: string; count: number }[];
  visitorsByScreenSize: { label: string; count: number }[];
}

export interface LiveSources {
  visitorsByUtmSource: { label: string; count: number }[];
  visitorsByUtmCampaign: { label: string; count: number }[];
  visitorsByReferrer: { label: string; count: number }[];
}

export interface LiveFunnel {
  onlineVisitors: number;
  productViewers: number;
  cartUsers: number;
  checkoutUsers: number;
  ordersLast30Min: number;
  paidOrdersLast30Min: number;
  dropOffSignals: { stage: string; count: number }[];
}

export interface LiveAlert {
  type: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  metric: string;
  recommendation: string;
}

export interface LiveGeo {
  countries: { countryCode: string; countryName: string; count: number }[];
  cities: { countryCode: string; countryName: string; cityName: string; count: number }[];
  updatedAt: string;
}

export interface LiveSnapshot extends LiveOverview {
  id: number;
  storeId: number;
  createdAt: string;
}

export interface MarketingAction {
  id: string;
  type: MarketingActionType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  titleAr: string;
  descriptionAr: string;
  recommendationAr: string;
  metric: string;
  relatedProductId?: number;
  relatedSource?: string;
  relatedPath?: string;
  status: 'active' | 'dismissed' | 'done' | 'snoozed';
  snoozedUntil?: string;
  createdAt: string;
  updatedAt: string;
  fingerprint: string;
}

export type MarketingActionType =
  | 'high_views_low_add_to_cart'
  | 'active_carts_no_checkout'
  | 'checkout_no_payment'
  | 'payment_failures_spike'
  | 'source_visits_no_purchases'
  | 'mobile_weak_conversion';

export interface MarketingActionThresholds {
  minimumProductViews: number;
  lowAddToCartRateThreshold: number;
  activeCartAgeMinutes: number;
  checkoutNoPaymentMinutes: number;
  paymentFailureThreshold: number;
  sourceNoPurchaseVisitThreshold: number;
  mobileWeakConversionThreshold: number;
}

export const DEFAULT_THRESHOLDS: MarketingActionThresholds = {
  minimumProductViews: 100,
  lowAddToCartRateThreshold: 0.05,
  activeCartAgeMinutes: 60,
  checkoutNoPaymentMinutes: 30,
  paymentFailureThreshold: 3,
  sourceNoPurchaseVisitThreshold: 50,
  mobileWeakConversionThreshold: 0.02,
};

export interface MarketingActionThresholdConfig {
  key: keyof MarketingActionThresholds;
  labelAr: string;
  descriptionAr: string;
  defaultValue: number;
  min?: number;
  max?: number;
  step?: number;
}

export const THRESHOLD_CONFIGS: MarketingActionThresholdConfig[] = [
  {
    key: 'minimumProductViews',
    labelAr: 'الحد الأدنى للمشاهدات',
    descriptionAr: 'الحد الأدنى لعدد مشاهدات المنتج لاعتباره',
    defaultValue: 100,
    min: 10,
    max: 10000,
    step: 10,
  },
  {
    key: 'lowAddToCartRateThreshold',
    labelAr: 'حد معدل الإضافة للسلة المنخفض',
    descriptionAr: 'معدل الإضافة للسلة الأدنى لاعتباره منخفضاً (0-1)',
    defaultValue: 0.05,
    min: 0.01,
    max: 0.5,
    step: 0.01,
  },
  {
    key: 'activeCartAgeMinutes',
    labelAr: 'عمر السلة النشطة (بالدقائق)',
    descriptionAr: 'المدة التي تعتبر السلة فيها نشطة قبل اعتبارها مهجورة',
    defaultValue: 60,
    min: 15,
    max: 1440,
    step: 15,
  },
  {
    key: 'checkoutNoPaymentMinutes',
    labelAr: 'مدة الدفع بدون إتمام (بالدقائق)',
    descriptionAr: 'المدة التي يعتبر فيها المستخدم في الدفع دون إتمام',
    defaultValue: 30,
    min: 5,
    max: 240,
    step: 5,
  },
  {
    key: 'paymentFailureThreshold',
    labelAr: 'حد فشل الدفع',
    descriptionAr: 'عدد حالات فشل الدفع لاعتباره ارتفاعاً',
    defaultValue: 3,
    min: 1,
    max: 20,
    step: 1,
  },
  {
    key: 'sourceNoPurchaseVisitThreshold',
    labelAr: 'حد زيارات المصدر بدون مشتريات',
    descriptionAr: 'عدد الزيارات من مصدر دون مشتريات لاعتباره',
    defaultValue: 50,
    min: 10,
    max: 1000,
    step: 10,
  },
  {
    key: 'mobileWeakConversionThreshold',
    labelAr: 'حد ضعف تحويل الجوال',
    descriptionAr: 'معدل تحويل الجوال الأدنى لاعتباره ضعيفاً (0-1)',
    defaultValue: 0.02,
    min: 0.005,
    max: 0.2,
    step: 0.005,
  },
];

export interface MarketingActionState {
  id: number;
  storeId: number;
  actionFingerprint: string;
  actionType: MarketingActionType;
  status: 'active' | 'dismissed' | 'done' | 'snoozed';
  snoozedUntil?: string;
  dismissedAt?: string;
  doneAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingActionSettings {
  key: string;
  valueJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingActionSettingsUpdate {
  key: string;
  valueJson: Record<string, unknown>;
}

export interface MarketingActionStateUpdate {
  status: 'active' | 'dismissed' | 'done' | 'snoozed';
  snoozedUntil?: string;
}

export interface MarketingActionStateResponse {
  id: number;
  storeId: number;
  actionFingerprint: string;
  actionType: string;
  status: 'active' | 'dismissed' | 'done' | 'snoozed';
  snoozedUntil: string | null;
  dismissedAt: string | null;
  doneAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingActionStateListResponse {
  data: MarketingActionStateResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarketingActionSettingsResponse {
  key: string;
  valueJson: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface MarketingActionSettingsListResponse {
  data: MarketingActionSettingsResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MarketingActionLog {
  id: number;
  storeId: number;
  actionId: number | null;
  actionFingerprint: string;
  actionType: string;
  event: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const ACTION_SEVERITY_LABELS: Record<string, string> = {
  critical: 'حرج',
  high: 'عالي',
  medium: 'متوسط',
  low: 'منخفض',
};

export const ACTION_STATUS_LABELS: Record<string, string> = {
  active: 'نشط',
  dismissed: 'متجاهل',
  done: 'منجز',
  snoozed: 'مؤجل',
};

export const ACTION_TYPE_LABELS: Record<string, string> = {
  high_views_low_add_to_cart: 'مشاهدات عالية مع إضافة للسلة منخفضة',
  active_carts_no_checkout: 'سلات نشطة دون انتقال للدفع',
  checkout_no_payment: 'دفع بدون إتمام',
  payment_failures_spike: 'ارتفاع في فشل الدفع',
  source_visits_no_purchases: 'زيارات من مصدر بدون مشتريات',
  mobile_weak_conversion: 'تحويل جوال ضعيف',
};

export const ACTION_DESCRIPTIONS: Record<string, string> = {
  high_views_low_add_to_cart: 'منتج يحصل على مشاهدات عالية لكن معدل إضافته للسلة منخفض جداً',
  active_carts_no_checkout: 'سلات نشطة منذ فترة طويلة دون انتقال لعملية الدفع',
  checkout_no_payment: 'مستخدمون يصلون لصفحة الدفع ولا يكملون الدفع',
  payment_failures_spike: 'ارتفاع ملحوظ في حالات فشل الدفع خلال الفترة الأخيرة',
  source_visits_no_purchases: 'مصدر زيارات يجلب زيارات لكن لا يحولها لمشتريات',
  mobile_weak_conversion: 'حركة المرور من الجوال تحقق تحويلاً أقل من المتوقع',
};

export const ACTION_RECOMMENDATIONS: Record<string, string> = {
  high_views_low_add_to_cart: 'راجع صور المنتج، الوصف، والسعر. أضف مراجعات أو عروضاً محدودة الوقت',
  active_carts_no_checkout: 'أرسل تذكيرات تلقائية للعملاء الذين لديهم سلات مهجورة. عرض شحن مجاني أو خصم محدود',
  checkout_no_payment: 'تأكد من عدم وجود أخطاء في بوابة الدفع. بسّط خطوات الدفع. وفر طرق دفع بديلة',
  payment_failures_spike: 'راجع سجل الدفع للتحقق من أخطاء البوابة. تواصل مع مزود الدفع إذا لزم الأمر',
  source_visits_no_purchases: 'راجع صفحة الهبوط لهذا المصدر. تأكد من استهداف الجمهور الصحيح. جرب عروضاً مخصصة لهذا المصدر',
  mobile_weak_conversion: 'تحقق من تجربة الجوال. تأكد من سرعة التحميل، سهولة التنقل، وسهولة الدفع على الجوال',
};

// ─── Customer Segmentation ───

export type CustomerSegmentType =
  | 'high_value'
  | 'repeat_buyers'
  | 'new_customers'
  | 'inactive'
  | 'cart_abandoners'
  | 'at_risk'
  | 'one_time_buyers'
  | 'coupon_users';

export interface CustomerSegment {
  type: CustomerSegmentType;
  labelAr: string;
  descriptionAr: string;
  count: number;
  totalSpent: string;
  avgOrderValue: string;
}

export interface CustomerSegmentMember {
  customerId: number;
  name: string;
  phone: string;
  email: string | null;
  totalOrders: number;
  totalSpent: string;
  lastOrderAt: string | null;
  lastSeenAt: string | null;
  segmentType: CustomerSegmentType;
}

export interface CustomerSegmentListResponse {
  data: CustomerSegmentMember[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CustomerSegmentSummary {
  totalCustomers: number;
  segments: CustomerSegment[];
  computedAt: string;
}

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegmentType, string> = {
  high_value: 'عملاء ذوو قيمة عالية',
  repeat_buyers: 'مشترين متكررين',
  new_customers: 'عملاء جدد',
  inactive: 'عملاء غير نشطين',
  cart_abandoners: 'مهملو السلة',
  at_risk: 'عملاء معرضون للخطر',
  one_time_buyers: 'مشترو مرة واحدة',
  coupon_users: 'مستخدمو الكوبونات',
};

export const CUSTOMER_SEGMENT_DESCRIPTIONS: Record<CustomerSegmentType, string> = {
  high_value: 'عملاء أكملوا مشتريات بقيمة مرتفعة',
  repeat_buyers: 'عملاء أكملوا أكثر من طلب واحد',
  new_customers: 'عملاء أكملوا أول طلب خلال آخر 30 يوم',
  inactive: 'عملاء لم يشتروا منذ أكثر من 90 يوم',
  cart_abandoners: 'عملاء أضافوا منتجات للسلة لكن لم يكملوا الشراء',
  at_risk: 'عملاء كانوا نشطين لكن لم يزوروا المتجر منذ 30+ يوم',
  one_time_buyers: 'عملاء أكملوا طلب واحد فقط',
  coupon_users: 'عملاء استخدموا كوبونات خصم في مشترياتهم',
};

export const CUSTOMER_SEGMENT_ICONS: Record<CustomerSegmentType, string> = {
  high_value: 'Crown',
  repeat_buyers: 'Repeat',
  new_customers: 'UserPlus',
  inactive: 'UserX',
  cart_abandoners: 'ShoppingCart',
  at_risk: 'AlertTriangle',
  one_time_buyers: 'Package',
  coupon_users: 'Tag',
};

export interface CustomerSegmentThresholds {
  highValueMinSpent: number;
  inactiveDays: number;
  atRiskDays: number;
  newCustomerDays: number;
}

export const DEFAULT_CUSTOMER_SEGMENT_THRESHOLDS: CustomerSegmentThresholds = {
  highValueMinSpent: 500,
  inactiveDays: 90,
  atRiskDays: 30,
  newCustomerDays: 30,
};

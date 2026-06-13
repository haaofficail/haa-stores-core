const BASE_URL = import.meta.env.VITE_API_URL ?? '';

interface ApiError {
  success: false;
  error: { code: string; message: string };
}

type ApiResponse<T> = { success: true; data: T } | ApiError;

export class ApiClientError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiClientError';
  }
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const json: ApiResponse<T> = await res.json();

  if (!json.success) {
    throw new ApiClientError(json.error.code, json.error.message);
  }

  return json.data;
}

export interface StoreInfo {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: string;
  isActive: boolean;
  email: string | null;
  phone: string | null;
  contactChannels?: {
    email: string;
    whatsapp: {
      enabled: boolean;
      phoneE164: string | null;
      waMeLink: string | null;
      qrDataUrl: string | null;
      realDelivery: false;
    };
  };
}

export interface ProductOptionValue {
  id: number;
  value: string;
  sortOrder: number;
}

export interface ProductOption {
  id: number;
  name: string;
  sortOrder: number;
  values: ProductOptionValue[];
}

export interface ProductVariant {
  id: number;
  productId: number;
  name: string;
  sku: string | null;
  price: string | null;
  stockQuantity: number;
  options: Record<string, string>;
  sortOrder: number;
}

export interface PublicProduct {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  images: string[];
  status: string;
  type: string;
  sku: string | null;
  stockQuantity: number;
  trackInventory: boolean;
  offerEndDate: string | null;
  weightGrams: number | null;
  lengthCm: string | null;
  widthCm: string | null;
  heightCm: string | null;
  requiresShipping: boolean;
  isFragile: boolean;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  rating: number | null;
  reviewCount: number | null;
  salesCount: number | null;
  views: number | null;
  options: ProductOption[];
  variants: ProductVariant[];
  giftWrapAvailable: boolean;
  giftWrapPriceOverride: string | null;
}

export interface PublicBrand {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
}

export interface PublicTag {
  id: number;
  name: string;
  slug: string;
  color: string;
}

export interface PublicCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
}

export interface CartItem {
  id: number;
  productId: number;
  variantId: number | null;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  notes: string | null;
  giftWrapSelected: boolean;
  giftWrapPrice: string | null;
  sendAsGift: boolean;
  giftMessage: string | null;
  variant: ProductVariant | null;
  product: PublicProduct;
}

export interface Cart {
  id: string;
  storeId: number;
  items: CartItem[];
  subtotal: string;
  itemCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingMethod {
  id: number;
  name: string;
  type: string;
  estimatedDeliveryDays: string | null;
  isActive: boolean;
}

export interface ShippingRate {
  shippingMethodId: number;
  methodName: string;
  estimatedDaysMin: number;
  estimatedDaysMax: number;
  baseRate: number | string;
  perKgRate: number;
  freeAboveAmount: number | null;
}

export interface CheckoutSession {
  id: string;
  cartId: string;
  storeId: number;
  status: string;
  idempotent: boolean;
}

export interface CheckoutConfirm {
  order: {
    id: number;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: string;
    customerName: string;
    customerPhone: string;
  };
  walletEntry: any;
}

export interface PickupLocation {
  id: number;
  nameAr: string;
  nameEn: string;
  address: string;
  mapsUrl: string | null;
  phone: string | null;
  hours: string | null;
  instructions: string | null;
}

export interface GiftOptions {
  giftWrapDefaultPrice: string;
  giftMessageMaxLength: number;
  giftWrapInstructions: string | null;
  pickupInstructions: string | null;
}

export interface SizeGuide {
  id: number;
  name: string;
  type: 'clothing' | 'shoes' | 'custom';
  unit: string;
  rows: Array<Record<string, string>>;
  categoryIds: number[];
  productIds: number[];
  isActive: boolean;
}

export interface PaymentMethodAvailability {
  provider: string;
  name: string;
  available: boolean;
  reason: string | null;
  mode: string;
  minOrderAmount: string | null;
  maxOrderAmount: string | null;
  currency: string;
}

export interface BNPLPaymentSessionResult {
  redirectUrl: string;
  paymentId: number;
  order: {
    id: number;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: string;
    customerName: string;
    customerPhone: string;
  };
}

export interface PublicOrder {
  orderNumber: string;
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string | null;
  fulfillmentType: 'shipping' | 'local_pickup';
  pickupLocationId: number | null;
  giftOptions: { sendAsGift?: boolean; message?: string } | null;
  customerName: string;
  customerPhone: string;
  total: string;
  subtotal: string;
  shippingCost: string | null;
  paymentMethod: string;
  items: Array<{
    id: number;
    name: string;
    sku: string | null;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    notes: string | null;
    giftWrapSelected: boolean;
    giftWrapPrice: string | null;
    sendAsGift: boolean;
    giftMessage: string | null;
  }>;
  statusHistory: Array<{
    id: number;
    fromStatus: string | null;
    toStatus: string;
    createdAt: string;
  }>;
}

export const storeApi = {
  get: (slug: string) => request<StoreInfo>(`/s/${slug}`),
};

export const categoriesApi = {
  list: (slug: string) => request<PublicCategory[]>(`/s/${slug}/categories`),
};

export interface ProductListParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  brandId?: number;
  tagId?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'name';
}

export interface ProductListResult {
  data: PublicProduct[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const productsApi = {
  list: (slug: string, params?: ProductListParams) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.category) q.set('category', params.category);
    if (params?.search) q.set('search', params.search);
    if (params?.brandId) q.set('brandId', String(params.brandId));
    if (params?.tagId) q.set('tagId', String(params.tagId));
    if (params?.minPrice !== undefined) q.set('minPrice', String(params.minPrice));
    if (params?.maxPrice !== undefined) q.set('maxPrice', String(params.maxPrice));
    if (params?.sort) q.set('sort', params.sort);
    const qs = q.toString();
    return request<ProductListResult>(
      `/s/${slug}/products${qs ? `?${qs}` : ''}`,
    );
  },
  getBySlug: (slug: string, productSlug: string) =>
    request<PublicProduct>(`/s/${slug}/products/${productSlug}`),
};

export const sizeGuidesApi = {
  getForProduct: (slug: string, productId: number) =>
    request<SizeGuide | null>(`/s/${slug}/size-guide?productId=${productId}`),
};

export const brandsApi = {
  list: (slug: string) => request<PublicBrand[]>(`/s/${slug}/brands`),
};

export const tagsApi = {
  list: (slug: string) => request<PublicTag[]>(`/s/${slug}/tags`),
};

export const cartApi = {
  create: (slug: string) =>
    request<Cart>(`/s/${slug}/cart`, { method: 'POST' }),
  get: (slug: string, cartId: string) =>
    request<Cart>(`/s/${slug}/cart/${cartId}`),
  addItem: (slug: string, cartId: string, productId: number, quantity: number, notes?: string, giftData?: { giftWrapSelected?: boolean; sendAsGift?: boolean; giftMessage?: string }, variantId?: number) =>
    request<Cart>(`/s/${slug}/cart/${cartId}/items`, {
      method: 'POST',
      body: JSON.stringify({ productId, variantId, quantity, notes, ...giftData }),
    }),
  updateItem: (slug: string, cartId: string, itemId: number, quantity: number) =>
    request<Cart>(`/s/${slug}/cart/${cartId}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity }),
    }),
  removeItem: (slug: string, cartId: string, itemId: number) =>
    request<Cart>(`/s/${slug}/cart/${cartId}/items/${itemId}`, { method: 'DELETE' }),
};

export interface CouponValidation {
  valid: boolean;
  discount?: number;
  code?: string;
  couponId?: number;
  reason?: string;
}

export const checkoutApi = {
  getShippingRates: (slug: string, cartId: string, city: string) =>
    request<ShippingRate[]>(`/s/${slug}/checkout/shipping-rates`, {
      method: 'POST',
      body: JSON.stringify({ cartId, city }),
    }),
  getShippingMethods: (slug: string) =>
    request<ShippingMethod[]>(`/s/${slug}/shipping-methods`),
  validateCoupon: (slug: string, code: string, subtotal: number, shippingCost?: number) =>
    request<CouponValidation>(`/s/${slug}/checkout/validate-coupon`, {
      method: 'POST',
      body: JSON.stringify({ code, subtotal, shippingCost }),
    }),
  createSession: (slug: string, data: {
    cartId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    shippingAddress?: { street?: string; district?: string; city: string; state?: string; postalCode?: string; country?: string };
    shippingMethodId?: number;
    fulfillmentType?: 'shipping' | 'local_pickup';
    pickupLocationId?: number;
    paymentMethod: string;
    notes?: string;
    idempotencyKey: string;
    couponCode?: string;
    gift?: { sendAsGift?: boolean; message?: string };
  }) => request<CheckoutSession>(`/s/${slug}/checkout/sessions`, { method: 'POST', body: JSON.stringify(data) }),
  confirm: (slug: string, sessionId: string) =>
    request<CheckoutConfirm>(`/s/${slug}/checkout/sessions/${sessionId}/confirm`, { method: 'POST' }),
  getPaymentMethods: (slug: string, cartId?: string) =>
    request<{ methods: PaymentMethodAvailability[] }>(
      `/s/${slug}/payment-methods${cartId ? `?cartId=${cartId}` : ''}`,
    ),
  initiateBNPLPayment: (slug: string, data: {
    sessionId: string;
    successUrl: string;
    cancelUrl: string;
    failureUrl?: string;
  }) => request<BNPLPaymentSessionResult>(
    `/s/${slug}/checkout/payment-session`,
    { method: 'POST', body: JSON.stringify(data) },
  ),
};

export const orderApi = {
  getByOrderNumber: (slug: string, orderNumber: string, phone: string) =>
    request<PublicOrder>(`/s/${slug}/order/${orderNumber}?phone=${encodeURIComponent(phone)}`),
  track: (slug: string, orderNumber: string, phone: string) =>
    request<PublicOrder>(`/s/${slug}/track/${orderNumber}?phone=${encodeURIComponent(phone)}`),
};

export const featuresApi = {
  get: (slug: string) => request<Record<string, boolean>>(`/s/${slug}/product-features`),
};

export const pickupLocationsApi = {
  list: (slug: string) => request<PickupLocation[]>(`/s/${slug}/pickup-locations`),
};

export const giftOptionsApi = {
  get: (slug: string) => request<GiftOptions>(`/s/${slug}/gift-options`),
};

export interface StorePolicy {
  id: number;
  storeId: number;
  type: string;
  title: string;
  content: string;
  isPublished: boolean;
  updatedAt: string;
}

export const policiesApi = {
  get: (slug: string, type: string) =>
    request<StorePolicy>(`/s/${slug}/policies/${type}`),
};

export interface SupportTicket {
  id: number;
  storeId: number;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  accessToken: string;
  createdAt: string;
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: number;
  ticketId: number;
  authorType: string;
  message: string;
  isStaffReply: boolean;
  createdAt: string;
}

export interface KbArticle {
  id: number;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  createdAt: string;
}

export interface KbListResult {
  articles: KbArticle[];
  categories: string[];
}

export interface CreatedTicket {
  id: number;
  accessToken: string;
  subject: string;
  createdAt: string;
}

export const supportApi = {
  createTicket: (slug: string, data: { name: string; email?: string; phone?: string; subject: string; message: string }) =>
    request<CreatedTicket>(`/s/${slug}/support/tickets`, { method: 'POST', body: JSON.stringify(data) }),
  getTicket: (slug: string, ticketId: number, accessToken: string) =>
    request<SupportTicket & { messages: TicketMessage[] }>(`/s/${slug}/support/tickets/${ticketId}?accessToken=${accessToken}`),
  replyToTicket: (slug: string, ticketId: number, accessToken: string, message: string) =>
    request<TicketMessage>(`/s/${slug}/support/tickets/${ticketId}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message, accessToken }),
    }),
  listKbArticles: (slug: string, category?: string) =>
    request<KbListResult>(`/s/${slug}/support/kb${category ? `?category=${encodeURIComponent(category)}` : ''}`),
  getKbArticle: (slug: string, articleSlug: string) =>
    request<KbArticle>(`/s/${slug}/support/kb/${articleSlug}`),
};

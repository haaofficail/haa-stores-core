const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface StoreConfig {
  welcomeMessage: string | null;
  welcomeMessageEnabled: boolean;
  preparationTime: number;
  preparationTimeEnabled: boolean;
  minOrderAmount: string;
  minOrderEnabled: boolean;
  city: string | null;
  district: string | null;
  street: string | null;
  postalCode: string | null;
  latitude: string | null;
  longitude: string | null;
}

interface ApiError {
  success: false;
  error: { code: string; message: string; issues?: Array<{ message: string }> };
}

type ApiResponse<T> = { success: true; data: T } | ApiError;

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

function setToken(token: string) {
  localStorage.setItem('auth_token', token);
}

function clearToken() {
  localStorage.removeItem('auth_token');
}

function getStoreId(): string | null {
  return localStorage.getItem('active_store_id');
}

export { setToken, clearToken, getStoreId, getToken };

// Methods that mutate server state. Every one of these MUST carry an
// `Idempotency-Key` so that a double-click, a flaky network retry, or a
// browser back/forward cache replay does NOT post the operation twice.
// Audit Part 3 (commerce) flagged this as the highest-money-risk gap on
// the dashboard: SettlementOverview's "request payout" button could
// re-trigger a duplicate payout on a double-click without it.
//
// The key is generated client-side per call (UUID v4 via the platform
// `crypto.randomUUID()`); callers can also pass an explicit key in
// `options.headers['Idempotency-Key']` if they need a deterministic
// retry semantic (e.g. an operation tied to a stable client-side id).
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function newIdempotencyKey(): string {
  // crypto.randomUUID is available in every browser this dashboard
  // supports (Safari 15.4+, all evergreen). Fall back to a timestamp +
  // random so we never throw if the API is somehow missing.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Auto-attach Idempotency-Key on mutating methods unless the caller
  // already provided one (preserves caller control for deterministic
  // retry keys).
  const method = (options.method ?? 'GET').toUpperCase();
  if (MUTATING_METHODS.has(method) && !headers['Idempotency-Key']) {
    headers['Idempotency-Key'] = newIdempotencyKey();
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers, credentials: 'include' });
  } catch {
    throw new ApiClientError('NETWORK_ERROR', 'Network error: unable to connect to server');
  }

  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  if (!res.ok && !res.headers.get('content-type')?.includes('json')) {
    const text = await res.text().catch(() => '');
    throw new ApiClientError('SERVER_ERROR', `Server returned ${res.status}: ${text.slice(0, 100)}`);
  }

  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiClientError('SERVER_ERROR', 'Server returned an invalid response');
  }

  if (!json.success) {
    const code = json.error.code || 'VALIDATION_ERROR';
    const message = json.error.message || json.error.issues?.slice(0, 3).map((i: any) => i.message).join('; ') || 'Request failed';
    throw new ApiClientError(code, message);
  }

  return json.data;
}

export class ApiClientError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiClientError';
  }
}

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    request<{ token: string; user: { id: number; name: string; email: string; tenantId: number; activeStoreId: number; roles: string[]; permissions: string[] } }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }) },
    ),
  me: () =>
    request<{ id: number; name: string; email: string; tenantId: number; activeStoreId: number; roles: string[]; permissions: string[] }>(
      '/auth/me',
    ),
};

// Products
export const productsApi = {
  list: (storeId: number, params?: { page?: number; limit?: number; status?: string; categoryId?: number; brandId?: number; tagId?: number; search?: string; stockFilter?: string; typeFilter?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.status) q.set('status', params.status);
    if (params?.categoryId) q.set('categoryId', String(params.categoryId));
    if (params?.brandId) q.set('brandId', String(params.brandId));
    if (params?.tagId) q.set('tagId', String(params.tagId));
    if (params?.search) q.set('search', params.search);
    if (params?.stockFilter) q.set('stockFilter', params.stockFilter);
    if (params?.typeFilter) q.set('typeFilter', params.typeFilter);
    const qs = q.toString();
    return request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/merchant/${storeId}/products${qs ? `?${qs}` : ''}`,
    );
  },
  getById: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/products/${id}`),
  create: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/products`, { method: 'POST', body: JSON.stringify(data) }),
  update: (storeId: number, id: number, data: any) =>
    request<any>(`/merchant/${storeId}/products/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  archive: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/products/${id}`, { method: 'DELETE' }),
  uploadImage: async (storeId: number, productId: number, file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    let res: Response;
    try {
      res = await fetch(`${BASE_URL}/merchant/${storeId}/products/${productId}/images`, {
        method: 'POST',
        headers,
        body: formData,
      });
    } catch {
      throw new ApiClientError('NETWORK_ERROR', 'Network error: unable to connect to server');
    }
    if (res.status === 401) {
      clearToken();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    let json: any;
    try {
      json = await res.json();
    } catch {
      throw new ApiClientError('SERVER_ERROR', 'Server returned an invalid response');
    }
    if (!json.success) throw new ApiClientError(json.error.code, json.error.message);
    return json.data as any;
  },
  deleteImage: (storeId: number, productId: number, imageId: number) =>
    request<any>(`/merchant/${storeId}/products/${productId}/images/${imageId}`, { method: 'DELETE' }),
  bulk: (storeId: number, data: { productIds: number[]; action: 'activate' | 'deactivate' }) =>
    request<{ total: number; succeeded: number; failed: number; failedIds: number[] }>(
      `/merchant/${storeId}/products/bulk`,
      { method: 'POST', body: JSON.stringify(data) },
    ),
};

// File upload
export async function uploadFile(storeId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const token = getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/merchant/${storeId}/uploads`, { method: 'POST', headers, body: formData });
  } catch {
    throw new ApiClientError('NETWORK_ERROR', 'Network error: unable to connect to server');
  }
  if (res.status === 401) {
    clearToken();
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }
  let json: any;
  try {
    json = await res.json();
  } catch {
    throw new ApiClientError('SERVER_ERROR', 'Server returned an invalid response');
  }
  if (!json.success) throw new ApiClientError(json.error?.code || 'UPLOAD_FAILED', json.error?.message || 'Upload failed');
  return json.data as { url: string; key: string; thumbUrl?: string; sizeBytes?: number };
}

// Brands
export const brandsApi = {
  list: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/brands`),
  getById: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/brands/${id}`),
  create: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/brands`, { method: 'POST', body: JSON.stringify(data) }),
  update: (storeId: number, id: number, data: any) =>
    request<any>(`/merchant/${storeId}/brands/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/brands/${id}`, { method: 'DELETE' }),
  reorder: (storeId: number, items: { id: number; sortOrder: number }[]) =>
    request<void>(`/merchant/${storeId}/brands/reorder`, { method: 'PUT', body: JSON.stringify({ items }) }),
};

// Tags
export const tagsApi = {
  list: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/tags`),
  getById: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/tags/${id}`),
  create: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/tags`, { method: 'POST', body: JSON.stringify(data) }),
  update: (storeId: number, id: number, data: any) =>
    request<any>(`/merchant/${storeId}/tags/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/tags/${id}`, { method: 'DELETE' }),
  reorder: (storeId: number, items: { id: number; sortOrder: number }[]) =>
    request<void>(`/merchant/${storeId}/tags/reorder`, { method: 'PUT', body: JSON.stringify({ items }) }),
};

// Categories
export const categoriesApi = {
  list: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/categories`),
  getTree: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/categories/tree`),
  create: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/categories`, { method: 'POST', body: JSON.stringify(data) }),
  update: (storeId: number, id: number, data: any) =>
    request<any>(`/merchant/${storeId}/categories/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/categories/${id}`, { method: 'DELETE' }),
  reorder: (storeId: number, items: { id: number; parentId: number | null; sortOrder: number }[]) =>
    request<void>(`/merchant/${storeId}/categories/reorder`, { method: 'PUT', body: JSON.stringify({ items }) }),
};

// Orders
export const ordersApi = {
  list: (storeId: number, params?: {
    page?: number; limit?: number;
    status?: string; paymentStatus?: string; fulfillmentStatus?: string;
    search?: string; dateFrom?: string; dateTo?: string; source?: string;
    fulfillmentType?: string; paymentMethod?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.status) q.set('status', params.status);
    if (params?.paymentStatus) q.set('paymentStatus', params.paymentStatus);
    if (params?.fulfillmentStatus) q.set('fulfillmentStatus', params.fulfillmentStatus);
    if (params?.fulfillmentType) q.set('fulfillmentType', params.fulfillmentType);
    if (params?.paymentMethod) q.set('paymentMethod', params.paymentMethod);
    if (params?.source) q.set('source', params.source);
    if (params?.search) q.set('search', params.search);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    const qs = q.toString();
    return request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/merchant/${storeId}/orders${qs ? `?${qs}` : ''}`,
    );
  },
  getById: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/orders/${id}`),
  transitions: (storeId: number, id: number) =>
    request<{ currentStatus: string; allowedTransitions: string[] }>(`/merchant/${storeId}/orders/${id}/transitions`),
  changeStatus: (storeId: number, id: number, status: string, reason?: string) =>
    request<any>(`/merchant/${storeId}/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, reason }) }),
  recentItems: (storeId: number, limit?: number) => {
    const qs = limit ? `?limit=${limit}` : '';
    return request<any[]>(`/merchant/${storeId}/orders/recent-items${qs}`);
  },
  collectCOD: (storeId: number, orderId: number) =>
    request<any>(`/merchant/${storeId}/orders/${orderId}/cod/collect`, { method: 'POST' }),
  markCODFailed: (storeId: number, orderId: number, reason?: string) =>
    request<any>(`/merchant/${storeId}/orders/${orderId}/cod/failed`, { method: 'POST', body: JSON.stringify({ reason }) }),
  markCODRefused: (storeId: number, orderId: number) =>
    request<any>(`/merchant/${storeId}/orders/${orderId}/cod/refused`, { method: 'POST' }),
};

// Reports
export interface DeepReport {
  generatedAt: string;
  dateFrom: string | null;
  dateTo: string | null;
  financialBreakdown: Record<string, string | number>;
  orderDetails: Array<Record<string, string | number | null>>;
  productPerformance: Array<Record<string, string | number | null>>;
  settlementReconciliation: Array<Record<string, string | number | null>>;
  customerInsights: Array<Record<string, string | number | null>>;
  refundsAndDisputes: Array<Record<string, string | number | null>>;
  codAndShipping: Record<string, string | number>;
}

export const reportsApi = {
  salesSummary: (storeId: number, dateFrom?: string, dateTo?: string) => {
    const q = new URLSearchParams();
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    return request<any>(`/merchant/${storeId}/reports/sales-summary?${q}`);
  },
  topProducts: (storeId: number, limit?: number) => {
    const q = limit ? `?limit=${limit}` : '';
    return request<any[]>(`/merchant/${storeId}/reports/top-products${q}`);
  },
  ordersByStatus: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/reports/orders-by-status`),
  salesByCity: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/reports/sales-by-city`),
  lowStock: (storeId: number, threshold?: number) => {
    const q = threshold ? `?threshold=${threshold}` : '';
    return request<any[]>(`/merchant/${storeId}/reports/low-stock${q}`);
  },
  walletSummary: (storeId: number) =>
    request<any>(`/merchant/${storeId}/reports/wallet-summary`),
  deep: (storeId: number, dateFrom?: string, dateTo?: string) => {
    const q = new URLSearchParams();
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    return request<DeepReport>(`/merchant/${storeId}/reports/deep?${q}`);
  },
};

// Customers
export const customersApi = {
  list: (storeId: number, params?: { page?: number; limit?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/merchant/${storeId}/customers${qs ? `?${qs}` : ''}`,
    );
  },
  create: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/customers`, { method: 'POST', body: JSON.stringify(data) }),
  update: (storeId: number, id: number, data: any) =>
    request<any>(`/merchant/${storeId}/customers/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
};

// Shipping
export const shippingApi = {
  overview: (storeId: number) =>
    request<any>(`/merchant/${storeId}/shipping/overview`),
  methods: {
    list: (storeId: number) => request<any[]>(`/merchant/${storeId}/shipping/methods`),
    create: (storeId: number, data: any) =>
      request<any>(`/merchant/${storeId}/shipping/methods`, { method: 'POST', body: JSON.stringify(data) }),
    update: (storeId: number, id: number, data: any) =>
      request<any>(`/merchant/${storeId}/shipping/methods/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  zones: {
    list: (storeId: number) => request<any[]>(`/merchant/${storeId}/shipping/zones`),
    create: (storeId: number, data: any) =>
      request<any>(`/merchant/${storeId}/shipping/zones`, { method: 'POST', body: JSON.stringify(data) }),
    update: (storeId: number, id: number, data: any) =>
      request<any>(`/merchant/${storeId}/shipping/zones/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  },
  rates: {
    list: (storeId: number) => request<any[]>(`/merchant/${storeId}/shipping/rates`),
    create: (storeId: number, data: any) =>
      request<any>(`/merchant/${storeId}/shipping/rates`, { method: 'POST', body: JSON.stringify(data) }),
    update: (storeId: number, id: number, data: any) =>
      request<any>(`/merchant/${storeId}/shipping/rates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (storeId: number, id: number) =>
      request<any>(`/merchant/${storeId}/shipping/rates/${id}`, { method: 'DELETE' }),
  },
  shipments: {
    list: (storeId: number, params?: { status?: string; noTracking?: boolean; city?: string; dateFrom?: string; dateTo?: string }) => {
      const q = new URLSearchParams();
      if (params?.status) q.set('status', params.status);
      if (params?.noTracking) q.set('noTracking', 'true');
      if (params?.city) q.set('city', params.city);
      if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
      if (params?.dateTo) q.set('dateTo', params.dateTo);
      const qs = q.toString();
      return request<any[]>(`/merchant/${storeId}/shipping/shipments${qs ? `?${qs}` : ''}`);
    },
    getById: (storeId: number, id: number) =>
      request<any>(`/merchant/${storeId}/shipping/shipments/${id}`),
    updateStatus: (storeId: number, id: number, data: any) =>
      request<any>(`/merchant/${storeId}/shipping/shipments/${id}/status`, { method: 'PATCH', body: JSON.stringify(data) }),
    updateTracking: (storeId: number, id: number, data: { trackingNumber: string; trackingUrl?: string; carrierName?: string }) =>
      request<any>(`/merchant/${storeId}/shipping/shipments/${id}/tracking`, { method: 'PATCH', body: JSON.stringify(data) }),
  },
  status: (storeId: number) =>
    request<{ activeProvider: string; activeMode: string; otoConfigured: boolean; liveBlocked: boolean }>(
      `/merchant/${storeId}/shipments/provider-status`,
    ),
  createForOrder: (storeId: number, orderId: number, data: {
    shippingMethodId: number; recipientName: string; recipientPhone: string;
    address: { city: string; country: string; street?: string; district?: string; state?: string; postalCode?: string };
    notes?: string;
  }) =>
    request<any>(`/merchant/${storeId}/orders/${orderId}/shipments`, { method: 'POST', body: JSON.stringify(data) }),
  createLabel: (storeId: number, shipmentId: number) =>
    request<any>(`/merchant/${storeId}/shipments/${shipmentId}/label`, { method: 'POST' }),
  getLabel: (storeId: number, shipmentId: number) =>
    request<any>(`/merchant/${storeId}/shipments/${shipmentId}/label`),
  addEvent: (storeId: number, shipmentId: number, data: { status: string; description?: string; location?: string }) =>
    request<any>(`/merchant/${storeId}/shipments/${shipmentId}/events`, { method: 'POST', body: JSON.stringify(data) }),
  createReturn: (storeId: number, shipmentId: number, data: { reason: string }) =>
    request<any>(`/merchant/${storeId}/shipments/${shipmentId}/return`, { method: 'POST', body: JSON.stringify(data) }),
  listReturns: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/shipments/returns/list`),
  cancel: (storeId: number, shipmentId: number) =>
    request<any>(`/merchant/${storeId}/shipments/${shipmentId}/cancel`, { method: 'POST' }),
};

// Wallet
export const walletApi = {
  summary: (storeId: number) =>
    request<any>(`/merchant/${storeId}/wallet/summary`),
  settlementReadiness: (storeId: number) =>
    request<{
      settlementReadiness: 'not_ready' | 'partial' | 'ready';
      complianceStatus: string;
      storeActive: boolean;
      kycApproved: boolean;
      bankAccountVerified: boolean;
      reconciliationHealthy: boolean;
      refundRiskClear: boolean;
      disputeRiskClear: boolean;
    }>(`/merchant/${storeId}/wallet/settlement-readiness`),
  settlementBatches: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/wallet/settlements`),
  settlementBatchDetail: (storeId: number, batchId: number) =>
    request<{ id: number; transactions: any[] }>(`/merchant/${storeId}/wallet/settlements/${batchId}`),
  payouts: (storeId: number) =>
    request<Array<{ id: number; amount: string; status: string; reference: string; requestedAt: string }>>(
      `/merchant/${storeId}/wallet/payouts`,
    ),
  requestPayout: (storeId: number, amount: number) =>
    request<{ id: number; amount: string; status: string; reference: string }>(
      `/merchant/${storeId}/wallet/payouts/request`,
      { method: 'POST', body: JSON.stringify({ amount }) },
    ),
  entries: (storeId: number, params?: {
    page?: number; limit?: number;
    type?: string; direction?: string; status?: string;
    dateFrom?: string; dateTo?: string; search?: string;
  }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.type) q.set('type', params.type);
    if (params?.direction) q.set('direction', params.direction);
    if (params?.status) q.set('status', params.status);
    if (params?.dateFrom) q.set('dateFrom', params.dateFrom);
    if (params?.dateTo) q.set('dateTo', params.dateTo);
    if (params?.search) q.set('search', params.search);
    const qs = q.toString();
    return request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/merchant/${storeId}/wallet/entries${qs ? `?${qs}` : ''}`,
    );
  },
};

// Dashboard summary
export const dashboardApi = {
  summary: (storeId: number) =>
    request<any>(`/merchant/${storeId}/dashboard/summary`),
};

// Payment
export const paymentApi = {
  status: (storeId: number) =>
    request<{ activeProvider: string; activeMode: string; moyasarConfigured: boolean; moyasarAvailable: boolean; liveBlocked: boolean }>(
      `/merchant/${storeId}/settings/payment-status`,
    ),
};

// Compliance
export const complianceApi = {
  getProfile: (storeId: number) =>
    request<any>(`/merchant/${storeId}/compliance/profile`),
  updateProfile: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/compliance/profile`, { method: 'PUT', body: JSON.stringify(data) }),
  submit: (storeId: number) =>
    request<any>(`/merchant/${storeId}/compliance/submit`, { method: 'POST' }),
  getStatus: (storeId: number) =>
    request<any>(`/merchant/${storeId}/compliance/status`),
  getDocuments: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/compliance/documents`),
  uploadDocument: (storeId: number, data: { type: string; fileUrl: string; filename: string; mimeType: string; sizeBytes: number }) =>
    request<any>(`/merchant/${storeId}/compliance/documents`, { method: 'POST', body: JSON.stringify(data) }),
  deleteDocument: (storeId: number, documentId: number) =>
    request<any>(`/merchant/${storeId}/compliance/documents/${documentId}`, { method: 'DELETE' }),
  getBankAccount: (storeId: number) =>
    request<any>(`/merchant/${storeId}/compliance/bank-account`),
  updateBankAccount: (storeId: number, data: { accountHolderName: string; bankName: string; iban: string }) =>
    request<any>(`/merchant/${storeId}/compliance/bank-account`, { method: 'PUT', body: JSON.stringify(data) }),
  getChecklist: (storeId: number) =>
    request<{ passed: boolean; items: Array<{ key: string; label: string; passed: boolean; required: boolean; source: string; severity: string; message: string }>; blockingErrorsCount: number; warningsCount: number; checkedAt: string }>(
      `/merchant/${storeId}/compliance/checklist`,
    ),
};

// Publish Gate
export const publishApi = {
  publish: (storeId: number) =>
    request<{ storeId: number; publishStatus: string }>(`/merchant/${storeId}/settings/publish`, { method: 'POST' }),
  unpublish: (storeId: number) =>
    request<{ storeId: number; publishStatus: string }>(`/merchant/${storeId}/settings/unpublish`, { method: 'POST' }),
  getPublishStatus: (storeId: number) =>
    request<{ storeId: number; publishStatus: string }>(`/merchant/${storeId}/settings/publish-status`),
};

// Audit Logs
export const auditApi = {
  getLogs: (storeId: number, params?: { page?: number; limit?: number; action?: string; entityType?: string; dateFrom?: string; dateTo?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.action) query.set('action', params.action);
    if (params?.entityType) query.set('entityType', params.entityType);
    if (params?.dateFrom) query.set('dateFrom', params.dateFrom);
    if (params?.dateTo) query.set('dateTo', params.dateTo);
    const qs = query.toString();
    return request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/merchant/${storeId}/audit${qs ? `?${qs}` : ''}`,
    );
  },
};

// Acknowledgement
export const acknowledgementApi = {
  getStatus: (storeId: number) =>
    request<{ acknowledged: boolean; acceptedVersions: Record<string, string> | null; currentVersions: Record<string, string>; missingItems: string[]; acceptedAt: string | null }>(
      `/merchant/${storeId}/settings/acknowledgement/status`,
    ),
  getRequiredItems: (storeId: number) =>
    request<{ requiredItems: Array<{ key: string; label: string }>; requiredCheckboxes: Array<{ key: string; label: string }> }>(
      `/merchant/${storeId}/settings/acknowledgement/required-items`,
    ),
  acknowledge: (storeId: number, acknowledgedItems: Record<string, boolean>) =>
    request<any>(`/merchant/${storeId}/settings/acknowledge`, { method: 'POST', body: JSON.stringify({ acknowledgedItems }) }),
};

// Subscriptions
export const subscriptionApi = {
  getCurrent: (storeId: number) => request<any>(`/merchant/${storeId}/subscriptions`),
  getPlans: (storeId: number) => request<any[]>(`/merchant/${storeId}/subscriptions/plans`),
  subscribe: (storeId: number, data: { planId: number; billingCycle: string }) => request<any>(`/merchant/${storeId}/subscriptions/subscribe`, { method: 'POST', body: JSON.stringify(data) }),
  upgrade: (storeId: number, data: { planId: number; billingCycle: string }) => request<any>(`/merchant/${storeId}/subscriptions/upgrade`, { method: 'POST', body: JSON.stringify(data) }),
  downgrade: (storeId: number, data: { planId: number }) => request<any>(`/merchant/${storeId}/subscriptions/downgrade`, { method: 'POST', body: JSON.stringify(data) }),
  getInvoices: (storeId: number) => request<any[]>(`/merchant/${storeId}/subscriptions/invoices`),
  getLimits: (storeId: number) => request<any>(`/merchant/${storeId}/subscriptions/limits`),
};

// Settings
export const settingsApi = {
  get: (storeId: number) =>
    request<any>(`/merchant/${storeId}/settings`),
  update: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/settings`, { method: 'PUT', body: JSON.stringify(data) }),
  readiness: (storeId: number) =>
    request<{ percentage: number; completedCount: number; totalCount: number; items: Array<{ key: string; label: string; completed: boolean; actionLabel: string; actionHref: string }> }>(
      `/merchant/${storeId}/settings/readiness`,
    ),
  getProductFeatures: (storeId: number) =>
    request<Record<string, boolean>>(`/merchant/${storeId}/settings/product-features`),
  updateProductFeatures: (storeId: number, features: Record<string, boolean>) =>
    request<Record<string, boolean>>(`/merchant/${storeId}/settings/product-features`, { method: 'PUT', body: JSON.stringify(features) }),
  getStoreConfig: (storeId: number) =>
    request<StoreConfig>(`/merchant/${storeId}/settings/store-config`),
  updateStoreConfig: (storeId: number, data: Partial<StoreConfig>) =>
    request<StoreConfig>(`/merchant/${storeId}/settings/store-config`, { method: 'PUT', body: JSON.stringify(data) }),
  listSizeGuides: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/settings/size-guides`),
  createSizeGuide: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/settings/size-guides`, { method: 'POST', body: JSON.stringify(data) }),
  updateSizeGuide: (storeId: number, guideId: number, data: any) =>
    request<any>(`/merchant/${storeId}/settings/size-guides/${guideId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSizeGuide: (storeId: number, guideId: number) =>
    request<any>(`/merchant/${storeId}/settings/size-guides/${guideId}`, { method: 'DELETE' }),
  getTheme: (storeId: number) =>
    request<any>(`/merchant/${storeId}/settings/theme`),
  updateTheme: (storeId: number, config: any) =>
    request<{ data: any; history: any[] }>(`/merchant/${storeId}/settings/theme`, { method: 'PUT', body: JSON.stringify(config) }),
  getThemeHistory: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/settings/theme/history`),
  getGiftOptions: (storeId: number) =>
    request<{ giftWrapDefaultPrice: string; giftMessageMaxLength: number; giftWrapInstructions: string | null; pickupInstructions: string | null }>(
      `/merchant/${storeId}/settings/gift-options`),
  updateGiftOptions: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/settings/gift-options`, { method: 'PUT', body: JSON.stringify(data) }),
  listPickupLocations: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/settings/pickup-locations`),
  createPickupLocation: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/settings/pickup-locations`, { method: 'POST', body: JSON.stringify(data) }),
  updatePickupLocation: (storeId: number, id: number, data: any) =>
    request<any>(`/merchant/${storeId}/settings/pickup-locations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePickupLocation: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/settings/pickup-locations/${id}`, { method: 'DELETE' }),
};

export const notificationApi = {
  getPreferences: (storeId: number) => request<any>(`/merchant/${storeId}/notifications/preferences`),
  updatePreferences: (storeId: number, data: any) => request<any>(`/merchant/${storeId}/notifications/preferences`, { method: 'PUT', body: JSON.stringify(data) }),
  getLogs: (storeId: number, channel?: string) => request<any[]>(`/merchant/${storeId}/notifications/logs${channel ? `?channel=${channel}` : ''}`),
  getTemplates: (storeId: number) => request<any[]>(`/merchant/${storeId}/notifications/templates`),
};

export interface ProviderStatus {
  payment: {
    provider: 'geidea';
    mode: 'sandbox' | 'live';
    configured: boolean;
    liveEnabled: false;
    status: 'configured' | 'not_configured' | 'sandbox';
  };
  shipping: {
    provider: 'oto';
    integrationModel: 'marketplace_vendor' | 'merchant_token' | 'not_configured';
    marketplaceTokenAvailable: boolean;
    vendorRegistered: boolean;
    senderLocationConfigured: boolean;
    mode: 'sandbox' | 'live';
    status: 'configured' | 'not_configured' | 'marketplace_token_required' | 'missing_sender_location' | 'merchant_token_required';
    manualFallback: boolean;
  };
  shippingLabel: {
    provider: 'oto';
    configured: boolean;
    labelType: 'carrier_label' | 'manual_label' | 'not_configured';
    status: 'configured' | 'partial' | 'not_configured';
  };
  whatsapp: {
    mode: 'qr_contact';
    configured: boolean;
    realDelivery: false;
    status: 'configured' | 'not_configured';
  };
  email: {
    fromEmail: string;
    replyToEmail: string;
    provider: 'smtp' | null;
    configured: boolean;
    realDelivery: boolean;
    status: 'contact_only' | 'configured' | 'not_configured';
  };
}

export const providerStatusApi = {
  get: (storeId: number) => request<ProviderStatus>(`/merchant/${storeId}/provider-status`),
};

export const feedsApi = {
  getGoogleFeed: (storeId: number) => `/merchant/${storeId}/feeds/google-merchant`,
  getMetaFeed: (storeId: number) => `/merchant/${storeId}/feeds/meta-catalog`,
  getTemplates: (storeId: number) => request<any[]>(`/merchant/${storeId}/feeds/templates`),
  getTemplateCsv: (storeId: number, source: string) => `/merchant/${storeId}/feeds/template/${source}/csv`,
};

export const aiApi = {
  dailySummary: (storeId: number) => request<any>(`/merchant/${storeId}/ai/daily-summary`),
  weeklySummary: (storeId: number) => request<any>(`/merchant/${storeId}/ai/weekly-summary`),
  salesDecline: (storeId: number) => request<any>(`/merchant/${storeId}/ai/sales-decline`),
  productSuggestions: (storeId: number) => request<any>(`/merchant/${storeId}/ai/product-suggestions`),
  generateTitle: (storeId: number, data: { productName?: string; category?: string }) => request<any>(`/merchant/${storeId}/ai/product-title`, { method: 'POST', body: JSON.stringify(data) }),
  generateDescription: (storeId: number, data: { productName?: string; category?: string; features?: string }) => request<any>(`/merchant/${storeId}/ai/product-description`, { method: 'POST', body: JSON.stringify(data) }),
  suggestions: (storeId: number) => request<any>(`/merchant/${storeId}/ai/promotions`),
  abandonedCarts: (storeId: number) => request<any>(`/merchant/${storeId}/ai/abandoned-carts`),
  wallet: (storeId: number) => request<any>(`/merchant/${storeId}/ai/wallet`),
  generateProducts: (storeId: number, data: { category?: string; count?: number }) =>
    request<any>(`/merchant/${storeId}/ai/generate-products`, { method: 'POST', body: JSON.stringify(data) }),
  chat: (storeId: number, prompt: string, history?: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    request<any>(`/merchant/${storeId}/ai/chat`, { method: 'POST', body: JSON.stringify({ prompt, history }) }),
};

export interface Employee {
  id: number;
  userId: number;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  permissions: string[];
}

export interface PermissionInfo {
  key: string;
  labelAr: string;
  descriptionAr: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  allowedScopes: string[];
  selected?: boolean;
}

export interface PermissionPreset {
  key: string;
  labelAr: string;
  permissionKeys: string[];
}

export interface MembershipPermission {
  permissionKey: string;
  scopeType: string;
  scopeId: number | null;
  createdAt: string;
  createdByUserId: number;
}

export const employeesApi = {
  // employeesApi.list
  list: (storeId: number) =>
    request<Employee[]>(`/merchant/${storeId}/employees`),
  // employeesApi.invite
  invite: (storeId: number, data: { name: string; email: string; password: string; role: string }) =>
    request<Employee>(`/merchant/${storeId}/employees/invite`, { method: 'POST', body: JSON.stringify(data) }),
  // employeesApi.update
  update: (storeId: number, employeeId: number, data: { role?: string; isActive?: boolean }) =>
    request<Employee>(`/merchant/${storeId}/employees/${employeeId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  // employeesApi.remove
  remove: (storeId: number, employeeId: number) =>
    request<{ success: true }>(`/merchant/${storeId}/employees/${employeeId}`, { method: 'DELETE' }),

  // Permissions API
  // GET /permissions - returns catalog grouped by category
  getPermissions: (storeId: number) =>
    request<{ permissions: PermissionInfo[]; grouped: Record<string, PermissionInfo[]> }>(
      `/merchant/${storeId}/permissions`
    ),
  // GET /permission-presets - returns presets
  getPermissionPresets: (storeId: number) =>
    request<PermissionPreset[]>(`/merchant/${storeId}/permission-presets`),
  // GET /memberships/:membershipId/permissions - returns specific member's permissions
  getMemberPermissions: (storeId: number, membershipId: number) =>
    request<{ membershipId: number; permissions: MembershipPermission[] }>(
      `/merchant/${storeId}/memberships/${membershipId}/permissions`
    ),
  // PATCH /memberships/:membershipId/permissions - updates member's permissions
  updateMemberPermissions: (storeId: number, membershipId: number, permissions: Array<{
    permissionKey: string;
    scopeType: 'store' | 'branch' | 'warehouse' | 'channel';
    scopeId?: number;
  }>) =>
    request<{ membershipId: number; permissions: MembershipPermission[] }>(
      `/merchant/${storeId}/memberships/${membershipId}/permissions`,
      { method: 'PATCH', body: JSON.stringify({ permissions }) }
    ),
};

export const onboardingApi = {
  generateProducts: (storeId: number, data: { category?: string; count?: number }) =>
    aiApi.generateProducts(storeId, data),
};

export const marketingApi = {
  overview: (storeId: number, dateFrom?: string, dateTo?: string) => {
    const q = new URLSearchParams();
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    const qs = q.toString();
    return request<any>(`/merchant/${storeId}/marketing/overview${qs ? `?${qs}` : ''}`);
  },
  products: (storeId: number, dateFrom?: string, dateTo?: string) => {
    const q = new URLSearchParams();
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    const qs = q.toString();
    return request<any>(`/merchant/${storeId}/marketing/products${qs ? `?${qs}` : ''}`);
  },
  sources: (storeId: number, dateFrom?: string, dateTo?: string) => {
    const q = new URLSearchParams();
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    const qs = q.toString();
    return request<any>(`/merchant/${storeId}/marketing/sources${qs ? `?${qs}` : ''}`);
  },
  insights: (storeId: number, dateFrom?: string, dateTo?: string) => {
    const q = new URLSearchParams();
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    const qs = q.toString();
    return request<any[]>(`/merchant/${storeId}/marketing/insights${qs ? `?${qs}` : ''}`);
  },
  aggregate: (storeId: number, dateFrom?: string, dateTo?: string) => {
    const q = new URLSearchParams();
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    const qs = q.toString();
    return request<{ ok: boolean }>(`/merchant/${storeId}/marketing/aggregate${qs ? `?${qs}` : ''}`, { method: 'POST' });
  },
};

export const promotionsApi = {
  list: (storeId: number, params?: { search?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return request<any[]>(`/merchant/${storeId}/promotions${qs ? `?${qs}` : ''}`);
  },
  getById: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/promotions/${id}`),
  create: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/promotions`, { method: 'POST', body: JSON.stringify(data) }),
  update: (storeId: number, id: number, data: any) =>
    request<any>(`/merchant/${storeId}/promotions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (storeId: number, id: number) =>
    request<void>(`/merchant/${storeId}/promotions/${id}`, { method: 'DELETE' }),
};

export const policiesApi = {
  list: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/policies`),
  getByType: (storeId: number, type: string) =>
    request<any>(`/merchant/${storeId}/policies/${type}`),
  upsert: (storeId: number, type: string, data: { title: string; content: string }) =>
    request<any>(`/merchant/${storeId}/policies/${type}`, { method: 'PUT', body: JSON.stringify(data) }),
  publish: (storeId: number, type: string) =>
    request<any>(`/merchant/${storeId}/policies/${type}/publish`, { method: 'POST', body: JSON.stringify({ publish: true }) }),
  unpublish: (storeId: number, type: string) =>
    request<any>(`/merchant/${storeId}/policies/${type}/publish`, { method: 'POST', body: JSON.stringify({ publish: false }) }),
  generatePreview: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/policies/generate-preview`, { method: 'POST', body: JSON.stringify(data) }),
  applyGenerated: (storeId: number, data: { confirmation: true; generatedPolicies: { type: string; title: string; content: string }[] }) =>
    request<any>(`/merchant/${storeId}/policies/apply-generated`, { method: 'POST', body: JSON.stringify(data) }),
};

export const abandonedCartsApi = {
  list: (storeId: number, hours: number = 24) =>
    request<any[]>(`/merchant/${storeId}/abandoned-carts?hours=${hours}`),
  stats: (storeId: number, hours: number = 24) =>
    request<{ count: number; recoverableTotal: string }>(`/merchant/${storeId}/abandoned-carts/stats?hours=${hours}`),
};

export const exportsApi = {
  products: (storeId: number) => `/merchant/${storeId}/exports/products`,
  orders: (storeId: number) => `/merchant/${storeId}/exports/orders`,
  customers: (storeId: number) => `/merchant/${storeId}/exports/customers`,
  wallet: (storeId: number) => `/merchant/${storeId}/exports/wallet`,
};

export const apiKeysApi = {
  list: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/api-keys`),
  create: (storeId: number, name: string, scopes: string[]) =>
    request<{ id: number; name: string; key: string; prefix: string; scopes: string[] }>(
      `/merchant/${storeId}/api-keys`,
      { method: 'POST', body: JSON.stringify({ name, scopes }) },
    ),
  revoke: (storeId: number, keyId: number) =>
    request<{ revoked: boolean }>(`/merchant/${storeId}/api-keys/${keyId}`, { method: 'DELETE' }),
  getScopes: (storeId: number) =>
    request<string[]>(`/merchant/${storeId}/api-keys/scopes`),
  logs: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/api-keys/logs`),
};

export const couponsApi = {
  list: (storeId: number, params?: { search?: string; status?: string }) => {
    const q = new URLSearchParams();
    if (params?.search) q.set('search', params.search);
    if (params?.status) q.set('status', params.status);
    const qs = q.toString();
    return request<any[]>(`/merchant/${storeId}/coupons${qs ? `?${qs}` : ''}`);
  },
  getById: (storeId: number, id: number) =>
    request<any>(`/merchant/${storeId}/coupons/${id}`),
  create: (storeId: number, data: any) =>
    request<any>(`/merchant/${storeId}/coupons`, { method: 'POST', body: JSON.stringify(data) }),
  update: (storeId: number, id: number, data: any) =>
    request<any>(`/merchant/${storeId}/coupons/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (storeId: number, id: number) =>
    request<void>(`/merchant/${storeId}/coupons/${id}`, { method: 'DELETE' }),
};

export const importsApi = {
  preview: (storeId: number, csvContent: string) =>
    request<any>(`/merchant/${storeId}/imports/products/preview`, { method: 'POST', body: JSON.stringify({ csvContent }) }),
  confirm: (storeId: number, csvContent: string) =>
    request<any>(`/merchant/${storeId}/imports/products/confirm`, { method: 'POST', body: JSON.stringify({ csvContent }) }),
  templateUrl: (storeId: number) =>
    `/merchant/${storeId}/imports/products/template`,
};

export const marketplaceApi = {
  syncAll: (storeId: number) =>
    request<{ results: Array<{ providerCode: string; ordersResult: { itemsSynced: number; itemsFailed: number; status: string; error?: string } }>; totalSynced: number; totalFailed: number }>(
      `/merchant/${storeId}/marketplaces/sync-all`, { method: 'POST' },
    ),
  syncLogs: (storeId: number, params?: { page?: number; limit?: number; type?: string }) => {
    const q = new URLSearchParams();
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    if (params?.type) q.set('type', params.type);
    const qs = q.toString();
    return request<{ logs: Array<{ id: number; providerCode: string; providerName: string; syncType: string; status: string; itemsSynced: number; itemsFailed: number; errorMessage: string | null; startedAt: string; completedAt: string | null }>; pagination: { page: number; limit: number; total: number; totalPages: number } }>(
      `/merchant/${storeId}/marketplaces/sync-logs${qs ? `?${qs}` : ''}`,
    );
  },
  publishProduct: (storeId: number, provider: string, data: { productId: number; price?: string; quantity?: number }) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/publish`, { method: 'POST', body: JSON.stringify(data) }),
  hub: (storeId: number) =>
    request<{
      summary: { totalSales: string; totalOrders: number; connectedCount: number; activeCount: number };
      providers: Array<{
        code: string; name: string; isConnected: boolean; status: string;
        storeName: string | null; storeEmail: string | null; externalStoreId: string | null;
        lastSyncAt: string | null;
        totalSales: string; totalOrders: number; totalListings: number; currency: string;
      }>;
      syncLogs: Array<{
        id: number; providerCode: string; providerName: string;
        syncType: string; status: string;
        itemsSynced: number; itemsFailed: number; errorMessage: string | null;
        startedAt: string; completedAt: string | null;
      }>;
    }>(`/merchant/${storeId}/marketplaces/hub`),
  list: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/marketplaces`),
  summary: (storeId: number) =>
    request<any[]>(`/merchant/${storeId}/marketplaces/summary`),
  connect: (storeId: number, provider: string, credentials: Record<string, unknown>) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/connect`, { method: 'POST', body: JSON.stringify({ credentials }) }),
  disconnect: (storeId: number, provider: string) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/disconnect`, { method: 'POST' }),
  getInfo: (storeId: number, provider: string) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/info`),
  listListings: (storeId: number, provider: string) =>
    request<any[]>(`/merchant/${storeId}/marketplaces/${provider}/listings`),
  createListing: (storeId: number, provider: string, data: Record<string, unknown>) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/listings`, { method: 'POST', body: JSON.stringify(data) }),
  updateListing: (storeId: number, provider: string, listingId: number, data: Record<string, unknown>) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/listings/${listingId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteListing: (storeId: number, provider: string, listingId: number) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/listings/${listingId}`, { method: 'DELETE' }),
  syncOrders: (storeId: number, provider: string) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/sync/orders`, { method: 'POST' }),
  syncInventory: (storeId: number, provider: string, items: Array<{ sku: string; quantity: number }>) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/sync/inventory`, { method: 'POST', body: JSON.stringify({ items }) }),
  syncProducts: (storeId: number, provider: string) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/sync/products`, { method: 'POST' }),
  getSales: (storeId: number, provider: string, from?: string, to?: string) =>
    request<any>(`/merchant/${storeId}/marketplaces/${provider}/sales${from ? `?from=${from}&to=${to}` : ''}`),
};

// Support
export interface SupportTicketItem {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  subject: string;
  message: string;
  status: string;
  priority: string;
  createdAt: string;
}

export interface SupportTicketDetail extends SupportTicketItem {
  messages: Array<{
    id: number;
    authorType: string;
    authorId: number | null;
    message: string;
    isStaffReply: boolean;
    createdAt: string;
  }>;
}

export interface KbArticleItem {
  id: number;
  title: string;
  slug: string;
  content: string;
  category: string | null;
  isPublished: boolean;
  sortOrder: number;
  createdAt: string;
}

export const supportApi = {
  createTicket: (storeId: number, data: { name: string; email?: string; phone?: string; subject: string; message: string }) =>
    request<SupportTicketItem>(`/merchant/${storeId}/support/tickets`, { method: 'POST', body: JSON.stringify(data) }),
  listTickets: (storeId: number, status?: string) =>
    request<{ tickets: SupportTicketItem[]; count: number; limit: number; offset: number }>(
      `/merchant/${storeId}/support/tickets${status ? `?status=${status}` : ''}`,
    ),
  getTicket: (storeId: number, ticketId: number) =>
    request<SupportTicketDetail>(`/merchant/${storeId}/support/tickets/${ticketId}`),
  updateStatus: (storeId: number, ticketId: number, status: string) =>
    request<SupportTicketItem>(`/merchant/${storeId}/support/tickets/${ticketId}/status`, { method: 'PUT', body: JSON.stringify({ status }) }),
  updatePriority: (storeId: number, ticketId: number, priority: string) =>
    request<SupportTicketItem>(`/merchant/${storeId}/support/tickets/${ticketId}/priority`, { method: 'PUT', body: JSON.stringify({ priority }) }),
  reply: (storeId: number, ticketId: number, message: string, authorType: string = 'merchant', isStaffReply: boolean = true) =>
    request<any>(`/merchant/${storeId}/support/tickets/${ticketId}/reply`, { method: 'POST', body: JSON.stringify({ message, authorType, isStaffReply }) }),
  deleteTicket: (storeId: number, ticketId: number) =>
    request<{ id: number }>(`/merchant/${storeId}/support/tickets/${ticketId}`, { method: 'DELETE' }),
  listArticles: (storeId: number) =>
    request<{ articles: KbArticleItem[]; categories: string[] }>(`/merchant/${storeId}/support/kb`),
  getArticle: (storeId: number, articleId: number) =>
    request<KbArticleItem>(`/merchant/${storeId}/support/kb/${articleId}`),
  createArticle: (storeId: number, data: { title: string; slug: string; content: string; category?: string; isPublished?: boolean; sortOrder?: number }) =>
    request<KbArticleItem>(`/merchant/${storeId}/support/kb`, { method: 'POST', body: JSON.stringify(data) }),
  updateArticle: (storeId: number, articleId: number, data: Partial<{ title: string; slug: string; content: string; category: string | null; isPublished: boolean; sortOrder: number }>) =>
    request<KbArticleItem>(`/merchant/${storeId}/support/kb/${articleId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteArticle: (storeId: number, articleId: number) =>
    request<{ id: number }>(`/merchant/${storeId}/support/kb/${articleId}`, { method: 'DELETE' }),
};

// WhatsApp Local pairing (WA-PR-2).
//
// The pairing flow is: POST /pair to start, then subscribe to the
// /qr-stream Server-Sent Events endpoint to receive `qr` /
// `connected` / `disconnected` / `failure` events as they happen.
// EventSource carries Authorization via `credentials: 'include'`
// using the cookie session — but our `request()` helper attaches
// the Authorization header itself, which EventSource cannot. So we
// pass the token in the URL only for the SSE channel, and only the
// SSE channel; mutating calls keep using `request()`.
const apiBase = BASE_URL;
function getActiveStoreId(): number {
  const id = Number(localStorage.getItem('active_store_id'));
  return Number.isFinite(id) && id > 0 ? id : 0;
}
export const whatsappApi = {
  pair: () =>
    request<{ status: 'disconnected' | 'pairing' | 'connected' }>(
      `/merchant/${getActiveStoreId()}/whatsapp/pair`,
      { method: 'POST' },
    ),
  status: () =>
    request<{ status: 'disconnected' | 'pairing' | 'connected' }>(
      `/merchant/${getActiveStoreId()}/whatsapp/status`,
    ),
  disconnect: () =>
    request<{ status: 'disconnected' }>(
      `/merchant/${getActiveStoreId()}/whatsapp/disconnect`,
      { method: 'POST' },
    ),
  /**
   * EventSource for the /qr-stream SSE channel. EventSource cannot
   * attach an Authorization header, so the token is appended as a
   * query param. The route reads it via the same JWT verification
   * helper that consumes Authorization headers.
   */
  openQrStream(): EventSource {
    const token = getToken();
    const url = `${apiBase}/merchant/${getActiveStoreId()}/whatsapp/qr-stream${
      token ? `?token=${encodeURIComponent(token)}` : ''
    }`;
    return new EventSource(url, { withCredentials: true });
  },
};

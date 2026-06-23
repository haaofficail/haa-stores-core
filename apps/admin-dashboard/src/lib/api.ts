export interface SettlementBatch {
  id: number;
  provider: string;
  providerBatchId: string | null;
  currency: string;
  grossAmount: string;
  gatewayFees: string;
  platformFees: string;
  merchantPayable: string;
  status: string;
  reconciledAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementTransaction {
  id: number;
  storeId: number;
  settlementBatchId: number | null;
  provider: string;
  providerTransactionId: string;
  orderId: number | null;
  orderNumber: string | null;
  amount: string;
  currency: string;
  gatewayFees: string;
  platformFees: string;
  merchantPayable: string;
  status: string;
  reconciliationStatus: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementBatchDetail extends SettlementBatch {
  transactions: SettlementTransaction[];
}

export interface Payout {
  id: number;
  storeId: number;
  walletAccountId: number;
  amount: string;
  currency: string;
  status: string;
  reference: string;
  bankAccountId: number | null;
  requestedByUserId: number | null;
  reviewedByUserId: number | null;
  approvedByUserId: number | null;
  transferredByUserId: number | null;
  verifiedByUserId: number | null;
  rejectedByUserId: number | null;
  rejectionReason: string | null;
  failureReason: string | null;
  internalNotes: string | null;
  publicNotes: string | null;
  metadata: Record<string, unknown> | null;
  requestedAt: string;
  reviewedAt: string | null;
  approvedAt: string | null;
  processedAt: string | null;
  transferredAt: string | null;
  verifiedAt: string | null;
  paidAt: string | null;
  failedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransferProof {
  id: number;
  payoutRequestId: number;
  bankReference: string;
  bankName: string;
  amount: string;
  currency: string;
  transferredAt: string;
  transferredByUserId: number;
  beneficiaryName: string;
  beneficiaryIbanMasked: string;
  proofFileKey: string | null;
  notes: string | null;
  verificationStatus: string;
  verifiedByUserId: number | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface PayoutEvent {
  id: number;
  payoutRequestId: number;
  storeId: number;
  actorUserId: number | null;
  actorRole: string | null;
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  amount: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface PayoutDetail extends Payout {
  proofs: TransferProof[];
  events: PayoutEvent[];
}

export interface UploadProofData {
  bankReference: string;
  bankName: string;
  transferredAt: string;
  beneficiaryName: string;
  beneficiaryIbanMasked: string;
  proofFileKey?: string;
  notes?: string;
}

// ─── Minimal domain interfaces (only fields consumers access) ────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  message?: string;
  issues?: ApiIssue[];
}

export interface ApiIssue {
  message: string;
}

export interface AdminTenant {
  id: number;
  name: string;
  email: string;
  status: string;
}

export interface AdminStore {
  id: number;
  name: string;
  domain: string;
  tenantId: number;
  isActive: boolean;
}

export interface AdminKycProfile {
  id: number;
  storeId: number;
  status: string;
}

// Shape returned by /admin/stores/:storeId/billing-settings (matches
// the consumer's local RawSettings in StoreBillingSettings.tsx).
export interface BillingSettingsRaw {
  id: number;
  storeId: number;
  platformFeeMode: string;
  platformFeePct: string | null;
  platformFeeFixed: string | null;
  isPlatformFeeEnabled: boolean;
  effectiveFrom: string | null;
  updatedAt: string;
  updatedBy: number | null;
  changeReason: string | null;
  createdAt: string;
}

// Inner result returned by PATCH /admin/stores/:storeId/billing-settings
// (after `request<T>` strips the { success, data, error } wrapper).
export interface BillingSettingsUpdateResult {
  settings: BillingSettingsRaw | null;
  effectivePolicyLabel: string;
}

const BASE = import.meta.env.VITE_API_URL || '/api';

function getToken(): string | null {
  return localStorage.getItem('admin_token');
}

function decodeBase64Url(value: string): string {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  return atob(padded);
}

export function getAdminPermissions(): string[] {
  const token = getToken();
  if (!token) return [];
  const [, payload] = token.split('.');
  if (!payload) return [];
  try {
    const decoded = JSON.parse(decodeBase64Url(payload)) as { permissions?: unknown };
    return Array.isArray(decoded.permissions) ? decoded.permissions.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

export function hasAdminPermission(permission: string): boolean {
  const permissions = getAdminPermissions();
  return permissions.includes('admin:*') || permissions.includes(permission);
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('تعذر الاتصال بالخادم. تأكد من تشغيل الخادم.');
  }

  if (res.status === 401) {
    localStorage.removeItem('admin_token');
    window.location.href = '/login';
    throw new Error('انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.');
  }

  let data: ApiResponse<T>;
  try {
    data = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new Error('استجابة غير متوقعة من الخادم');
  }
  if (!data.success) {
    const msg = data.error?.message || data.error?.issues?.map((i: ApiIssue) => i.message).join('؛ ') || 'Request failed';
    throw new Error(msg);
  }
  return data.data as T;
}

export const adminApi = {
  login: (email: string, password: string) => request<{ token: string; user: { id: number; name: string; email: string } }>('POST', '/admin/login', { email, password }),
  dashboard: () => request<{ tenants: number; stores: number; users: number; orders: number; pendingKyc: number }>('GET', '/admin/dashboard'),
  getTenants: () => request<AdminTenant[]>('GET', '/admin/tenants'),
  createTenant: (data: Record<string, unknown>) => request<AdminTenant>('POST', '/admin/tenants', data),
  updateTenant: (id: number, data: Record<string, unknown>) => request<AdminTenant>('PATCH', `/admin/tenants/${id}`, data),
  deleteTenant: (id: number) => request<Record<string, unknown>>('DELETE', `/admin/tenants/${id}`),
  updateTenantStatus: (id: number, status: string) => request<Record<string, unknown>>('PATCH', `/admin/tenants/${id}/status`, { status }),
  getStores: () => request<AdminStore[]>('GET', '/admin/stores'),
  createStore: (data: Record<string, unknown>) => request<AdminStore>('POST', '/admin/stores', data),
  updateStore: (id: number, data: Record<string, unknown>) => request<AdminStore>('PATCH', `/admin/stores/${id}`, data),
  deleteStore: (id: number) => request<Record<string, unknown>>('DELETE', `/admin/stores/${id}`),
  updateStoreStatus: (id: number, isActive: boolean) => request<Record<string, unknown>>('PATCH', `/admin/stores/${id}/status`, { isActive }),
  getKycProfiles: () => request<AdminKycProfile[]>('GET', '/admin/kyc'),
  reviewKyc: (id: number, status: string, rejectionReason?: string) => request<AdminKycProfile>('PATCH', `/admin/kyc/${id}/review`, { status, rejectionReason }),
  getPayments: () => request<Record<string, unknown>[]>('GET', '/admin/payments'),
  getMarketplaceSummary: () => request<Record<string, unknown>>('GET', '/admin/marketplace/summary'),
  getMarketplaceProducts: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<Record<string, unknown>[]>('GET', `/admin/marketplace/products${qs}`);
  },
  reviewMarketplaceProduct: (id: number, status: 'pending' | 'approved' | 'rejected' | 'suspended', note?: string) =>
    request<Record<string, unknown>>('PATCH', `/admin/marketplace/products/${id}/review`, { status, note }),
  featureMarketplaceProduct: (id: number, data: { featured: boolean; featuredUntil?: string | null; sortOrder?: number }) =>
    request<Record<string, unknown>>('PATCH', `/admin/marketplace/products/${id}/feature`, data),
  getMarketplaceSellers: () => request<Record<string, unknown>[]>('GET', '/admin/marketplace/sellers'),
  getMarketplaceOrders: () => request<Record<string, unknown>[]>('GET', '/admin/marketplace/orders'),
  getMarketplaceSettlements: () => request<Record<string, unknown>[]>('GET', '/admin/marketplace/settlements'),
  getMarketplaceDeepReport: () => request<Record<string, unknown>>('GET', '/admin/marketplace/deep-report'),
  getSettlementBatches: (storeId?: number) => {
    const qs = storeId ? `?storeId=${storeId}` : '';
    return request<SettlementBatch[]>('GET', `/admin/settlements/batches${qs}`);
  },
  getSettlementBatchDetail: (batchId: number) =>
    request<SettlementBatchDetail>('GET', `/admin/settlements/batches/${batchId}`),
  listPayouts: (status?: string) => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<Payout[]>('GET', `/admin/settlements/manual-payouts${qs}`);
  },
  getPayout: (payoutId: number) =>
    request<PayoutDetail>('GET', `/admin/settlements/manual-payouts/${payoutId}`),
  reviewPayout: (payoutId: number) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/review`),
  approvePayout: (payoutId: number) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/approve`),
  rejectPayout: (payoutId: number, reason: string) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/reject`, { reason }),
  markTransferPending: (payoutId: number) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/mark-transfer-pending`),
  markTransferred: (payoutId: number) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/mark-transferred`),
  uploadProof: (payoutId: number, data: UploadProofData) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/upload-proof`, data),
  uploadFile: async (file: File) => {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${BASE}/admin/upload`, { method: 'POST', headers, body: formData });
    const data = await res.json() as {
      success: boolean;
      data?: { url: string; key: string; thumbUrl?: string; sizeBytes: number };
      error?: { message?: string };
    };
    if (!data.success || !data.data) throw new Error(data.error?.message || 'Upload failed');
    return data.data;
  },
  verifyTransfer: (payoutId: number) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/verify-transfer`),
  cancelPayout: (payoutId: number, reason: string) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/cancel`, { reason }),
  reversePayout: (payoutId: number, reason: string) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/reverse`, { reason }),
  getAuditLogs: () => request<Record<string, unknown>[]>('GET', '/admin/audit'),
  getPlans: () => request<Record<string, unknown>[]>('GET', '/admin/plans'),
  updatePlan: (id: number, data: Record<string, unknown>) => request<Record<string, unknown>>('PATCH', `/admin/plans/${id}`, data),
  getSettings: () => request<{ name: string; slug: string; logoUrl: string | null; faviconUrl: string | null }>('GET', '/admin/settings'),
  updateSettings: (data: { name: string; logoUrl?: string | null; faviconUrl?: string | null }) => request<Record<string, unknown>>('PUT', '/admin/settings', data),
  getStoreBillingSettings: (storeId: number) =>
    request<{
      storeId: number; storeName: string;
      settings: BillingSettingsRaw | null;
      effectivePolicy: { mode: string; pct: number | null; fixed: number | null; enabled: boolean };
      effectivePolicyLabel: string;
    }>('GET', `/admin/stores/${storeId}/billing-settings`),
  updateStoreBillingSettings: (storeId: number, data: {
    platformFeeMode?: string;
    platformFeePct?: number | null;
    platformFeeFixed?: number | null;
    isPlatformFeeEnabled?: boolean | null;
    changeReason?: string | null;
  }) => request<BillingSettingsUpdateResult>('PATCH', `/admin/stores/${storeId}/billing-settings`, data),
};

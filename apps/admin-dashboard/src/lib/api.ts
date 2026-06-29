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
  // Batch 4B/4C: receipt content type + sha256 + matched transfer amount. The
  // backend zod schema enforces these; the accountant detail page always sends
  // them. Optional here so the legacy super_admin upload form still compiles.
  fileMimeType?: string;
  sha256?: string;
  transferredAmount?: string;
  currency?: string;
  notes?: string;
}

export interface AccountantDetailBank {
  bankName: string;
  accountHolderName: string;
  ibanLast4: string | null;
  maskedIban: string | null;
  verificationStatus: string;
}

export interface AccountantDetailProof {
  receiptId: number;
  sha256: string | null;
  fileMimeType: string | null;
  bankReference: string;
  bankName: string;
  transferDate: string;
  transferredAmount: string;
  currency: string;
}

export interface AccountantDetailEvent {
  eventType: string;
  fromStatus: string | null;
  toStatus: string | null;
  actorRole: string | null;
  amount: string | null;
  createdAt: string;
}

export interface AccountantDetail {
  payoutId: number;
  storeId: number;
  merchantName: string;
  amount: string;
  currency: string;
  status: string;
  reference: string;
  period: string | null;
  ordersCount: number | null;
  dueDate: string | null;
  bankAccount: AccountantDetailBank | null;
  transferProof: AccountantDetailProof | null;
  events: AccountantDetailEvent[];
  canRevealIban: boolean;
  awaitingSecondApproval: boolean;
  canSecondApprove: boolean;
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

/** Generate a fresh Idempotency-Key for a state-changing financial action. */
export function newIdempotencyKey(): string {
  return (globalThis.crypto?.randomUUID?.() ?? `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`);
}

async function request<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Batch 4A: sensitive payout actions require an Idempotency-Key so a
  // double-click / retry can't run the same financial transition twice.
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;
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

export interface AccountantInboxItem {
  settlementId: number;
  reference: string;
  merchantName: string;
  netAmount: string;
  currency: string;
  period: string | null;
  ordersCount: number | null;
  status: string;
  bankAccountStatus: string;
  ibanLast4: string | null;
  dueDate: string | null;
  needsSecondApproval: boolean;
  exceptionReason?: string;
}

export interface AccountantInbox {
  ready: AccountantInboxItem[];
  exceptions: AccountantInboxItem[];
}

export interface FinanceReportRow {
  settlementId: string;
  payoutId: number;
  storeName: string;
  amount: string;
  currency: string;
  status: string;
  transferDate: string | null;
  bankReference: string | null;
  bankName: string | null;
  receiptId: number | null;
  sha256: string | null;
  fileMimeType: string | null;
  accountantId: number | null;
  secondApproverId: number | null;
  reconciliationStatus: string;
  stuck: boolean;
}

export interface FinanceReports {
  archive: FinanceReportRow[];
  reconciliation: FinanceReportRow[];
  stuck: FinanceReportRow[];
  stuckAfterHours: number;
  generatedAt: string;
}

export const adminApi = {
  login: (email: string, password: string) => request<{ token: string; user: { id: number; name: string; email: string } }>('POST', '/admin/login', { email, password }),
  dashboard: () => request<{ tenants: number; stores: number; users: number; orders: number; pendingKyc: number }>('GET', '/admin/dashboard'),
  getTenants: () => request<AdminTenant[]>('GET', '/admin/tenants'),
  createTenant: (data: Record<string, unknown>) => request<AdminTenant>('POST', '/admin/tenants', data),
  updateTenant: (id: number, data: Record<string, unknown>) => request<AdminTenant>('PATCH', `/admin/tenants/${id}`, data),
  deleteTenant: (id: number) => request<Record<string, unknown>>('DELETE', `/admin/tenants/${id}`),
  updateTenantStatus: (id: number, status: string, statusReason: string) =>
    request<Record<string, unknown>>('PATCH', `/admin/tenants/${id}/status`, { status, statusReason }),
  getStores: () => request<AdminStore[]>('GET', '/admin/stores'),
  createStore: (data: Record<string, unknown>) => request<AdminStore>('POST', '/admin/stores', data),
  updateStore: (id: number, data: Record<string, unknown>) => request<AdminStore>('PATCH', `/admin/stores/${id}`, data),
  deleteStore: (id: number) => request<Record<string, unknown>>('DELETE', `/admin/stores/${id}`),
  updateStoreStatus: (id: number, isActive: boolean, statusReason: string) =>
    request<Record<string, unknown>>('PATCH', `/admin/stores/${id}/status`, { isActive, statusReason }),
  getKycProfiles: () => request<AdminKycProfile[]>('GET', '/admin/kyc'),
  reviewKyc: (id: number, status: string, rejectionReason?: string) => request<AdminKycProfile>('PATCH', `/admin/kyc/${id}/review`, { status, rejectionReason }),
  getBankAccounts: () => request<Record<string, unknown>[]>('GET', '/admin/kyc/bank-accounts'),
  reviewBankAccount: (id: number, status: 'verified' | 'rejected', reviewReason: string) =>
    request<Record<string, unknown>>('PATCH', `/admin/kyc/bank-accounts/${id}/review`, { status, reviewReason }),
  getSettlementReadiness: (storeId: number) => request<Record<string, unknown>>('GET', `/admin/stores/${storeId}/settlement-readiness`),
  updateSettlementReadiness: (storeId: number, data: Record<string, unknown>) => request<Record<string, unknown>>('PATCH', `/admin/stores/${storeId}/settlement-readiness`, data),
  getStorePaymentSettings: (storeId: number) => request<Record<string, unknown>[]>('GET', `/admin/stores/${storeId}/payment-settings`),
  upsertStorePaymentSettings: (storeId: number, data: Record<string, unknown>) => request<Record<string, unknown>>('PUT', `/admin/stores/${storeId}/payment-settings`, data),
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
  // Accountant Settlement Inbox (READ-ONLY): ready queue + exceptions.
  getAccountantInbox: () =>
    request<AccountantInbox>('GET', '/admin/settlements/accountant-inbox'),
  getPayout: (payoutId: number) =>
    request<PayoutDetail>('GET', `/admin/settlements/manual-payouts/${payoutId}`),
  reviewPayout: (payoutId: number, key = newIdempotencyKey()) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/review`, undefined, key),
  approvePayout: (payoutId: number, key = newIdempotencyKey()) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/approve`, undefined, key),
  rejectPayout: (payoutId: number, reason: string, key = newIdempotencyKey()) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/reject`, { reason }, key),
  markTransferPending: (payoutId: number, key = newIdempotencyKey()) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/mark-transfer-pending`, undefined, key),
  markTransferred: (payoutId: number, key = newIdempotencyKey()) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/mark-transferred`, undefined, key),
  uploadProof: (payoutId: number, data: UploadProofData, key = newIdempotencyKey()) =>
    request<Payout>('POST', `/admin/settlements/manual-payouts/${payoutId}/upload-proof`, data, key),
  // Batch 4E/UI: accountant settlement detail (masked) + audited IBAN reveal.
  getAccountantDetail: (payoutId: number) =>
    request<AccountantDetail>('GET', `/admin/settlements/${payoutId}/accountant-detail`),
  secondApprovePayout: (payoutId: number, key = newIdempotencyKey()) =>
    request<Payout>('POST', `/admin/settlements/${payoutId}/second-approve`, undefined, key),
  secondRejectPayout: (payoutId: number, reason: string, key = newIdempotencyKey()) =>
    request<Payout>('POST', `/admin/settlements/${payoutId}/second-reject`, { reason }, key),
  getFinanceReports: () =>
    request<FinanceReports>('GET', '/admin/settlements/finance-reports'),
  revealIban: (payoutId: number, action: 'view' | 'copy') =>
    request<{ payoutId: number; storeId: number; bankName: string; accountHolderName: string; ibanLast4: string | null; iban: string }>(
      'POST', `/admin/settlements/${payoutId}/reveal-iban`, { action }),
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
  getAdminUsers: () => request<Record<string, unknown>[]>('GET', '/admin/users'),
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

// ─── Landing Contacts (PR #157) ──────────────────────────────────────────────
// Inbox for landing-page contact form submissions. Response shapes are
// intentionally `unknown` — consumers narrow with a local LandingContact
// interface so the API client stays loosely coupled to schema drift
// (matches the post-P2-030 pattern used by getPayments/getAuditLogs above).

export interface LandingContactsListResponse {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const landingContactsApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const query = qs.toString();
    return request<LandingContactsListResponse>(
      'GET',
      `/admin/landing-contacts${query ? `?${query}` : ''}`,
    );
  },
  getById: (id: number) =>
    request<unknown>('GET', `/admin/landing-contacts/${id}`),
  update: (id: number, body: { status?: string; adminNotes?: string | null }) =>
    request<unknown>('PATCH', `/admin/landing-contacts/${id}`, body),
};

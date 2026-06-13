export type OrderStatus =
  | 'draft'
  | 'checkout_started'
  | 'pending_payment'
  | 'payment_failed'
  | 'confirmed'
  | 'processing'
  | 'ready_to_ship'
  | 'ready_for_pickup'
  | 'shipped'
  | 'delivered'
  | 'picked_up'
  | 'completed'
  | 'cancelled'
  | 'returned'
  | 'refunded'
  | 'partially_refunded';

export type PaymentStatus =
  | 'unpaid'
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'
  | 'expired';

export type FulfillmentStatus =
  | 'unfulfilled'
  | 'partially_fulfilled'
  | 'fulfilled';

export type ShipmentStatus =
  | 'draft'
  | 'label_created'
  | 'pickup_requested'
  | 'picked_up'
  | 'in_transit'
  | 'out_for_delivery'
  | 'delivered'
  | 'delivery_failed'
  | 'returned_to_sender'
  | 'cancelled'
  | 'creation_failed';

export type ProductStatus = 'draft' | 'active' | 'archived';
export type ProductType = 'physical' | 'digital' | 'service';

export type StoreStatus = 'active' | 'suspended' | 'closed';

export type WalletEntryType =
  | 'sale'
  | 'payment_fee'
  | 'platform_fee'
  | 'shipping_fee'
  | 'refund'
  | 'adjustment'
  | 'payout'
  | 'payout_debit'
  | 'payout_reversal'
  | 'cod_receivable'
  | 'cod_fee';

export type WalletEntryDirection = 'credit' | 'debit';

export type WalletEntryStatus =
  | 'pending'
  | 'available'
  | 'settled'
  | 'cancelled'
  | 'disputed';

export type WebhookEventStatus = 'pending' | 'delivered' | 'failed';
export type PaymentMethod = 'fake_card_success' | 'fake_card_failed' | 'bank_transfer' | 'cash_on_delivery'
  | 'geidea_card'
  | 'moyasar_creditcard' | 'moyasar_mada' | 'moyasar_applepay' | 'moyasar_stcpay'
  | 'tabby_installments' | 'tamara_installments';
export type ProviderCode = 'fake' | 'geidea' | 'moyasar' | 'tabby' | 'tamara';
export type PaymentMode = 'fake' | 'sandbox' | 'live';

export const PROVIDER_CODES: ProviderCode[] = ['fake', 'geidea', 'moyasar', 'tabby', 'tamara'];
export const PAYMENT_MODES: PaymentMode[] = ['fake', 'sandbox', 'live'];
export const SAFE_PAYMENT_MODES: PaymentMode[] = ['fake', 'sandbox'];

export type InternalPaymentStatus =
  | 'initiated'
  | 'pending'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed';

export const INTERNAL_PAYMENT_STATUSES: InternalPaymentStatus[] = [
  'initiated', 'pending', 'authorized', 'paid', 'failed',
  'cancelled', 'expired', 'refunded', 'partially_refunded', 'disputed',
];

export interface PaymentProviderCapabilities {
  supportsRefunds: boolean;
  supportsPartialRefunds: boolean;
  supportsMada: boolean;
  supportsApplePay: boolean;
  supportsCard: boolean;
  supportsBankTransfer: boolean;
  supportsStcPay: boolean;
  supportsBNPL: boolean;
}

export type WebhookEventType =
  | 'store.created'
  | 'store.updated'
  | 'product.created'
  | 'product.updated'
  | 'order.created'
  | 'order.paid'
  | 'order.cancelled'
  | 'order.shipped'
  | 'order.delivered'
  | 'payment.succeeded'
  | 'payment.failed'
  | 'shipment.created'
  | 'shipment.delivered'
  | 'wallet.entry.created'
  | 'payout.requested';

export type AuditAction =
  | 'login'
  | 'failed_login'
  | 'admin_login'
  | 'admin_login_failed'
  | 'store_created'
  | 'store_updated'
  | 'store_published'
  | 'store_unpublished'
  | 'store_restricted'
  | 'store_suspended'
  | 'product_created'
  | 'product_updated'
  | 'product_archived'
  | 'product_bulk_updated'
  | 'product_marketplace_sync_failed'
  | 'order_status_changed'
  | 'payment_status_changed'
  | 'shipment_status_changed'
  | 'wallet_entry_created'
  | 'bank_account_changed'
  | 'shipping_settings_changed'
  | 'payment_settings_changed'
  | 'policy_updated'
  | 'policy_published'
  | 'policy_unpublished'
  | 'commercial_registration_updated'
  | 'vat_number_updated'
  | 'payment_settings_changed'
  | 'return_settings_changed'
  | 'staff_role_changed'
  | 'admin_store_suspended'
  | 'product_image_uploaded'
  | 'product_image_deleted'
  | 'export_products'
  | 'export_orders'
  | 'export_customers'
  | 'export_wallet'
  | 'import_products'
  | 'refund_processed'
  | 'kyc_reviewed'
  | 'compliance_check_failed'
  | 'policy_updated'
  | 'policy_published'
  | 'policy_unpublished'
  | 'commercial_registration_updated'
  | 'vat_number_updated'
  | 'customer_data_exported'
  | 'merchant_acknowledgement';

export type UserRole = 'owner' | 'manager' | 'products_manager' | 'orders_manager' | 'accountant' | 'support' | 'viewer';

export type Permission =
  | 'stores:read'
  | 'stores:update'
  | 'products:read'
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'categories:manage'
  | 'brands:manage'
  | 'tags:manage'
  | 'orders:read'
  | 'orders:update_status'
  | 'orders:cancel'
  | 'orders:refund'
  | 'customers:read'
  | 'wallet:read'
  | 'wallet:request_payout'
  | 'wallet.payout.request'
  | 'wallet.payout.review'
  | 'wallet.payout.approve'
  | 'wallet.payout.reject'
  | 'wallet.payout.mark_transferred'
  | 'wallet.payout.upload_proof'
  | 'wallet.payout.verify_transfer'
  | 'wallet.payout.cancel'
  | 'wallet.payout.reverse'
  | 'wallet.payout.view_all'
  | 'wallet.payout.view_store'
  | 'shipping:manage'
  | 'settings:update'
  | 'staff:manage'
  | 'reports:read'
  | 'coupons:read'
  | 'coupons:create'
  | 'coupons:update'
  | 'coupons:delete'
  | 'promotions:read'
  | 'promotions:create'
  | 'promotions:update'
  | 'promotions:delete'
  | 'exports:create'
  | 'imports:create'
  | 'settings:read'
  | 'storefront:read'
  | 'compliance:read'
  | 'compliance:write'
  | 'compliance:submit'
  | 'compliance:documents'
  | 'compliance:review'
  | 'support:read'
  | 'support:create'
  | 'support:update'
  | 'support:delete';

export type KycStatus =
  | 'not_started'
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'needs_more_info'
  | 'suspended';

export type BusinessType =
  | 'individual'
  | 'establishment'
  | 'company'
  | 'freelancer'
  | 'productive_family';

export type KycDocumentType =
  | 'commercial_registration'
  | 'freelance_document'
  | 'vat_certificate'
  | 'national_id'
  | 'iban_certificate'
  | 'bank_letter'
  | 'other';

export type BankAccountStatus =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'rejected'
  | 'needs_more_info';

export interface AdminJwtPayload {
  userId: number;
  isAdmin: boolean;
  permissions: string[];
}

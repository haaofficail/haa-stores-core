export type OrderStatus =
  | 'draft'
  | 'checkout_started'
  | 'pending_payment'
  | 'awaiting_3ds' // 3DS challenge in progress (SAMA mandatory)
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
  | 'requires_3ds' // 3DS challenge in progress (SAMA mandatory)
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

/**
 * PreparationStatus tracks the merchant's packing workflow for a delivery order.
 * Separate from fulfillmentStatus (which reflects post-delivery completion).
 *
 * Transitions: not_started → preparing → prepared → packed
 * Reverse transitions require admin role + reason (audit-gated).
 */
export type PreparationStatus =
  | 'not_started'
  | 'preparing'
  | 'prepared'
  | 'packed';

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
  | 'cod_fee'
  // Added in TASK-0033 (Session #1) — see audit Phase 4-5 for the
  // gateway_fee + settlement_difference work coming in Session #2.
  | 'gateway_fee'
  | 'settlement_difference';

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
  | 'requires_3ds'
  | 'authorized'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partially_refunded'
  | 'disputed';

export const INTERNAL_PAYMENT_STATUSES: InternalPaymentStatus[] = [
  'initiated', 'pending', 'requires_3ds', 'authorized', 'paid', 'failed',
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
  supports3DS: boolean;
}

export type WebhookEventType =
  | 'store.created'
  | 'store.updated'
  | 'product.created'
  | 'product.updated'
  | 'product.marketplace_sync_failed'
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
  // Multi-membership user hit /auth/login; refused to auto-pick a
  // tenant. The follow-up /auth/select-store call audits as
  // 'login_select_store' or 'login_cross_tenant_rejected'.
  // Added with the cross-store isolation P0 (2026-06-25).
  | 'login_tenant_selection_required'
  | 'login_select_store'
  | 'login_cross_tenant_rejected'
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
  | 'order_preparation_status_changed'
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
  | 'payout_requested'
  | 'tenant_status_changed'
  | 'bank_account.iban_revealed_for_payout'
  | 'bank_account.iban_copied_for_payout'
  // PDPL — merchant self-service data export + account deletion
  | 'store_deactivated'
  // Employee management
  | 'employee_invited'
  | 'employee_role_changed'
  | 'employee_status_changed'
  | 'employee_removed'
  | 'employee_last_owner_blocked'
  | 'employee_self_restriction_blocked'
  | 'employee_invalid_role_rejected'
  | 'employee_duplicate_rejected'
  | 'employee_permission_update_unsupported'
  | 'employee_permissions_updated'
  | 'kyc_reviewed'
  | 'compliance_check_failed'
  | 'policy_updated'
  | 'policy_published'
  | 'policy_unpublished'
  | 'commercial_registration_updated'
  | 'vat_number_updated'
  | 'customer_data_exported'
  | 'merchant_acknowledgement'
  | 'store_billing_settings_updated'
  // Marketplace admin moderation (TASK-0040 Track 1C — P0-5)
  | 'marketplace_product_review'
  | 'marketplace_product_feature'
  // HAA-AUTH-PASSWORD-RESET — emitted by confirmPasswordReset after the
  // user's password_hash is rotated and token_version is bumped.
  | 'password_reset_completed';

export type UserRole =
  | 'owner'
  | 'admin'
  | 'manager'
  | 'products_manager'
  | 'orders_manager'
  | 'warehouse_staff'
  | 'accountant'
  | 'support'
  | 'viewer';

export type Permission =
  | 'stores:read'
  | 'stores:update'
  | 'dashboard:view'
  | 'products:read'
  | 'products:create'
  | 'products:update'
  | 'products:delete'
  | 'products:export'
  | 'products:import'
  | 'categories:manage'
  | 'brands:manage'
  | 'tags:manage'
  | 'orders:read'
  | 'orders:update_status'
  | 'orders:cancel'
  | 'orders:refund'
  | 'orders:export'
  | 'orders:view_sensitive'
  | 'customers:read'
  | 'customers:create'
  | 'customers:update'
  | 'customers:delete'
  | 'customers:export'
  | 'customers:view_sensitive'
  | 'wallet:read'
  | 'wallet:withdraw'
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
  | 'marketplace.review'
  | 'marketplace.feature'
  | 'billing.platform_fee.read'
  | 'billing.platform_fee.update'
  | 'shipping:manage'
  | 'settings:view'
  | 'settings:update'
  | 'staff:manage'
  | 'ai:read'
  | 'ai:execute'
  | 'reports:view'
  | 'reports:export'
  | 'reports:read'
  | 'coupons:read'
  | 'coupons:create'
  | 'coupons:update'
  | 'coupons:delete'
  | 'promotions:read'
  | 'promotions:create'
  | 'promotions:update'
  | 'promotions:delete'
  | 'policies:update'
  | 'abandoned_carts:view'
  | 'theme:view'
  | 'theme:apply'
  | 'theme:update'
  | 'theme:publish'
  | 'employees:view'
  | 'employees:invite'
  | 'employees:update'
  | 'employees:delete'
  | 'employees:manage_permissions'
  | 'api_keys:view'
  | 'api_keys:create'
  | 'api_keys:revoke'
  | 'compliance:view'
  | 'compliance:update'
  | 'compliance:submit'
  | 'compliance:write'
  | 'compliance:read'
  | 'compliance:documents'
  | 'compliance:review'
  | 'subscriptions:view'
  | 'subscriptions:manage'
  | 'notifications:view'
  | 'notifications:update'
  | 'exports:create'
  | 'imports:create'
  | 'settings:read'
  | 'storefront:read'
  | 'support:read'
  | 'support:create'
  | 'support:update'
  | 'support:delete';

export type AdminPermission =
  | 'dashboard:view'
  | 'tenants.read'
  | 'tenants.create'
  | 'tenants.update'
  | 'tenants.delete'
  | 'tenants.status.update'
  | 'stores.read'
  | 'stores.create'
  | 'stores.update'
  | 'stores.delete'
  | 'stores.status.update'
  | 'kyc.read'
  | 'kyc.review'
  | 'payments.read'
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
  | 'wallet.payout.second_approve'
  | 'wallet.payout.export'
  | 'merchant.bank_accounts.view'
  | 'merchant.bank_accounts.verify_for_payout'
  | 'merchant.bank_accounts.reveal_iban_for_payout'
  | 'finance.dashboard.view'
  | 'finance.audit_log.view'
  | 'finance.reconciliation.view'
  | 'marketplace.read'
  | 'marketplace.review'
  | 'marketplace.feature'
  | 'audit.read'
  | 'webhooks.read'
  | 'plans.read'
  | 'plans.update'
  | 'platform.settings.read'
  | 'platform.settings.update'
  | 'platform.media.upload'
  | 'users.read'
  | 'billing.platform_fee.read'
  | 'billing.platform_fee.update'
  | 'landing_contacts.read'
  | 'landing_contacts.update';

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

import type { AuditAction } from './orders.js';

export type { AuditAction } from './orders.js';

export interface AuditLogEntry {
  id: number;
  actorUserId: number | null;
  tenantId: number | null;
  storeId: number | null;
  action: AuditAction;
  entityType: string;
  entityId: number | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface AuditLogListParams {
  page?: number;
  limit?: number;
  action?: AuditAction;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AuditLogListResult {
  data: AuditLogEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  login: 'تسجيل دخول',
  failed_login: 'فشل تسجيل الدخول',
  admin_login: 'دخول الإدارة',
  admin_login_failed: 'فشل دخول الإدارة',
  store_created: 'إنشاء متجر',
  store_updated: 'تعديل المتجر',
  store_published: 'نشر المتجر',
  store_unpublished: 'إلغاء نشر المتجر',
  store_restricted: 'تقييد المتجر',
  store_suspended: 'إيقاف المتجر',
  product_created: 'إضافة منتج',
  product_updated: 'تعديل منتج',
  product_archived: 'أرشفة منتج',
  product_bulk_updated: 'تحديث منتجات جماعي',
  product_marketplace_sync_failed: 'فشل مزامنة منتج مع السوق',
  order_status_changed: 'تغيير حالة الطلب',
  payment_status_changed: 'تغيير حالة الدفع',
  shipment_status_changed: 'تغيير حالة الشحن',
  wallet_entry_created: 'إضافة قيد مالي',
  bank_account_changed: 'تغيير الحساب البنكي',
  shipping_settings_changed: 'تغيير إعدادات الشحن',
  payment_settings_changed: 'تغيير إعدادات الدفع',
  return_settings_changed: 'تغيير إعدادات الإرجاع',
  staff_role_changed: 'تغيير صلاحيات الموظف',
  admin_store_suspended: 'إيقاف المتجر من الإدارة',
  product_image_uploaded: 'رفع صورة منتج',
  product_image_deleted: 'حذف صورة منتج',
  export_products: 'تصدير المنتجات',
  export_orders: 'تصدير الطلبات',
  export_customers: 'تصدير العملاء',
  export_wallet: 'تصدير المحفظة',
  import_products: 'استيراد المنتجات',
  refund_processed: 'معالجة استرداد',
  payout_requested: 'طلب سحب أرباح',
  kyc_reviewed: 'مراجعة بيانات التحقق',
  compliance_check_failed: 'فشل فحص الامتثال',
  policy_updated: 'تحديث سياسة',
  policy_published: 'نشر سياسة',
  policy_unpublished: 'إلغاء نشر سياسة',
  commercial_registration_updated: 'تحديث السجل التجاري',
  vat_number_updated: 'تحديث الرقم الضريبي',
  customer_data_exported: 'تصدير بيانات العملاء',
  merchant_acknowledgement: 'إقرار التاجر',
  employee_invited: 'إضافة موظف',
  employee_role_changed: 'تغيير دور الموظف',
  employee_status_changed: 'تغيير حالة الموظف',
  employee_removed: 'حذف موظف',
  employee_last_owner_blocked: 'منع حذف آخر مالك',
  employee_self_restriction_blocked: 'منع تقييد النفس',
  employee_invalid_role_rejected: 'رفض دور غير صالح',
  employee_duplicate_rejected: 'رفض موظف مكرر',
  employee_permission_update_unsupported: 'محاولة تعديل صلاحيات غير مدعومة',
  employee_permissions_updated: 'تحديث صلاحيات الموظف',
  store_billing_settings_updated: 'تحديث إعدادات رسوم المتجر',
};

export const AUDIT_ENTITY_LABELS: Record<string, string> = {
  store: 'المتجر',
  product: 'المنتج',
  order: 'الطلب',
  customer: 'العميل',
  payment: 'الدفع',
  shipment: 'الشحن',
  policy: 'السياسة',
  settings: 'الإعدادات',
  user: 'المستخدم',
  wallet: 'المحفظة',
  coupon: 'الكوبون',
  category: 'التصنيف',
  brand: 'الماركة',
  bank_account: 'الحساب البنكي',
  kyc: 'بيانات التحقق',
  employee: 'الموظف',
};

import type { Permission, UserRole } from './types/orders.js';

export interface PermissionInfo {
  key: Permission;
  labelAr: string;
  descriptionAr: string;
  category: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedForRoles: string[];
}

export const PERMISSION_CATALOG: PermissionInfo[] = [
  // ── Dashboard ──
  { key: 'dashboard:view', labelAr: 'عرض لوحة التحكم', descriptionAr: 'عرض الصفحة الرئيسية للوحة التحكم والإحصائيات الموجزة', category: 'dashboard', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager', 'staff', 'viewer'] },

  // ── Store ──
  { key: 'stores:read', labelAr: 'عرض المتجر', descriptionAr: 'عرض بيانات المتجر والإعدادات العامة', category: 'store', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager', 'viewer'] },
  { key: 'stores:update', labelAr: 'تحديث المتجر', descriptionAr: 'تحديث بيانات المتجر العامة', category: 'store', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },

  // ── Products ──
  { key: 'products:read', labelAr: 'عرض المنتجات', descriptionAr: 'عرض قائمة المنتجات وتفاصيلها', category: 'products', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager', 'staff', 'viewer'] },
  { key: 'products:create', labelAr: 'إضافة منتج', descriptionAr: 'إضافة منتج جديد للمتجر', category: 'products', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'products:update', labelAr: 'تعديل المنتج', descriptionAr: 'تعديل بيانات المنتج الحالي', category: 'products', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'products:delete', labelAr: 'حذف المنتج', descriptionAr: 'حذف المنتج بشكل نهائي أو أرشفته', category: 'products', riskLevel: 'high', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'products:export', labelAr: 'تصدير المنتجات', descriptionAr: 'تصدير قائمة المنتجات إلى ملف', category: 'products', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'products:import', labelAr: 'استيراد المنتجات', descriptionAr: 'استيراد منتجات من ملف', category: 'products', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },

  // ── Categories / Brands / Tags ──
  { key: 'categories:manage', labelAr: 'إدارة التصنيفات', descriptionAr: 'إضافة وتعديل وحذف التصنيفات', category: 'categories', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'brands:manage', labelAr: 'إدارة الماركات', descriptionAr: 'إضافة وتعديل وحذف الماركات التجارية', category: 'brands', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'tags:manage', labelAr: 'إدارة التاجات', descriptionAr: 'إضافة وتعديل وحذف التاجات والوسوم', category: 'tags', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },

  // ── Orders ──
  { key: 'orders:read', labelAr: 'عرض الطلبات', descriptionAr: 'عرض قائمة الطلبات وتفاصيلها', category: 'orders', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager', 'staff', 'viewer'] },
  { key: 'orders:update_status', labelAr: 'تحديث حالة الطلب', descriptionAr: 'تحديث حالة الطلب (تأكيد، تجهيز، شحن، توصيل)', category: 'orders', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager', 'staff'] },
  { key: 'orders:cancel', labelAr: 'إلغاء الطلب', descriptionAr: 'إلغاء الطلب قبل الشحن', category: 'orders', riskLevel: 'high', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'orders:refund', labelAr: 'استرداد الطلب', descriptionAr: 'استرداد قيمة الطلب كاملة أو جزئية', category: 'orders', riskLevel: 'critical', recommendedForRoles: ['owner', 'admin'] },
  { key: 'orders:export', labelAr: 'تصدير الطلبات', descriptionAr: 'تصدير قائمة الطلبات إلى ملف', category: 'orders', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'orders:view_sensitive', labelAr: 'عرض بيانات الطلب الحساسة', descriptionAr: 'عرض بيانات العميل الحساسة في الطلب (رقم الجوال، العنوان)', category: 'orders', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },

  // ── Customers ──
  { key: 'customers:read', labelAr: 'عرض العملاء', descriptionAr: 'عرض قائمة العملاء وتفاصيلهم', category: 'customers', riskLevel: 'high', recommendedForRoles: ['owner', 'admin', 'manager', 'staff', 'viewer'] },
  { key: 'customers:create', labelAr: 'إضافة عميل', descriptionAr: 'إضافة عميل جديد', category: 'customers', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'customers:update', labelAr: 'تعديل العميل', descriptionAr: 'تعديل بيانات العميل', category: 'customers', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'customers:delete', labelAr: 'حذف العميل', descriptionAr: 'حذف العميل', category: 'customers', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },
  { key: 'customers:export', labelAr: 'تصدير العملاء', descriptionAr: 'تصدير قائمة العملاء إلى ملف', category: 'customers', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },
  { key: 'customers:view_sensitive', labelAr: 'عرض بيانات العميل الحساسة', descriptionAr: 'عرض بيانات العملاء الحساسة', category: 'customers', riskLevel: 'critical', recommendedForRoles: ['owner', 'admin'] },

  // ── Shipping ──
  { key: 'shipping:manage', labelAr: 'إدارة الشحن', descriptionAr: 'إدارة طرق الشحن ومناطق الشحن والشحنات', category: 'shipping', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager', 'staff'] },

  // ── Wallet ──
  { key: 'wallet:read', labelAr: 'عرض المحفظة', descriptionAr: 'عرض رصيد المحفظة والمعاملات', category: 'wallet', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager', 'viewer'] },
  { key: 'wallet:withdraw', labelAr: 'سحب من المحفظة', descriptionAr: 'طلب سحب رصيد من المحفظة', category: 'wallet', riskLevel: 'critical', recommendedForRoles: ['owner', 'admin'] },
  { key: 'wallet:request_payout', labelAr: 'طلب دفعة', descriptionAr: 'تقديم طلب صرف دفعة مالية', category: 'wallet', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },
  { key: 'wallet.payout.request', labelAr: 'طلب صرف', descriptionAr: 'إنشاء طلب صرف مالي', category: 'wallet_payout', riskLevel: 'high', recommendedForRoles: ['owner'] },
  { key: 'wallet.payout.review', labelAr: 'مراجعة طلب صرف', descriptionAr: 'مراجعة طلب الصرف المالي', category: 'wallet_payout', riskLevel: 'critical', recommendedForRoles: ['owner'] },
  { key: 'wallet.payout.approve', labelAr: 'اعتماد صرف', descriptionAr: 'اعتماد طلب الصرف المالي', category: 'wallet_payout', riskLevel: 'critical', recommendedForRoles: ['owner'] },
  { key: 'wallet.payout.reject', labelAr: 'رفض صرف', descriptionAr: 'رفض طلب الصرف المالي', category: 'wallet_payout', riskLevel: 'critical', recommendedForRoles: ['owner'] },
  { key: 'wallet.payout.mark_transferred', labelAr: 'تأكيد تحويل', descriptionAr: 'تأكيد تحويل المبلغ للمستفيد', category: 'wallet_payout', riskLevel: 'critical', recommendedForRoles: ['owner'] },
  { key: 'wallet.payout.upload_proof', labelAr: 'رفع إثبات تحويل', descriptionAr: 'رفع إثبات تحويل المبلغ', category: 'wallet_payout', riskLevel: 'high', recommendedForRoles: ['owner'] },
  { key: 'wallet.payout.verify_transfer', labelAr: 'التحقق من التحويل', descriptionAr: 'التحقق من اكتمال التحويل البنكي', category: 'wallet_payout', riskLevel: 'critical', recommendedForRoles: ['owner'] },
  { key: 'wallet.payout.cancel', labelAr: 'إلغاء طلب صرف', descriptionAr: 'إلغاء طلب الصرف قبل اكتماله', category: 'wallet_payout', riskLevel: 'high', recommendedForRoles: ['owner'] },
  { key: 'wallet.payout.reverse', labelAr: 'عكس صرف', descriptionAr: 'عكس عملية الصرف بعد اكتمالها', category: 'wallet_payout', riskLevel: 'critical', recommendedForRoles: ['owner'] },
  { key: 'wallet.payout.view_all', labelAr: 'عرض كل الطلبات', descriptionAr: 'عرض جميع طلبات الصرف', category: 'wallet_payout', riskLevel: 'high', recommendedForRoles: ['owner'] },
  { key: 'wallet.payout.view_store', labelAr: 'عرض طلبات المتجر', descriptionAr: 'عرض طلبات صرف المتجر', category: 'wallet_payout', riskLevel: 'medium', recommendedForRoles: ['owner'] },

  // ── Coupons ──
  { key: 'coupons:read', labelAr: 'عرض كوبونات الخصم', descriptionAr: 'عرض قائمة كوبونات الخصم', category: 'coupons', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'coupons:create', labelAr: 'إضافة كوبون', descriptionAr: 'إضافة كوبون خصم جديد', category: 'coupons', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'coupons:update', labelAr: 'تعديل الكوبون', descriptionAr: 'تعديل بيانات كوبون الخصم', category: 'coupons', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'coupons:delete', labelAr: 'حذف الكوبون', descriptionAr: 'حذف كوبون الخصم', category: 'coupons', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },

  // ── Offers / Promotions ──
  { key: 'promotions:read', labelAr: 'عرض العروض', descriptionAr: 'عرض قائمة العروض والتخفيضات', category: 'promotions', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'promotions:create', labelAr: 'إضافة عرض', descriptionAr: 'إضافة عرض أو تخفيض جديد', category: 'promotions', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'promotions:update', labelAr: 'تعديل العرض', descriptionAr: 'تعديل بيانات العرض', category: 'promotions', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'promotions:delete', labelAr: 'حذف العرض', descriptionAr: 'حذف العرض', category: 'promotions', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },

  // ── Pages / Policies ──
  { key: 'policies:update', labelAr: 'تحديث السياسات', descriptionAr: 'تعديل سياسات المتجر (الشحن، الاسترجاع، الخصوصية)', category: 'policies', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin'] },

  // ── Abandoned Carts ──
  { key: 'abandoned_carts:view', labelAr: 'عرض السلات المتروكة', descriptionAr: 'عرض قائمة سلات التسوق المتروكة', category: 'abandoned_carts', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager'] },

  // ── Reports ──
  { key: 'reports:read', labelAr: 'عرض التقارير', descriptionAr: 'عرض التقارير والإحصائيات', category: 'reports', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager', 'viewer'] },
  { key: 'reports:export', labelAr: 'تصدير التقارير', descriptionAr: 'تصدير التقارير إلى ملف', category: 'reports', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin'] },

  // ── Theme ──
  { key: 'theme:view', labelAr: 'عرض الثيم', descriptionAr: 'عرض إعدادات الثيم الحالي', category: 'theme', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'theme:apply', labelAr: 'تطبيق ثيم', descriptionAr: 'تطبيق ثيم جديد على المتجر', category: 'theme', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },
  { key: 'theme:update', labelAr: 'تعديل الثيم', descriptionAr: 'تعديل ألوان وخطوط وإعدادات الثيم', category: 'theme', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin'] },
  { key: 'theme:publish', labelAr: 'نشر الثيم', descriptionAr: 'نشر الثيم ليكون مرئيًا للعملاء', category: 'theme', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },

  // ── Settings ──
  { key: 'settings:read', labelAr: 'عرض الإعدادات', descriptionAr: 'عرض إعدادات المتجر العامة', category: 'settings', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager', 'viewer'] },
  { key: 'settings:update', labelAr: 'تحديث الإعدادات', descriptionAr: 'تحديث إعدادات المتجر العامة', category: 'settings', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },

  // ── Employees ──
  { key: 'employees:view', labelAr: 'عرض الموظفين', descriptionAr: 'عرض قائمة موظفي المتجر', category: 'employees', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin'] },
  { key: 'employees:invite', labelAr: 'دعوة موظف', descriptionAr: 'إرسال دعوة لموظف جديد للانضمام للمتجر', category: 'employees', riskLevel: 'high', recommendedForRoles: ['owner'] },
  { key: 'employees:update', labelAr: 'تعديل الموظف', descriptionAr: 'تعديل بيانات وصلاحيات الموظف', category: 'employees', riskLevel: 'critical', recommendedForRoles: ['owner'] },
  { key: 'employees:delete', labelAr: 'حذف الموظف', descriptionAr: 'إزالة موظف من المتجر', category: 'employees', riskLevel: 'critical', recommendedForRoles: ['owner'] },
  { key: 'employees:manage_permissions', labelAr: 'إدارة الصلاحيات', descriptionAr: 'تعديل صلاحيات الموظفين', category: 'employees', riskLevel: 'critical', recommendedForRoles: ['owner'] },

  // ── API Keys ──
  { key: 'api_keys:view', labelAr: 'عرض مفاتيح API', descriptionAr: 'عرض مفاتيح الواجهة البرمجية', category: 'api_keys', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },
  { key: 'api_keys:create', labelAr: 'إنشاء مفتاح API', descriptionAr: 'إنشاء مفتاح واجهة برمجية جديد', category: 'api_keys', riskLevel: 'critical', recommendedForRoles: ['owner'] },
  { key: 'api_keys:revoke', labelAr: 'إلغاء مفتاح API', descriptionAr: 'إلغاء مفتاح واجهة برمجية', category: 'api_keys', riskLevel: 'critical', recommendedForRoles: ['owner'] },

  // ── Compliance ──
  { key: 'compliance:read', labelAr: 'عرض الامتثال', descriptionAr: 'عرض حالة الامتثال والمتطلبات', category: 'compliance', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'compliance:write', labelAr: 'تحديث الامتثال', descriptionAr: 'تحديث بيانات الامتثال', category: 'compliance', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },
  { key: 'compliance:submit', labelAr: 'تقديم الامتثال', descriptionAr: 'تقديم مستندات الامتثال للمنصة', category: 'compliance', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },
  { key: 'compliance:documents', labelAr: 'إدارة مستندات الامتثال', descriptionAr: 'رفع وحذف مستندات الامتثال', category: 'compliance', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },

  // ── Subscriptions ──
  { key: 'subscriptions:view', labelAr: 'عرض الباقات', descriptionAr: 'عرض الباقة الحالية وتفاصيل الاشتراك', category: 'subscriptions', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'viewer'] },
  { key: 'subscriptions:manage', labelAr: 'إدارة الباقة', descriptionAr: 'تغيير الباقة أو الترقية أو الإلغاء', category: 'subscriptions', riskLevel: 'critical', recommendedForRoles: ['owner'] },

  // ── Notifications ──
  { key: 'notifications:view', labelAr: 'عرض الإشعارات', descriptionAr: 'عرض إعدادات الإشعارات', category: 'notifications', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'notifications:update', labelAr: 'تحديث الإشعارات', descriptionAr: 'تحديث إعدادات الإشعارات', category: 'notifications', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin'] },

  // ── Export / Import ──
  { key: 'exports:create', labelAr: 'تصدير بيانات', descriptionAr: 'تصدير بيانات المتجر إلى ملف', category: 'export_import', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'imports:create', labelAr: 'استيراد بيانات', descriptionAr: 'استيراد بيانات إلى المتجر من ملف', category: 'export_import', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },

  // ── Storefront ──
  { key: 'storefront:read', labelAr: 'عرض المتجر', descriptionAr: 'عرض البيانات العامة للمتجر', category: 'storefront', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager', 'staff', 'viewer'] },

  // ── Support ──
  { key: 'support:read', labelAr: 'عرض التذاكر', descriptionAr: 'عرض تذاكر الدعم وقاعدة المعرفة', category: 'support', riskLevel: 'low', recommendedForRoles: ['owner', 'admin', 'manager', 'viewer'] },
  { key: 'support:create', labelAr: 'إنشاء تذكرة', descriptionAr: 'إنشاء تذكرة دعم جديدة', category: 'support', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'support:update', labelAr: 'تحديث التذكرة', descriptionAr: 'تحديث حالة وأولوية التذكرة والرد عليها', category: 'support', riskLevel: 'medium', recommendedForRoles: ['owner', 'admin', 'manager'] },
  { key: 'support:delete', labelAr: 'حذف التذكرة', descriptionAr: 'حذف تذكرة الدعم', category: 'support', riskLevel: 'high', recommendedForRoles: ['owner', 'admin'] },
];

export type PermissionCategory = (typeof PERMISSION_CATALOG)[number]['category'];

export function getPermissionsByCategory(category: string): PermissionInfo[] {
  return PERMISSION_CATALOG.filter(p => p.category === category);
}

export function getHighRiskPermissions(): PermissionInfo[] {
  return PERMISSION_CATALOG.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical');
}

export function getPermissionInfo(key: Permission): PermissionInfo | undefined {
  return PERMISSION_CATALOG.find(p => p.key === key);
}

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: [
    'stores:read',
    'stores:update',
    'dashboard:view',
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    'products:export',
    'products:import',
    'categories:manage',
    'brands:manage',
    'tags:manage',
    'orders:read',
    'orders:update_status',
    'orders:cancel',
    'orders:refund',
    'orders:export',
    'orders:view_sensitive',
    'customers:read',
    'customers:create',
    'customers:update',
    'customers:delete',
    'customers:export',
    'customers:view_sensitive',
    'wallet:read',
    'wallet:withdraw',
    'shipping:manage',
    'settings:read',
    'settings:update',
    'reports:read',
    'reports:export',
    'coupons:read',
    'coupons:create',
    'coupons:update',
    'coupons:delete',
    'promotions:read',
    'promotions:create',
    'promotions:update',
    'promotions:delete',
    'policies:update',
    'abandoned_carts:view',
    'theme:view',
    'theme:apply',
    'theme:update',
    'theme:publish',
    'employees:view',
    'employees:invite',
    'employees:update',
    'employees:delete',
    'employees:manage_permissions',
    'wallet:request_payout',
    'wallet.payout.request',
    'wallet.payout.review',
    'wallet.payout.approve',
    'wallet.payout.reject',
    'wallet.payout.mark_transferred',
    'wallet.payout.upload_proof',
    'wallet.payout.verify_transfer',
    'wallet.payout.cancel',
    'wallet.payout.reverse',
    'wallet.payout.view_all',
    'wallet.payout.view_store',
    'api_keys:view',
    'api_keys:create',
    'api_keys:revoke',
    'compliance:read',
    'compliance:write',
    'compliance:submit',
    'compliance:documents',
    'subscriptions:view',
    'subscriptions:manage',
    'notifications:view',
    'notifications:update',
    'exports:create',
    'imports:create',
    'storefront:read',
    'support:read',
    'support:create',
    'support:update',
    'support:delete',
  ],
  admin: [
    'stores:read',
    'dashboard:view',
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    'products:export',
    'products:import',
    'categories:manage',
    'brands:manage',
    'tags:manage',
    'orders:read',
    'orders:update_status',
    'orders:cancel',
    'orders:refund',
    'orders:export',
    'orders:view_sensitive',
    'customers:read',
    'customers:create',
    'customers:update',
    'customers:delete',
    'customers:export',
    'customers:view_sensitive',
    'wallet:read',
    'wallet:withdraw',
    'shipping:manage',
    'settings:read',
    'settings:update',
    'reports:read',
    'reports:export',
    'coupons:read',
    'coupons:create',
    'coupons:update',
    'coupons:delete',
    'promotions:read',
    'promotions:create',
    'promotions:update',
    'promotions:delete',
    'policies:update',
    'abandoned_carts:view',
    'theme:view',
    'theme:apply',
    'theme:update',
    'theme:publish',
    'employees:view',
    'api_keys:view',
    'compliance:read',
    'compliance:write',
    'compliance:submit',
    'compliance:documents',
    'subscriptions:view',
    'notifications:view',
    'notifications:update',
    'exports:create',
    'imports:create',
    'storefront:read',
    'support:read',
    'support:create',
    'support:update',
    'support:delete',
  ],
  manager: [
    'stores:read',
    'dashboard:view',
    'products:read',
    'products:create',
    'products:update',
    'categories:manage',
    'brands:manage',
    'tags:manage',
    'orders:read',
    'orders:update_status',
    'customers:read',
    'customers:create',
    'customers:update',
    'wallet:read',
    'shipping:manage',
    'settings:read',
    'reports:read',
    'coupons:read',
    'coupons:create',
    'coupons:update',
    'promotions:read',
    'promotions:create',
    'promotions:update',
    'abandoned_carts:view',
    'theme:view',
    'notifications:view',
    'exports:create',
    'storefront:read',
    'support:read',
    'support:create',
    'support:update',
  ],
  products_manager: [
    'products:read',
    'products:create',
    'products:update',
    'products:delete',
    'categories:manage',
    'brands:manage',
    'tags:manage',
  ],
  orders_manager: [
    'orders:read',
    'orders:update_status',
    'customers:read',
    'shipping:manage',
  ],
  accountant: [
    'orders:read',
    'orders:refund',
    'orders:export',
    'customers:read',
    'customers:export',
    'wallet:read',
    'reports:read',
    'exports:create',
  ],
  support: [
    'orders:read',
    'orders:update_status',
    'customers:read',
    'products:read',
  ],
  viewer: [
    'stores:read',
    'dashboard:view',
    'products:read',
    'orders:read',
    'customers:read',
    'wallet:read',
    'reports:read',
    'storefront:read',
    'support:read',
  ],
};

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

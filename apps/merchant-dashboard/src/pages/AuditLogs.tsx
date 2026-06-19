import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { auditApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChevronLeft, ChevronRight, Filter, X, History, AlertTriangle,
  Store, Package, ShoppingCart, CreditCard, Truck, FileText, Shield, User, Wallet, Tag,
} from 'lucide-react';

const AUDIT_ACTION_LABELS: Record<string, string> = {
  login: 'تسجيل دخول', failed_login: 'فشل تسجيل الدخول',
  admin_login: 'دخول الإدارة', admin_login_failed: 'فشل دخول الإدارة',
  store_created: 'إنشاء متجر', store_updated: 'تعديل المتجر',
  store_published: 'نشر المتجر', store_unpublished: 'إلغاء نشر المتجر',
  store_restricted: 'تقييد المتجر', store_suspended: 'إيقاف المتجر',
  product_created: 'إضافة منتج', product_updated: 'تعديل منتج', product_archived: 'أرشفة منتج',
  order_status_changed: 'تغيير حالة الطلب', payment_status_changed: 'تغيير حالة الدفع',
  shipment_status_changed: 'تغيير حالة الشحن', wallet_entry_created: 'إضافة قيد مالي',
  bank_account_changed: 'تغيير الحساب البنكي', shipping_settings_changed: 'تغيير إعدادات الشحن',
  payment_settings_changed: 'تغيير إعدادات الدفع', return_settings_changed: 'تغيير إعدادات الإرجاع',
  staff_role_changed: 'تغيير صلاحيات الموظف', admin_store_suspended: 'إيقاف المتجر من الإدارة',
  product_image_uploaded: 'رفع صورة منتج', product_image_deleted: 'حذف صورة منتج',
  export_products: 'تصدير المنتجات', export_orders: 'تصدير الطلبات',
  export_customers: 'تصدير العملاء', export_wallet: 'تصدير المحفظة',
  import_products: 'استيراد المنتجات', refund_processed: 'معالجة استرداد',
  kyc_reviewed: 'مراجعة بيانات التحقق', compliance_check_failed: 'فشل فحص الامتثال',
  policy_updated: 'تحديث سياسة', policy_published: 'نشر سياسة', policy_unpublished: 'إلغاء نشر سياسة',
  commercial_registration_updated: 'تحديث السجل التجاري', vat_number_updated: 'تحديث الرقم الضريبي',
  customer_data_exported: 'تصدير بيانات العملاء',
};

const AUDIT_ENTITY_LABELS: Record<string, string> = {
  store: 'المتجر', product: 'المنتج', order: 'الطلب', customer: 'العميل',
  payment: 'الدفع', shipment: 'الشحن', policy: 'السياسة', settings: 'الإعدادات',
  user: 'المستخدم', wallet: 'المحفظة', coupon: 'الكوبون', category: 'التصنيف',
  brand: 'الماركة', bank_account: 'الحساب البنكي', kyc: 'بيانات التحقق',
};

type AuditAction = keyof typeof AUDIT_ACTION_LABELS;

const ACTION_ICONS: Record<string, typeof Store> = {
  store: Store,
  product: Package,
  order: ShoppingCart,
  payment: CreditCard,
  shipment: Truck,
  policy: FileText,
  kyc: Shield,
  user: User,
  wallet: Wallet,
  settings: Tag,
};

const ACTION_COLORS: Record<string, string> = {
  store_published: 'bg-green-100 text-green-700',
  store_unpublished: 'bg-neutral-100 text-neutral-700',
  store_restricted: 'bg-orange-100 text-orange-700',
  store_suspended: 'bg-red-100 text-red-700',
  compliance_check_failed: 'bg-red-100 text-red-700',
  policy_published: 'bg-green-100 text-green-700',
  policy_unpublished: 'bg-neutral-100 text-neutral-700',
  policy_updated: 'bg-primary-100 text-primary-700',
  payment_settings_changed: 'bg-purple-100 text-purple-700',
  shipping_settings_changed: 'bg-cyan-100 text-cyan-700',
  return_settings_changed: 'bg-amber-100 text-amber-700',
  commercial_registration_updated: 'bg-indigo-100 text-indigo-700',
  vat_number_updated: 'bg-indigo-100 text-indigo-700',
  customer_data_exported: 'bg-rose-100 text-rose-700',
};

const ALL_ACTIONS: AuditAction[] = [
  'store_published', 'store_unpublished', 'store_restricted', 'store_suspended',
  'compliance_check_failed', 'policy_updated', 'policy_published', 'policy_unpublished',
  'payment_settings_changed', 'shipping_settings_changed', 'return_settings_changed',
  'commercial_registration_updated', 'vat_number_updated', 'customer_data_exported',
  'store_updated', 'product_created', 'product_updated', 'product_archived',
  'order_status_changed', 'payment_status_changed', 'shipment_status_changed',
  'kyc_reviewed', 'bank_account_changed', 'refund_processed',
];

const ENTITY_TYPES = ['store', 'product', 'order', 'payment', 'shipment', 'policy', 'kyc', 'user', 'wallet', 'settings'];

function ActionBadge({ action }: { action: string }) {
  const label = AUDIT_ACTION_LABELS[action as AuditAction] || action;
  const colorClass = ACTION_COLORS[action] || 'bg-neutral-100 text-neutral-700';
  return <Badge className={`${colorClass} border-0 text-xs`}>{label}</Badge>;
}

function EntityIcon({ entityType }: { entityType: string }) {
  const Icon = ACTION_ICONS[entityType] || Tag;
  return <Icon className="h-4 w-4 text-neutral-400" />;
}

const DIFF_VALUE_LABELS: Record<string, string> = {
  published: 'منشور', draft: 'مسودة', restricted: 'مقيد',
  true: 'نعم', false: 'لا',
};

function formatDiffKey(key: string): string {
  const translated = AUDIT_DIFF_KEY_LABELS[key];
  if (translated) return translated;
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .replace(/^./, (s) => s.toUpperCase());
}

const AUDIT_DIFF_KEY_LABELS: Record<string, string> = {
  returnWindowDays: 'أيام الإرجاع',
  returnWindow: 'فترة الإرجاع',
  freeReturns: 'الإرجاع المجاني',
};

function translateDiffValue(val: unknown): string {
  const s = String(val);
  return DIFF_VALUE_LABELS[s] || s;
}

function DiffView({ oldValue, newValue }: { oldValue: any; newValue: any }) {
  const { t } = useTranslation();
  if (!oldValue && !newValue) return null;
  const oldKeys = oldValue ? Object.keys(oldValue) : [];
  const newKeys = newValue ? Object.keys(newValue) : [];
  const allKeys = [...new Set([...oldKeys, ...newKeys])];
  if (allKeys.length === 0) return null;

  return (
    <div className="mt-2 text-xs space-y-1">
      {allKeys.slice(0, 5).map((key) => {
        const oldVal = oldValue?.[key];
        const newVal = newValue?.[key];
        if (oldVal === newVal) return null;
        return (
          <div key={key} className="flex gap-2 items-start">
            <span className="text-neutral-500 min-w-[80px] shrink-0">{t(`audit.diffKey_${key}`, formatDiffKey(key))}:</span>
            <div className="flex gap-1 items-center flex-wrap">
              {oldVal !== undefined && oldVal !== null && (
                <span className="line-through text-red-500/70">{translateDiffValue(oldVal).substring(0, 50)}</span>
              )}
              {oldVal !== undefined && oldVal !== null && newVal !== undefined && (
                <span className="text-neutral-400">←</span>
              )}
              {newVal !== undefined && newVal !== null && (
                <span className="text-green-600 font-medium">{translateDiffValue(newVal).substring(0, 50)}</span>
              )}
            </div>
          </div>
        );
      })}
      {allKeys.length > 5 && (
        <div className="text-neutral-400">{t('audit.more', '+{{count}} أكثر...', { count: allKeys.length - 5 })}</div>
      )}
    </div>
  );
}

export default function AuditLogs() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filterAction, setFilterAction] = useState<string>('');
  const [filterEntity, setFilterEntity] = useState<string>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const loadLogs = useCallback(async () => {
    if (!storeId) return;
    setLoading(true);
    try {
      const result = await auditApi.getLogs(storeId, {
        page,
        limit,
        action: filterAction || undefined,
        entityType: filterEntity || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setLogs(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [storeId, page, limit, filterAction, filterEntity, dateFrom, dateTo]);

  useEffect(() => { loadLogs(); }, [loadLogs]);

  const clearFilters = () => {
    setFilterAction('');
    setFilterEntity('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const hasFilters = filterAction || filterEntity || dateFrom || dateTo;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 flex items-center gap-2">
            <History className="h-6 w-6 text-primary-500" />
            {t('audit.title', 'سجل التغييرات')}
          </h1>
          <p className="text-sm text-neutral-500 mt-1">
            {t('audit.description', 'سجل جميع التغييرات الحساسة على متجرك')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4 ml-2" />
          {t('audit.filters', 'الفلاتر')}
          {hasFilters && <Badge className="mr-2 bg-primary-500 text-white border-0 h-5 w-5 p-0 flex items-center justify-center text-xs">!</Badge>}
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-xs text-neutral-500 mb-1 block">{t('audit.filterAction', 'نوع الحدث')}</Label>
                <Select value={filterAction} onValueChange={(v) => { setFilterAction(v === 'all' ? '' : v); setPage(1); }}>
                  <SelectTrigger><SelectValue placeholder={t('audit.allActions', 'جميع الأحداث')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('audit.allActions', 'جميع الأحداث')}</SelectItem>
                    {ALL_ACTIONS.map((a) => (
                      <SelectItem key={a} value={a}>{AUDIT_ACTION_LABELS[a]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-neutral-500 mb-1 block">{t('audit.filterEntity', 'المورد')}</Label>
                <Select value={filterEntity} onValueChange={(v) => { setFilterEntity(v === 'all' ? '' : v); setPage(1); }}>
                  <SelectTrigger><SelectValue placeholder={t('audit.allEntities', 'جميع الموارد')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('audit.allEntities', 'جميع الموارد')}</SelectItem>
                    {ENTITY_TYPES.map((e) => (
                      <SelectItem key={e} value={e}>{AUDIT_ENTITY_LABELS[e] || e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs text-neutral-500 mb-1 block">{t('audit.dateFrom', 'من تاريخ')}</Label>
                <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
              </div>
              <div>
                <Label className="text-xs text-neutral-500 mb-1 block">{t('audit.dateTo', 'إلى تاريخ')}</Label>
                <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
              </div>
            </div>
            {hasFilters && (
              <div className="mt-3 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-3.5 w-3.5 ml-1" />
                  {t('audit.clearFilters', 'مسح الفلاتر')}
                </Button>
                <span className="text-xs text-neutral-400">{total} نتيجة</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-neutral-600">
            {t('audit.logCount', '{{total}} سجل', { total })}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="divide-y divide-neutral-100">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4 flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center">
              <AlertTriangle className="h-12 w-12 text-neutral-200 mx-auto mb-4" />
              <p className="text-neutral-500">{t('audit.empty', 'لا توجد سجلات بعد')}</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {logs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-neutral-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0 mt-0.5">
                      <EntityIcon entityType={log.entityType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <ActionBadge action={log.action} />
                        <span className="text-xs text-neutral-400">
                          {AUDIT_ENTITY_LABELS[log.entityType] || log.entityType}
                          {log.entityId ? ` #${log.entityId}` : ''}
                        </span>
                      </div>
                      <DiffView oldValue={log.oldValue} newValue={log.newValue} />
                      <div className="flex items-center gap-3 mt-2 text-xs text-neutral-400">
                        <span>{new Date(log.createdAt).toLocaleString('ar-SA')}</span>
                        {log.ipAddress && <span>{t('audit.ip', 'IP')}: {log.ipAddress}</span>}
                        {log.actorUserId && <span>{t('audit.actorLabel', 'بواسطة')}: #{log.actorUserId}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500">
            {t('audit.pagination', 'صفحة {{page}} من {{totalPages}}', { page, totalPages })}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

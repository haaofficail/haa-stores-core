import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, DollarSign, ShoppingCart, MapPin, TrendingUp, Wallet, Download, Printer, Loader2 } from 'lucide-react';
import { reportsApi, getToken, type DeepReport } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';

const statusColors: Record<string, string> = {
  confirmed: 'bg-emerald-100 text-emerald-700',
  processing: 'bg-primary-100 text-primary-700',
  shipped: 'bg-purple-100 text-purple-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-red-100 text-red-700',
};

const BASE_URL = import.meta.env.VITE_API_URL || '/api';
type ReportRow = Record<string, string | number | null>;

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.join(','), ...rows.map(r => r.map(c => {
    if (c.includes(',') || c.includes('"') || c.includes('\n')) return `"${c.replace(/"/g, '""')}"`;
    return c;
  }).join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function MetricCell({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="bg-neutral-50 rounded-2xl p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-lg font-bold text-neutral-900 mt-1">{value ?? '-'}</p>
    </div>
  );
}

function DeepTable({
  title,
  rows,
  columns,
  onExport,
}: {
  title: string;
  rows: ReportRow[];
  columns: Array<{ key: string; label: string }>;
  onExport: () => void;
}) {
  return (
    <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
        <h3 className="font-bold text-lg text-neutral-900">{title}</h3>
        {rows.length > 0 && (
          <button
            onClick={onExport}
            className="text-neutral-400 hover:text-neutral-900 transition-colors print:hidden"
            title="تصدير CSV"
          >
            <Download className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="overflow-x-auto p-4">
        {rows.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-8">لا توجد بيانات</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-neutral-100 hover:bg-transparent">
                {columns.map(column => (
                  <TableHead key={column.key} className="h-9 text-sm text-neutral-500 font-medium whitespace-nowrap">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, index) => (
                <TableRow key={index} className="border-neutral-100 hover:bg-neutral-50">
                  {columns.map(column => (
                    <TableCell key={column.key} className="text-sm text-neutral-900 p-3 whitespace-nowrap">
                      {String(row[column.key] ?? '-')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

export default function Reports() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesSummary, setSalesSummary] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [ordersByStatus, setOrdersByStatus] = useState<any[]>([]);
  const [salesByCity, setSalesByCity] = useState<any[]>([]);
  const [lowStock, setLowStock] = useState<any[]>([]);
  const [walletSummary, setWalletSummary] = useState<any>(null);
  const [deepReport, setDeepReport] = useState<DeepReport | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const exportUrl = useMemo(() => {
    if (!storeId) return '';
    const q = new URLSearchParams();
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    const qs = q.toString();
    return `${BASE_URL}/merchant/${storeId}/reports/export${qs ? `?${qs}` : ''}`;
  }, [storeId, dateFrom, dateTo]);

  const handleExportSection = useCallback((section: string, headers: string[], rows: string[][]) => {
    downloadCsv(`${section}-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    toast.success(t('reports.exportSuccess'));
  }, [t]);

  const handleExportFull = useCallback(async () => {
    if (!storeId) return;
    setExporting(true);
    try {
      const token = getToken();
      const res = await fetch(exportUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sales-report-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t('reports.exportSuccess'));
    } catch {
      toast.error(t('common.error'));
    } finally {
      setExporting(false);
    }
  }, [storeId, exportUrl, t]);

  const loadReports = useCallback(() => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      reportsApi.salesSummary(storeId, dateFrom || undefined, dateTo || undefined).catch(() => null),
      reportsApi.topProducts(storeId, 10).catch(() => []),
      reportsApi.ordersByStatus(storeId).catch(() => []),
      reportsApi.salesByCity(storeId).catch(() => []),
      reportsApi.lowStock(storeId).catch(() => []),
      reportsApi.walletSummary(storeId).catch(() => null),
      reportsApi.deep(storeId, dateFrom || undefined, dateTo || undefined).catch(() => null),
    ]).then(([s, tp, obs, sbc, ls, ws, deep]) => {
      if (s) setSalesSummary(s);
      if (tp) setTopProducts(tp);
      if (obs) setOrdersByStatus(obs);
      if (sbc) setSalesByCity(sbc);
      if (ls) setLowStock(ls);
      if (ws) setWalletSummary(ws);
      if (deep) setDeepReport(deep);
    }).catch(() => toast.error(t('common.error')))
    .finally(() => setLoading(false));
  }, [storeId, dateFrom, dateTo, t]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const exportRecordRows = useCallback((section: string, rows: ReportRow[]) => {
    if (rows.length === 0) return;
    const headers = Object.keys(rows[0]);
    const values = rows.map(row => headers.map(header => String(row[header] ?? '')));
    handleExportSection(section, headers, values);
  }, [handleExportSection]);

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-bold text-neutral-900">{t('reports.title')}</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-36 rounded-3xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <style>{`
        @media print {
          body { background: white !important; }
          @page { margin: 1.5cm; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-neutral-900">{t('reports.title')}</h1>
        <div className="flex gap-2 items-center">
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-36 h-9 text-sm" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-36 h-9 text-sm" />
          <Button variant="outline" className="h-9 text-sm" onClick={loadReports}>{t('reports.update')}</Button>
          <div className="w-px h-6 bg-neutral-200" />
          <Button variant="outline" className="h-9 text-sm" onClick={handleExportFull} disabled={exporting}>
            {exporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
            {t('reports.exportFull')}
          </Button>
          <Button variant="outline" className="h-9 text-sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-1" />
            {t('reports.print')}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{t('reports.totalSales')}</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{formatCurrency(salesSummary?.totalSales ?? 0)} {t('common.sar')}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600"><DollarSign className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{t('reports.totalOrders')}</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{salesSummary?.totalOrders ?? 0}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-primary-50 text-primary-600"><ShoppingCart className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{t('reports.averageOrderValue')}</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{formatCurrency(salesSummary?.averageOrderValue ?? 0)} {t('common.sar')}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600"><TrendingUp className="h-5 w-5" /></div>
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500">{t('reports.netBalance')}</p>
              <p className="text-2xl font-bold text-neutral-900 mt-1">{formatCurrency(walletSummary?.netBalance ?? 0)} {t('common.sar')}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600"><Wallet className="h-5 w-5" /></div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
            <h3 className="font-bold text-lg text-neutral-900">{t('reports.topProducts')}</h3>
            {topProducts.length > 0 && (
              <button
                onClick={() => handleExportSection('top-products',
                  [t('reports.product'), t('reports.quantity'), t('reports.revenue')],
                  topProducts.map((p: any) => [p.name, String(p.totalQuantity ?? 0), `${formatCurrency(p.totalRevenue ?? 0)} ${t('common.sar')}`]
                ))}
                className="text-neutral-400 hover:text-neutral-900 transition-colors print:hidden"
                title={t('reports.exportCsv')}
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="p-4">
            {topProducts.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">{t('reports.noData')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-100 hover:bg-transparent">
                    <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('reports.product')}</TableHead>
                    <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('reports.quantity')}</TableHead>
                    <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('reports.revenue')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((p: any, i: number) => (
                    <TableRow key={i} className="border-neutral-100 hover:bg-neutral-50">
                      <TableCell className="text-sm font-medium text-neutral-900 p-3">{p.name}</TableCell>
                      <TableCell className="text-sm text-neutral-900 p-3">{p.totalQuantity ?? 0}</TableCell>
                      <TableCell className="text-sm font-semibold text-neutral-900 p-3">{formatCurrency(p.totalRevenue ?? 0)} {t('common.sar')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
            <h3 className="font-bold text-lg text-neutral-900">{t('reports.ordersByStatus')}</h3>
            {ordersByStatus.length > 0 && (
              <button
                onClick={() => handleExportSection('orders-by-status',
                  [t('reports.orderStatus'), t('reports.count')],
                  ordersByStatus.map((o: any) => [t(`orders.status_${o.status}`), String(o.count)]),
                )}
                className="text-neutral-400 hover:text-neutral-900 transition-colors print:hidden"
                title={t('reports.exportCsv')}
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="p-4">
            {ordersByStatus.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">{t('reports.noData')}</p>
            ) : (
              <div className="space-y-2">
                {ordersByStatus.map((o: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-3 px-4 rounded-2xl hover:bg-neutral-50">
                    <Badge className={`text-xs px-2.5 py-0.5 ${statusColors[o.status] ?? 'bg-neutral-100 text-neutral-700'}`}>
                      {t(`orders.status_${o.status}`)}
                    </Badge>
                    <span className="font-bold text-neutral-900">{o.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
            <h3 className="font-bold text-lg text-neutral-900">{t('reports.salesByCity')}</h3>
            {salesByCity.length > 0 && (
              <button
                onClick={() => handleExportSection('sales-by-city',
                  [t('reports.city'), t('reports.orders'), t('reports.sales')],
                  salesByCity.map((c: any) => [c.city || t('reports.unknownCity'), String(c.orderCount ?? 0), `${formatCurrency(c.totalSales ?? 0)} ${t('common.sar')}`]),
                )}
                className="text-neutral-400 hover:text-neutral-900 transition-colors print:hidden"
                title={t('reports.exportCsv')}
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="p-4">
            {salesByCity.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">{t('reports.noData')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-100 hover:bg-transparent">
                    <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('reports.city')}</TableHead>
                    <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('reports.orders')}</TableHead>
                    <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('reports.sales')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesByCity.map((c: any, i: number) => (
                    <TableRow key={i} className="border-neutral-100 hover:bg-neutral-50">
                      <TableCell className="text-sm font-medium text-neutral-900 p-3"><MapPin className="h-3.5 w-3.5 inline mr-1" />{c.city || t('reports.unknownCity')}</TableCell>
                      <TableCell className="text-sm text-neutral-900 p-3">{c.orderCount ?? 0}</TableCell>
                      <TableCell className="text-sm font-semibold text-neutral-900 p-3">{formatCurrency(c.totalSales ?? 0)} {t('common.sar')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
            <h3 className="font-bold text-lg text-neutral-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t('reports.lowStock')}
            </h3>
            {lowStock.length > 0 && (
              <button
                onClick={() => handleExportSection('low-stock',
                  [t('reports.product'), t('reports.stock'), t('reports.sku')],
                  lowStock.map((p: any) => [p.name, String(p.stockQuantity), p.sku || '-']),
                )}
                className="text-neutral-400 hover:text-neutral-900 transition-colors print:hidden"
                title={t('reports.exportCsv')}
              >
                <Download className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="p-4">
            {lowStock.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-8">{t('reports.lowStockNone')}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-100 hover:bg-transparent">
                    <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('reports.product')}</TableHead>
                    <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('reports.stock')}</TableHead>
                    <TableHead className="h-9 text-sm text-neutral-500 font-medium">{t('reports.sku')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStock.map((p: any) => (
                    <TableRow key={p.id} className="border-neutral-100 hover:bg-neutral-50">
                      <TableCell className="text-sm font-medium text-neutral-900 p-3">{p.name}</TableCell>
                      <TableCell className="text-sm font-bold text-red-500 p-3">{p.stockQuantity}</TableCell>
                      <TableCell className="text-sm font-mono text-neutral-400 p-3">{p.sku || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </div>

      {deepReport && (
        <div className="space-y-6">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-5">
              <div>
                <h2 className="text-xl font-bold text-neutral-900">التقارير العميقة</h2>
                <p className="text-sm text-neutral-500 mt-1">تفصيل محاسبي وتشغيلي قابل للتصدير والتدقيق.</p>
              </div>
              <Badge className="bg-neutral-100 text-neutral-700">
                آخر تحديث: {new Date(deepReport.generatedAt).toLocaleString('ar-SA')}
              </Badge>
            </div>
            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-5">
              <MetricCell label="المبيعات الصافية" value={`${formatCurrency(deepReport.financialBreakdown.netSales ?? 0)} ${t('common.sar')}`} />
              <MetricCell label="الخصومات" value={`${formatCurrency(deepReport.financialBreakdown.discounts ?? 0)} ${t('common.sar')}`} />
              <MetricCell label="الاستردادات" value={`${formatCurrency(deepReport.financialBreakdown.refunds ?? 0)} ${t('common.sar')}`} />
              <MetricCell label="رسوم الدفع" value={`${formatCurrency(deepReport.financialBreakdown.paymentFees ?? 0)} ${t('common.sar')}`} />
              <MetricCell label="رسوم المنصة" value={`${formatCurrency(deepReport.financialBreakdown.platformFees ?? 0)} ${t('common.sar')}`} />
              <MetricCell label="إيراد الشحن" value={`${formatCurrency(deepReport.codAndShipping.shippingRevenue ?? 0)} ${t('common.sar')}`} />
              <MetricCell label="هامش الشحن" value={`${formatCurrency(deepReport.codAndShipping.shippingMargin ?? 0)} ${t('common.sar')}`} />
              <MetricCell label="طلبات COD" value={deepReport.codAndShipping.codOrders} />
              <MetricCell label="COD معلق" value={`${formatCurrency(deepReport.codAndShipping.codPending ?? 0)} ${t('common.sar')}`} />
              <MetricCell label="الشحنات المفتوحة" value={deepReport.codAndShipping.openShipments} />
            </div>
          </div>

          <DeepTable
            title="تفاصيل الطلبات"
            rows={deepReport.orderDetails}
            columns={[
              { key: 'orderNumber', label: 'رقم الطلب' },
              { key: 'createdAt', label: 'التاريخ' },
              { key: 'status', label: 'الحالة' },
              { key: 'paymentStatus', label: 'الدفع' },
              { key: 'paymentMethod', label: 'طريقة الدفع' },
              { key: 'customerName', label: 'العميل' },
              { key: 'city', label: 'المدينة' },
              { key: 'subtotal', label: 'الفرعي' },
              { key: 'taxAmount', label: 'الضريبة' },
              { key: 'shippingCost', label: 'الشحن' },
              { key: 'couponDiscount', label: 'الخصم' },
              { key: 'total', label: 'الإجمالي' },
            ]}
            onExport={() => exportRecordRows('order-details', deepReport.orderDetails)}
          />

          <DeepTable
            title="أداء المنتجات حسب SKU والتصنيف"
            rows={deepReport.productPerformance}
            columns={[
              { key: 'name', label: 'المنتج' },
              { key: 'sku', label: 'SKU' },
              { key: 'categoryName', label: 'التصنيف' },
              { key: 'quantitySold', label: 'الكمية' },
              { key: 'revenue', label: 'الإيرادات' },
              { key: 'orderCount', label: 'الطلبات' },
              { key: 'stockQuantity', label: 'المخزون' },
            ]}
            onExport={() => exportRecordRows('product-performance', deepReport.productPerformance)}
          />

          <DeepTable
            title="التسويات والمطابقة"
            rows={deepReport.settlementReconciliation}
            columns={[
              { key: 'provider', label: 'المزود' },
              { key: 'providerTransactionId', label: 'مرجع المزود' },
              { key: 'settlementBatchId', label: 'دفعة التسوية' },
              { key: 'orderNumber', label: 'الطلب' },
              { key: 'amount', label: 'المبلغ' },
              { key: 'gatewayFees', label: 'رسوم البوابة' },
              { key: 'platformFees', label: 'رسوم المنصة' },
              { key: 'merchantPayable', label: 'مستحق التاجر' },
              { key: 'reconciliationStatus', label: 'المطابقة' },
            ]}
            onExport={() => exportRecordRows('settlement-reconciliation', deepReport.settlementReconciliation)}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <DeepTable
              title="تحليل العملاء"
              rows={deepReport.customerInsights}
              columns={[
                { key: 'name', label: 'العميل' },
                { key: 'orderCount', label: 'الطلبات' },
                { key: 'totalSpent', label: 'إجمالي الإنفاق' },
                { key: 'averageOrderValue', label: 'متوسط الطلب' },
                { key: 'lastOrderAt', label: 'آخر طلب' },
              ]}
              onExport={() => exportRecordRows('customer-insights', deepReport.customerInsights)}
            />
            <DeepTable
              title="الاستردادات والنزاعات"
              rows={deepReport.refundsAndDisputes}
              columns={[
                { key: 'type', label: 'النوع' },
                { key: 'status', label: 'الحالة' },
                { key: 'amount', label: 'المبلغ' },
                { key: 'orderNumber', label: 'الطلب' },
                { key: 'providerReference', label: 'المرجع' },
                { key: 'createdAt', label: 'التاريخ' },
              ]}
              onExport={() => exportRecordRows('refunds-disputes', deepReport.refundsAndDisputes)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

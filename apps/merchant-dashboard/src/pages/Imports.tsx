import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { importsApi, getToken } from '@/lib/api';
import { ApiClientError } from '@/lib/api';
import { Upload, Download, FileSpreadsheet, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { PermissionGate } from '@/lib/permissions';

export default function Imports() {
  const { t } = useTranslation();
  const { storeId } = useAuth();
  const [csvContent, setCsvContent] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleDownloadTemplate = async () => {
    if (!storeId) return;
    try {
      const token = getToken();
      const res = await fetch(importsApi.templateUrl(storeId), {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'products-template.csv';
      a.click();
      URL.revokeObjectURL(url);
      toast.success(t('imports.templateDownloaded'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  const handlePreview = async () => {
    if (!storeId || !csvContent.trim()) return;
    setPreviewLoading(true);
    setImportResult(null);
    try {
      const result = await importsApi.preview(storeId, csvContent);
      setPreview(result);
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('common.error'));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleImport = async () => {
    if (!storeId || !csvContent.trim()) return;
    setImporting(true);
    try {
      const result = await importsApi.confirm(storeId, csvContent);
      setImportResult(result);
      setPreview(null);
      toast.success(t('imports.importSuccess', { count: result.imported ?? 0 }));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('common.error'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-neutral-900">{t('imports.title')}</h1>
        <Button variant="outline" className="h-9 text-sm" onClick={handleDownloadTemplate}>
          <Download className="h-4 w-4 me-2" />
          {t('imports.downloadTemplate')}
        </Button>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-bold text-neutral-900 mb-4">{t('imports.pasteCsv')}</h3>
          <div className="space-y-4">
            <p className="text-sm text-neutral-500">
              {t('imports.instructions')}
            </p>
            <textarea
              className="flex h-48 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              value={csvContent}
              onChange={(e) => setCsvContent(e.target.value)}
              placeholder="name,price,status,sku,stockQuantity&#10;Sample Product,99.99,active,SKU001,10&#10;Another Product,49.99,draft,SKU002,5"
              dir="ltr"
            />
            <div className="flex gap-3">
              <Button onClick={handlePreview} disabled={!csvContent.trim() || previewLoading} className="h-9 text-sm px-4">
                {previewLoading ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <FileSpreadsheet className="h-4 w-4 me-2" />}
                {previewLoading ? t('imports.previewLoading') : t('imports.preview')}
              </Button>
              <PermissionGate permission="imports:create">
                <Button onClick={handleImport} disabled={!csvContent.trim() || importing} className="h-9 text-sm px-4 bg-green-600 hover:bg-green-700">
                  {importing ? <Loader2 className="h-4 w-4 me-2 animate-spin" /> : <Upload className="h-4 w-4 me-2" />}
                  {importing ? t('imports.importLoading') : t('imports.import')}
                </Button>
              </PermissionGate>
            </div>
          </div>
        </div>
      </div>

      {importResult && (
        <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-3xl p-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            <div>
              <p className="font-medium text-green-800">{t('imports.completed')}</p>
              <p className="text-sm text-green-600">{t('imports.importSuccess', { count: importResult.imported ?? 0 })}</p>
              {importResult.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-amber-700 font-medium">{t('imports.errors', { count: importResult.errors.length })}</p>
                  <ul className="list-disc list-inside text-xs text-amber-600">
                    {importResult.errors.map((e: string, i: number) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
          <div className="p-6">
            <h3 className="text-lg font-bold text-neutral-900 flex items-center gap-2 mb-4">
              {t('imports.previewTitle')}
              {preview.errors?.length > 0 && (
                <span className="text-xs text-red-500 font-normal">{t('imports.errors')} ({preview.errors.length})</span>
              )}
            </h3>
            {preview.errors?.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-2xl">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                  <div className="text-sm text-red-700">
                    {preview.errors.map((e: string, i: number) => <p key={i}>{e}</p>)}
                  </div>
                </div>
              </div>
            )}
            {preview.rows?.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow className="border-neutral-100 hover:bg-transparent">
                    {Object.keys(preview.rows[0] ?? {}).map((key) => (
                      <TableHead key={key} className="h-10 text-sm text-neutral-500 font-medium">{key}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row: any, i: number) => (
                    <TableRow key={i} className="border-neutral-100 hover:bg-neutral-50">
                      {Object.values(row).map((val: any, j: number) => (
                        <TableCell key={j} className="text-sm text-neutral-900 p-3">{val ?? '-'}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <p className="text-xs text-neutral-400 mt-3">
              {t('imports.showingRows', { rows: preview.rows?.length ?? 0, total: preview.totalRows ?? 0 })}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

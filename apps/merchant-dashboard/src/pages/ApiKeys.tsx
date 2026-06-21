import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { apiKeysApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Key, Copy, Trash2, Plus, Shield, Clock, CheckCircle2, XCircle, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { ApiClientError } from '@/lib/api';
import { PermissionGate } from '@/lib/permissions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ApiKeyRecord {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  isActive: boolean;
  lastUsedAt: string | null;
  createdAt: string;
}

interface IntegrationLog {
  id: number;
  storeId: number;
  apiKeyId: number | null;
  method: string;
  path: string;
  statusCode: number | null;
  ipAddress: string | null;
  durationMs: number | null;
  requestBody: unknown | null;
  responseSummary: string | null;
  errorMessage: string | null;
  createdAt: string;
}



export default function ApiKeysPage() {
  const { t, i18n } = useTranslation();
  const { storeId } = useAuth();
  const AVAILABLE_SCOPES = [
    { code: 'products:read', label: t('apikeys.scope_products_read') },
    { code: 'products:write', label: t('apikeys.scope_products_write') },
    { code: 'orders:read', label: t('apikeys.scope_orders_read') },
    { code: 'orders:create', label: t('apikeys.scope_orders_create') },
    { code: 'customers:read', label: t('apikeys.scope_customers_read') },
    { code: 'reports:read', label: t('apikeys.scope_reports_read') },
  ];
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [logs, setLogs] = useState<IntegrationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [revokeConfirm, setRevokeConfirm] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', scopes: [] as string[] });
  const [creating, setCreating] = useState(false);

  const loadKeys = useCallback(() => {
    if (!storeId) return;
    setLoading(true);
    apiKeysApi.list(storeId)
      .then(setKeys)
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false));
  }, [storeId, t]);

  const loadLogs = useCallback(() => {
    if (!storeId) return;
    setLogsLoading(true);
    apiKeysApi.logs(storeId)
      .then(setLogs)
      .catch(() => toast.error(t('common.error', 'فشل تحميل سجل الاستخدام')))
      .finally(() => setLogsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- t is stable from useTranslation; effect intentionally runs on [storeId] only
  }, [storeId]);

  useEffect(() => {
    loadKeys();
    loadLogs();
  }, [loadKeys, loadLogs]);

  const toggleScope = (code: string) => {
    setForm(prev => ({
      ...prev,
      scopes: prev.scopes.includes(code)
        ? prev.scopes.filter(s => s !== code)
        : [...prev.scopes, code],
    }));
  };

  const createKey = async () => {
    if (!storeId || !form.name.trim() || form.scopes.length === 0) {
      toast.error(t('apikeys.err_name_scopes'));
      return;
    }
    setCreating(true);
    try {
      const result = await apiKeysApi.create(storeId, form.name.trim(), form.scopes);
      setNewKey(result.key);
      setForm({ name: '', scopes: [] });
      setShowDialog(false);
      loadKeys();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error(t('common.error'));
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async () => {
    if (!storeId || revokeConfirm === null) return;
    try {
      await apiKeysApi.revoke(storeId, revokeConfirm);
      toast.success(t('apikeys.revoked'));
      setRevokeConfirm(null);
      loadKeys();
    } catch (err) {
      if (err instanceof ApiClientError) toast.error(err.message);
      else toast.error(t('common.error'));
    }
  };

  const copyKey = () => {
    if (newKey) {
      navigator.clipboard.writeText(newKey).catch(() => {});
      toast.success(t('apikeys.copied'));
    }
  };

  const dismissNewKey = () => setNewKey(null);

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-900">{t('apikeys.title')}</h1>
        <PermissionGate permission="api_keys:create"><Button onClick={() => setShowDialog(true)} className="h-9 text-sm px-4">
          <Plus className="h-4 w-4 mr-2" />
          {t('apikeys.create')}
        </Button></PermissionGate>
      </div>

      {newKey && (
        <div className="bg-emerald-50/50 border border-emerald-200/50 rounded-3xl p-6">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold text-green-800">{t('apikeys.created')}</h3>
              <p className="text-sm text-green-700 mt-1">{t('apikeys.createdDesc')}</p>
              <div className="mt-3 flex items-center gap-2">
                <code className="bg-green-100 border border-green-300 rounded-xl px-3 py-1.5 text-sm font-mono text-green-900 flex-1 break-all" dir="ltr">
                  {newKey}
                </code>
                <Button variant="outline" className="h-9 text-sm" onClick={copyKey}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={dismissNewKey}>
              <XCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Key className="h-5 w-5 text-neutral-400" />
            <h3 className="font-bold text-lg text-neutral-900">{t('apikeys.activeKeys')}</h3>
          </div>
          {loading ? (
            <p className="text-sm text-neutral-500">{t('common.loading')}</p>
          ) : keys.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
                <Shield className="h-8 w-8 text-neutral-400" />
              </div>
              <p className="text-sm text-neutral-500">{t('apikeys.noKeys')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-100 hover:bg-transparent">
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.name')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.prefix')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.scopes')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.status')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.lastUsed')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.createdAt')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map(k => (
                  <TableRow key={k.id} className="border-neutral-100 hover:bg-neutral-50">
                    <TableCell className="text-sm font-medium text-neutral-900 p-3">{k.name}</TableCell>
                    <TableCell dir="ltr" className="font-mono text-xs text-neutral-400 p-3">{k.prefix}...</TableCell>
                    <TableCell className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.map(s => (
                          <Badge key={s} variant="secondary" className="text-xs px-2.5 py-0.5">{s}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="p-3">
                      {k.isActive
                        ? <Badge variant="default" className="text-xs px-2.5 py-0.5 bg-green-100 text-green-700 border-green-200">{t('apikeys.active')}</Badge>
                        : <Badge variant="destructive" className="text-xs px-2.5 py-0.5">{t('apikeys.revokedLabel')}</Badge>
                      }
                    </TableCell>
                    <TableCell className="text-sm text-neutral-400 p-3">
                      {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : i18n.language) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-400 p-3">
                      {new Date(k.createdAt).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : i18n.language)}
                    </TableCell>
                    <TableCell className="p-3">
                      {k.isActive && (
                        <PermissionGate permission="api_keys:revoke"><Button variant="ghost" size="sm" className="h-9 text-sm" onClick={() => setRevokeConfirm(k.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button></PermissionGate>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-neutral-400" />
            <h3 className="font-bold text-lg text-neutral-900">{t('apikeys.logs')}</h3>
          </div>
          {logsLoading ? (
            <p className="text-sm text-neutral-500">{t('common.loading')}</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4 text-center">{t('apikeys.noLogs')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-100 hover:bg-transparent">
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.method')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.path')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.statusCode')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.duration')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.ip')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('apikeys.date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map(log => (
                  <TableRow key={log.id} className="border-neutral-100 hover:bg-neutral-50">
                    <TableCell className="p-3">
                      <Badge variant="outline" className="font-mono text-xs px-2.5 py-0.5">{log.method}</Badge>
                    </TableCell>
                    <TableCell className="text-sm font-mono text-neutral-400 max-w-[300px] truncate p-3">
                      {log.path}
                    </TableCell>
                    <TableCell className="p-3">
                      {log.statusCode ? (
                        <Badge variant={log.statusCode < 400 ? 'default' : 'destructive'} className={`text-xs px-2.5 py-0.5 ${log.statusCode < 400 ? 'bg-green-100 text-green-700' : ''}`}>
                          {log.statusCode}
                        </Badge>
                      ) : '-'}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-400 p-3">
                      {log.durationMs != null ? `${log.durationMs}ms` : '-'}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-neutral-400 p-3">
                      {log.ipAddress || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-neutral-400 p-3">
                      {new Date(log.createdAt).toLocaleString('en-US')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">{t('apikeys.createTitle')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm text-neutral-500">{t('apikeys.keyName')}</Label>
              <Input
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder={t('apikeys.keyNamePlaceholder')}
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-neutral-500">{t('apikeys.scopesLabel')}</Label>
              <div className="grid grid-cols-1 gap-2">
                {AVAILABLE_SCOPES.map(scope => (
                  <label key={scope.code} className="flex items-center gap-2 cursor-pointer text-sm p-2 rounded-xl hover:bg-neutral-50">
                    <input
                      type="checkbox"
                      checked={form.scopes.includes(scope.code)}
                      onChange={() => toggleScope(scope.code)}
                      className="rounded border-neutral-300 h-4 w-4"
                    />
                    <span className="text-neutral-900">{scope.label}</span>
                    <span className="text-xs text-neutral-400 mr-auto" dir="ltr">{scope.code}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setShowDialog(false)}>{t('common.cancel')}</Button>
            <PermissionGate permission="api_keys:create"><Button className="h-9 text-sm px-4" onClick={createKey} disabled={creating}>
              {creating ? t('common.loading') : t('apikeys.create')}
            </Button></PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeConfirm !== null} onOpenChange={(v) => !v && setRevokeConfirm(null)}>
        <DialogContent className="bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              {t('apikeys.revokeConfirmTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-neutral-500">{t('apikeys.revokeConfirm')}</p>
          <DialogFooter className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setRevokeConfirm(null)}>{t('common.cancel')}</Button>
            <PermissionGate permission="api_keys:revoke"><Button variant="destructive" className="h-9 text-sm" onClick={revokeKey}>{t('apikeys.confirmRevoke')}</Button></PermissionGate>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

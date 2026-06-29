/* eslint-disable @typescript-eslint/no-explicit-any -- admin pages carry legacy `any` typing on API responses; proper typing tracked separately (P2-030 follow-up). */
import { useCallback, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { adminApi, hasAdminPermission } from '../lib/api';
import { toast } from 'sonner';

const BASE = import.meta.env.VITE_API_URL || '/api';

export default function Settings() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', logoUrl: '', faviconUrl: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const canUpdateSettings = hasAdminPermission('platform.settings.update');
  const canUploadPlatformMedia = hasAdminPermission('platform.media.upload');

  const load = useCallback(async () => {
    try {
      const s = await adminApi.getSettings();
      setForm({ name: s.name, logoUrl: s.logoUrl ?? '', faviconUrl: s.faviconUrl ?? '' });
    } catch (err: any) {
      toast.error(err.message || t('settings.loadError', 'فشل تحميل الإعدادات'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { load(); }, [load]);

  const uploadFile = async (file: File): Promise<string> => {
    const token = localStorage.getItem('admin_token');
    const formData = new FormData();
    formData.append('file', file);
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}/admin/upload`, { method: 'POST', headers, body: formData });
    const json = await res.json();
    if (!json.success) throw new Error(json.error?.message || 'Upload failed');
    return json.data.url;
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadPlatformMedia) {
      toast.error('لا تملك صلاحية رفع وسائط المنصة');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      setForm(f => ({ ...f, logoUrl: url }));
      toast.success(t('settings.logoUploadSuccess', 'تم رفع الشعار بنجاح'));
    } catch (err: any) {
      toast.error(err.message || t('settings.logoUploadError', 'فشل رفع الشعار'));
    }
  };

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canUploadPlatformMedia) {
      toast.error('لا تملك صلاحية رفع وسائط المنصة');
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadFile(file);
      setForm(f => ({ ...f, faviconUrl: url }));
      toast.success(t('settings.faviconUploadSuccess', 'تم رفع الأيقونة بنجاح'));
    } catch (err: any) {
      toast.error(err.message || t('settings.faviconUploadError', 'فشل رفع الأيقونة'));
    }
  };

  const save = async () => {
    if (!canUpdateSettings) {
      toast.error('لا تملك صلاحية تحديث إعدادات المنصة');
      return;
    }
    setSaving(true);
    try {
      await adminApi.updateSettings({
        name: form.name,
        logoUrl: form.logoUrl || null,
        faviconUrl: form.faviconUrl || null,
      });
      toast.success(t('settings.saveSuccess', 'تم حفظ الإعدادات بنجاح'));
    } catch (err: any) {
      toast.error(err.message || t('settings.saveError', 'فشل حفظ الإعدادات'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">{t('settings.loading', 'جاري التحميل...')}</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <h1 className="text-title2 font-bold text-gray-900 tracking-tight">{t('settings.pageTitle', 'إعدادات المنصة')}</h1>

      <div className="bg-white rounded-xl border p-6 space-y-6">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">{t('settings.platformName', 'اسم المنصة')}</label>
          <input
            type="text"
            value={form.name}
            disabled={!canUpdateSettings}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">{t('settings.logo', 'شعار المنصة')}</label>
          <div className="flex items-center gap-4">
            {form.logoUrl && (
              <img src={form.logoUrl} alt={t('settings.logoAlt', 'شعار المنصة')} className="h-16 w-16 rounded-xl object-cover bg-gray-100 border" />
            )}
            <label className={`px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 ${canUploadPlatformMedia ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
              <input type="file" accept="image/*" className="hidden" disabled={!canUploadPlatformMedia} onChange={handleLogoUpload} />
              {t('settings.chooseImage', 'اختر صورة')}
            </label>
            {form.logoUrl && (
              <button disabled={!canUpdateSettings} onClick={() => setForm(f => ({ ...f, logoUrl: '' }))} className="text-sm text-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-400">{t('settings.remove', 'إزالة')}</button>
            )}
          </div>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">{t('settings.favicon', 'أيقونة التبويب (Favicon)')}</label>
          <div className="flex items-center gap-4">
            {form.faviconUrl && (
              <img src={form.faviconUrl} alt="Favicon" className="h-10 w-10 rounded-lg object-cover bg-gray-100 border" />
            )}
            <label className={`px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 ${canUploadPlatformMedia ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
              <input type="file" accept="image/x-icon,image/png,image/svg+xml" className="hidden" disabled={!canUploadPlatformMedia} onChange={handleFaviconUpload} />
              {t('settings.chooseImage', 'اختر صورة')}
            </label>
            {form.faviconUrl && (
              <button disabled={!canUpdateSettings} onClick={() => setForm(f => ({ ...f, faviconUrl: '' }))} className="text-sm text-red-500 hover:text-red-600 disabled:cursor-not-allowed disabled:text-gray-400">{t('settings.remove', 'إزالة')}</button>
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <button
            onClick={save}
            disabled={saving || !form.name || !canUpdateSettings}
            className="px-6 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? t('settings.saving', 'جاري الحفظ...') : t('settings.save', 'حفظ الإعدادات')}
          </button>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
        <strong>{t('settings.note', 'ملاحظة:')}</strong> {t('settings.noteText', 'بعد تغيير الشعار أو الأيقونة، قد تحتاج إلى تحديث الصفحة (Ctrl+F5) لرؤية التغييرات.')}
      </div>
    </div>
  );
}

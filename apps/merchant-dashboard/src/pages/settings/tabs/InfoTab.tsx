// Settings → Store info + SEO tab.
//
// Extracted from Settings.tsx on 2026-06-25 (W4 slice 4a). The `form`
// state and `updateField` setter remain owned by SettingsPage so the
// shared save / dirty-tracking flow still applies; this component
// receives them as props.

import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { uploadFile } from '@/lib/api';
import { handleImageError } from '@/lib/utils';
import { toast } from 'sonner';

interface InfoForm {
  name: string;
  slug: string;
  description: string;
  status: string;
  logoUrl: string;
  primaryColor: string;
  seoTitle: string;
  seoDescription: string;
}

interface InfoTabProps {
  form: InfoForm;
  errors: Record<string, string>;
  updateField: (field: string, value: unknown) => void;
  storeId: number | null;
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-bold text-base text-neutral-900">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-1">{message}</p>;
}

export default function InfoTab({ form, errors, updateField, storeId }: InfoTabProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
        <SectionHeader title={t('settings.sectionInfo')} description={t('settings.sectionInfoDesc')} />
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5">
            <Label className="text-sm text-neutral-500">{t('settings.storeName')} <span className="text-red-500">*</span></Label>
            <Input value={form.name} onChange={e => updateField('name', e.target.value)} className="h-9 text-sm" />
            <FieldError message={errors.name} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-neutral-500">{t('settings.storeSlug')} <span className="text-red-500">*</span></Label>
            <Input value={form.slug} onChange={e => updateField('slug', e.target.value)} dir="ltr" className="text-end h-9 text-sm" />
            <p className="text-xs text-neutral-400">{t('settings.slugHint')}</p>
            <FieldError message={errors.slug} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-neutral-500">{t('settings.status')}</Label>
            <Select value={form.status} onValueChange={v => updateField('status', v)}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('settings.storeActive')}</SelectItem>
                <SelectItem value="inactive">{t('settings.storeInactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label className="text-sm text-neutral-500">{t('settings.description')}</Label>
            <textarea className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500" value={form.description} onChange={e => updateField('description', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-neutral-500">{t('settings.logoUrl')}</Label>
            <div className="flex items-center gap-3">
              {form.logoUrl && (
                <img src={form.logoUrl} alt="Logo" className="h-12 w-12 rounded-xl object-cover bg-neutral-100 border border-neutral-200" onError={handleImageError} />
              )}
              <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm text-neutral-600 cursor-pointer hover:bg-neutral-50 transition-colors">
                <input
                  type="file"
                  // SVG intentionally excluded: SVGs can carry inline
                  // <script> tags and execute in the storefront when
                  // the logo is rendered. The server rejects SVG too
                  // (defense in depth) — see packages/shared/src/media.ts
                  // ALLOWED_MIME_TYPES.
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const maxSize = 5 * 1024 * 1024;
                    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
                    if (!allowedTypes.includes(file.type)) {
                      toast.error(t('settings.invalidFileType', 'نوع الملف غير مدعوم. يرجى اختيار JPEG أو PNG أو WebP'));
                      return;
                    }
                    if (file.size > maxSize) {
                      toast.error(t('settings.fileTooLarge', 'حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت'));
                      return;
                    }
                    if (storeId) {
                      try {
                        const result = await uploadFile(storeId, file);
                        updateField('logoUrl', result.url);
                        toast.success(t('settings.logoUploaded', 'تم رفع الشعار بنجاح'));
                      } catch { toast.error(t('settings.logoUploadFailed', 'فشل رفع الشعار')); }
                    }
                  }}
                />
                {t('settings.chooseImage', 'اختر صورة')}
              </label>
              {form.logoUrl && (
                <button onClick={() => updateField('logoUrl', '')} className="text-xs text-red-500 hover:text-red-600">
                  {t('settings.remove', 'إزالة')}
                </button>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-neutral-500">{t('settings.primaryColor')}</Label>
            <div className="flex gap-2 items-center">
              <input type="color" value={form.primaryColor} onChange={e => updateField('primaryColor', e.target.value)} className="h-9 w-9 rounded-xl border cursor-pointer" />
              <Input value={form.primaryColor} onChange={e => updateField('primaryColor', e.target.value)} dir="ltr" className="text-end flex-1 h-9 text-sm" />
            </div>
            <FieldError message={errors.primaryColor} />
          </div>
        </div>
      </div>

      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
        <SectionHeader title={t('settings.sectionSeo')} description={t('settings.sectionSeoDesc')} />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-sm text-neutral-500">{t('settings.seoTitle')}</Label>
            <Input value={form.seoTitle} onChange={e => updateField('seoTitle', e.target.value)} maxLength={60} className="h-9 text-sm" />
            <p className="text-xs text-neutral-400">{(form.seoTitle?.length ?? 0)}/60</p>
            <FieldError message={errors.seoTitle} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm text-neutral-500">{t('settings.seoDescription')}</Label>
            <textarea className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500" value={form.seoDescription} onChange={e => updateField('seoDescription', e.target.value)} maxLength={160} />
            <p className="text-xs text-neutral-400">{(form.seoDescription?.length ?? 0)}/160</p>
            <FieldError message={errors.seoDescription} />
          </div>
        </div>
      </div>
    </>
  );
}

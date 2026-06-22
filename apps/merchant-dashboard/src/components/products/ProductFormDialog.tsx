import { useState, type RefObject } from 'react';
import { ChevronUp, ChevronDown, AlertTriangle, Loader2, Upload, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { handleImageError } from '@/lib/utils';
import { type ProductFormData } from '@/lib/product-validation';
import { ProductVariantsSection } from './ProductVariantsSection';
import type { TFunction } from 'i18next';

function FormSection({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-neutral-100 rounded-2xl bg-white/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50 transition-colors rounded-2xl"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-neutral-400" /> : <ChevronDown className="h-4 w-4 text-neutral-400" />}
      </button>
      {open && <div className="px-4 pb-4 pt-2 border-t border-neutral-100">{children}</div>}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-red-500 mt-0.5">{message}</p>;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editId: number | null;
  saving: boolean;
  form: ProductFormData;
  warnings: string[];
  getError: (field: string) => string | null | undefined;
  onSave: () => void;
  onFieldChange: (field: string, value: any) => void;
  onNameChange: (name: string) => void;
  onSlugChange: (slug: string) => void;
  productImages: any[];
  queuedImages: { file: File; preview: string }[];
  uploadingImage: boolean;
  imageError: string | null;
  fileInputRef: RefObject<HTMLInputElement>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteImage: (imageId: number) => void;
  onRemoveQueuedImage: (index: number) => void;
  categories: any[];
  brands: any[];
  tags: any[];
  t: TFunction;
}

export function ProductFormDialog({
  open, onOpenChange, editId, saving, form, warnings, getError,
  onSave, onFieldChange, onNameChange, onSlugChange,
  productImages, queuedImages, uploadingImage, imageError,
  fileInputRef, onImageUpload, onDeleteImage, onRemoveQueuedImage,
  categories, brands, tags, t,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-neutral-900">{editId ? t('products.edit') : t('products.create')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {warnings.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200/50 rounded-2xl text-sm text-neutral-900">
              <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-amber-600" />
              <ul className="list-disc list-inside text-sm">
                {warnings.map((w, i) => <li key={i}>{t(`products.warn_${w}`)}</li>)}
              </ul>
            </div>
          )}

          <FormSection title={t('products.sectionBasic')}>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.name')} <span className="text-red-500">*</span></Label>
                <Input value={form.name} onChange={(e) => onNameChange(e.target.value)} className="h-9 text-sm" />
                <FieldError message={getError('name') ? t(`products.err_${getError('name')}`) : undefined} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.slug')} <span className="text-red-500">*</span></Label>
                <Input value={form.slug} onChange={(e) => onSlugChange(e.target.value)} dir="ltr" className="text-end h-9 text-sm" />
                <p className="text-xs text-neutral-400">{t('products.slugHint')}</p>
                <FieldError message={getError('slug') ? t(`products.err_${getError('slug')}`) : undefined} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.description')}</Label>
                <textarea
                  className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  value={form.description ?? ''}
                  onChange={(e) => onFieldChange('description', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.status')}</Label>
                <Select value={form.status} onValueChange={(v) => onFieldChange('status', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">{t('products.draft')}</SelectItem>
                    <SelectItem value="active">{t('products.active')}</SelectItem>
                    <SelectItem value="archived">{t('products.archived')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.type')}</Label>
                <Select value={form.type} onValueChange={(v) => onFieldChange('type', v)}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="physical">{t('products.physical')}</SelectItem>
                    <SelectItem value="digital">{t('products.digital')}</SelectItem>
                    <SelectItem value="service">{t('products.service')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </FormSection>

          <FormSection title={t('products.sectionPricing')}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.price')} <span className="text-red-500">*</span></Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={(e) => onFieldChange('price', e.target.value)} className="h-9 text-sm" />
                <FieldError message={getError('price') ? t(`products.err_${getError('price')}`) : undefined} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.compareAtPrice')}</Label>
                <Input type="number" step="0.01" min="0" value={form.compareAtPrice ?? ''} onChange={(e) => onFieldChange('compareAtPrice', e.target.value)} className="h-9 text-sm" />
                <FieldError message={getError('compareAtPrice') ? t(`products.err_${getError('compareAtPrice')}`) : undefined} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.cost')}</Label>
                <Input type="number" step="0.01" min="0" value={form.cost ?? ''} onChange={(e) => onFieldChange('cost', e.target.value)} className="h-9 text-sm" />
                <FieldError message={getError('cost') ? t(`products.err_${getError('cost')}`) : undefined} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.sku')}</Label>
                <Input value={form.sku ?? ''} onChange={(e) => onFieldChange('sku', e.target.value)} dir="ltr" className="text-end h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.barcode')}</Label>
                <Input value={form.barcode ?? ''} onChange={(e) => onFieldChange('barcode', e.target.value)} dir="ltr" className="text-end h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.stock')}</Label>
                <Input type="number" min="0" value={form.stockQuantity} onChange={(e) => onFieldChange('stockQuantity', e.target.value)} className="h-9 text-sm" />
                <FieldError message={getError('stockQuantity') ? t(`products.err_${getError('stockQuantity')}`) : undefined} />
              </div>
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" id="trackInventory" checked={form.trackInventory} onChange={(e) => onFieldChange('trackInventory', e.target.checked)} className="rounded border-neutral-300 h-4 w-4" />
                <Label htmlFor="trackInventory" className="cursor-pointer text-sm text-neutral-500">{t('products.trackInventory')}</Label>
              </div>
            </div>
          </FormSection>

          <FormSection title={t('products.sectionShipping')} defaultOpen={false}>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="requiresShipping" checked={form.requiresShipping} onChange={(e) => onFieldChange('requiresShipping', e.target.checked)} className="rounded border-neutral-300 h-4 w-4" />
                <Label htmlFor="requiresShipping" className="cursor-pointer text-sm text-neutral-500">{t('products.requiresShipping')}</Label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="isFragile" checked={form.isFragile} onChange={(e) => onFieldChange('isFragile', e.target.checked)} className="rounded border-neutral-300 h-4 w-4" />
                <Label htmlFor="isFragile" className="cursor-pointer text-sm text-neutral-500">{t('products.isFragile')}</Label>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.weight')}</Label>
                <Input type="number" min="0" value={form.weightGrams ?? ''} onChange={(e) => onFieldChange('weightGrams', e.target.value)} className="h-9 text-sm" />
                <FieldError message={getError('weightGrams') ? t(`products.err_${getError('weightGrams')}`) : undefined} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.lengthCm')}</Label>
                <Input type="number" min="0" value={form.lengthCm ?? ''} onChange={(e) => onFieldChange('lengthCm', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.widthCm')}</Label>
                <Input type="number" min="0" value={form.widthCm ?? ''} onChange={(e) => onFieldChange('widthCm', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.heightCm')}</Label>
                <Input type="number" min="0" value={form.heightCm ?? ''} onChange={(e) => onFieldChange('heightCm', e.target.value)} className="h-9 text-sm" />
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="giftWrapAvailable" checked={form.giftWrapAvailable}
                  onChange={(e) => onFieldChange('giftWrapAvailable', e.target.checked)} className="rounded border-neutral-300 h-4 w-4" />
                <Label htmlFor="giftWrapAvailable" className="cursor-pointer text-sm text-neutral-500">{t('products.giftWrapAvailable', 'يدعم تغليف الهدية')}</Label>
              </div>
              {form.giftWrapAvailable && (
                <div className="space-y-1.5">
                  <Label className="text-sm text-neutral-500">{t('products.giftWrapPriceOverride', 'سعر تغليف مخصص')}</Label>
                  <Input type="number" min="0" value={form.giftWrapPriceOverride ?? ''}
                    onChange={(e) => onFieldChange('giftWrapPriceOverride', e.target.value)} className="h-9 text-sm" placeholder={t('products.giftWrapPriceOverrideHint', 'اتركه فارغًا لاستخدام السعر الافتراضي')} />
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="سوق هاء العام" defaultOpen={false}>
            <div className="space-y-4">
              <label className="flex items-start gap-3 rounded-2xl border border-primary-100 bg-primary-50/50 p-4">
                <input
                  type="checkbox"
                  checked={form.haaMarketplaceEnabled}
                  onChange={(e) => onFieldChange('haaMarketplaceEnabled', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-neutral-300"
                />
                <span>
                  <span className="block text-sm font-semibold text-neutral-900">عرض المنتج في سوق هاء</span>
                  <span className="block text-xs text-neutral-500 mt-1">
                    يظهر هذا المنتج في السوق العام لجميع عملاء هاء ستورز مع حفظ الطلب داخل متجرك وتسجيل عمولة المنصة.
                  </span>
                </span>
              </label>
              {form.haaMarketplaceEnabled && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm text-neutral-500">نسبة عمولة هاء</Label>
                    <Input
                      type="number"
                      min="0"
                      max="1"
                      step="0.01"
                      value={form.haaMarketplaceCommissionRate}
                      onChange={(e) => onFieldChange('haaMarketplaceCommissionRate', e.target.value)}
                      className="h-9 text-sm"
                    />
                    <p className="text-xs text-neutral-400">مثال: 0.05 تعني 5%</p>
                    <FieldError message={getError('haaMarketplaceCommissionRate') ? 'نسبة العمولة يجب أن تكون بين 0 و 1' : undefined} />
                  </div>
                </div>
              )}
            </div>
          </FormSection>

          <FormSection title="الماركة والتاجات والتصنيفات" defaultOpen={false}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">الماركة</Label>
                <select
                  value={form.brandId ?? ''}
                  onChange={(e) => onFieldChange('brandId', e.target.value ? Number(e.target.value) : undefined)}
                  className="flex h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">بدون ماركة</option>
                  {brands.map((b: any) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">التاجات</Label>
                {tags.length === 0 ? (
                  <p className="text-sm text-neutral-400">لا توجد تاجات</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: any) => {
                      const selected = (form.tagIds ?? []).includes(tag.id);
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => {
                            const ids = selected
                              ? (form.tagIds ?? []).filter((id: number) => id !== tag.id)
                              : [...(form.tagIds ?? []), tag.id];
                            onFieldChange('tagIds', ids);
                          }}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm border transition-colors ${
                            selected
                              ? 'text-white border-transparent'
                              : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-900'
                          }`}
                          style={selected ? { backgroundColor: tag.color, borderColor: tag.color } : undefined}
                        >
                          {selected && <span className="h-2 w-2 rounded-full bg-white/60" />}
                          {tag.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.category')}</Label>
                {categories.length === 0 ? (
                  <p className="text-sm text-neutral-400">{t('products.noCategories')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {categories.map((cat: any) => {
                      const selected = form.categoryIds.includes(cat.id);
                      return (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => {
                            const ids = selected
                              ? form.categoryIds.filter((id: number) => id !== cat.id)
                              : [...form.categoryIds, cat.id];
                            onFieldChange('categoryIds', ids);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-sm border transition-colors ${selected ? 'bg-primary-500 text-white border-primary-500' : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-900'}`}
                        >
                          {cat.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </FormSection>

          <FormSection title="الخيارات والمتغيرات" defaultOpen={false}>
            <ProductVariantsSection
              hasVariants={form.hasVariants}
              options={form.options}
              variants={form.variants}
              onHasVariantsChange={(v) => onFieldChange('hasVariants', v)}
              onOptionsChange={(opts) => onFieldChange('options', opts)}
              onVariantsChange={(vars) => onFieldChange('variants', vars)}
            />
          </FormSection>

          <FormSection title={`${t('products.images')} (${editId ? productImages.length : queuedImages.length})`}>
            <div className="space-y-3">
              <div className="flex gap-3 flex-wrap">
                {productImages.map((img: any) => (
                  <div key={img.id} className="relative group w-20 h-20 rounded-xl border border-neutral-100 overflow-hidden">
                    <img src={img.thumbUrl || img.url} alt={`صورة منتج ${img.alt || form.name}`} className="w-full h-full object-cover" onError={handleImageError} />
                    <button
                      type="button"
                      onClick={() => onDeleteImage(img.id)}
                      aria-label="حذف الصورة"
                      className="absolute end-1 top-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {!editId && queuedImages.map((img, idx) => (
                  <div key={`queue-${idx}`} className="relative group w-20 h-20 rounded-xl border border-neutral-100 overflow-hidden">
                    <img src={img.preview} alt="صورة مجهزة" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => onRemoveQueuedImage(idx)}
                      aria-label="إزالة الصورة"
                      className="absolute end-1 top-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className={`w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-colors ${uploadingImage ? 'border-primary-500/50 bg-primary-500/5' : 'border-neutral-200 hover:border-primary-500'}`}>
                  {uploadingImage ? (
                    <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
                  ) : (
                    <Upload className="h-5 w-5 text-neutral-400" />
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={onImageUpload}
                    disabled={uploadingImage}
                    multiple={!editId}
                  />
                </label>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-neutral-400">{t('products.imageHint')}</p>
                {imageError && <p className="text-xs text-red-500">{imageError}</p>}
              </div>
            </div>
          </FormSection>

          <FormSection title="التسويق" defaultOpen={false}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">عدد المشتريات (أداة تسويقية)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.salesCount}
                  onChange={(e) => onFieldChange('salesCount', Number(e.target.value))}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-neutral-400">
                  يظهر في بطاقة المنتج كـ "اشتراه X+ شخص". يمكنك تعديله يدوياً لتعزيز المصداقية، ويزداد تلقائياً مع كل طلب مؤكد.
                </p>
              </div>
            </div>
          </FormSection>

          <FormSection title={t('products.sectionSeo')} defaultOpen={false}>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.seoTitle')}</Label>
                <Input value={form.seoTitle ?? ''} onChange={(e) => onFieldChange('seoTitle', e.target.value)} maxLength={60} className="h-9 text-sm" />
                <p className="text-xs text-neutral-400">{(form.seoTitle?.length ?? 0)}/60</p>
                <FieldError message={getError('seoTitle') ? t(`products.err_${getError('seoTitle')}`) : undefined} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('products.seoDescription')}</Label>
                <textarea
                  className="flex h-16 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                  value={form.seoDescription ?? ''}
                  onChange={(e) => onFieldChange('seoDescription', e.target.value)}
                  maxLength={160}
                />
                <p className="text-xs text-neutral-400">{(form.seoDescription?.length ?? 0)}/160</p>
                <FieldError message={getError('seoDescription') ? t(`products.err_${getError('seoDescription')}`) : undefined} />
              </div>
            </div>
          </FormSection>
        </div>

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-neutral-100">
          <Button variant="outline" className="h-9 text-sm px-4" onClick={() => onOpenChange(false)}>{t('common.cancel')}</Button>
          <Button className="h-9 text-sm px-4" onClick={onSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 me-2 animate-spin" />}
            {saving ? t('common.loading') : t('common.save')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

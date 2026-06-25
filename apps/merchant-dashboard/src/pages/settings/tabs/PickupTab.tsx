// Settings → Pickup-from-branch tab.
//
// Extracted from Settings.tsx on 2026-06-25 (W4 slice 2 — split Settings
// into lazy-loaded tabs). State + handlers owned by SettingsPage and
// passed in as props. Includes the pickup-location edit dialog because
// it shares the same form state and only opens from this tab.

import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Icon } from '@/components/ui/icon';
import { settingsApi, ApiClientError } from '@/lib/api';
import { PermissionGate } from '@/lib/permissions';
import { toast } from 'sonner';

type PickupLocation = {
  id: number;
  nameAr: string;
  nameEn?: string;
  address?: string;
  mapsUrl?: string;
  phone?: string;
  hours?: unknown;
  instructions?: string;
  isActive: boolean;
};

type PickupForm = {
  nameAr: string;
  nameEn: string;
  address: string;
  mapsUrl: string;
  phone: string;
  hours: string;
  instructions: string;
  isActive: boolean;
};

type GiftOptions = {
  giftWrapDefaultPrice: string;
  giftMessageMaxLength: number;
  giftWrapInstructions: string | null;
  pickupInstructions: string | null;
};

interface PickupTabProps {
  pickupLocations: PickupLocation[];
  setPickupLocations: React.Dispatch<React.SetStateAction<PickupLocation[]>>;
  pickupLocationsLoading: boolean;
  pickupDialog: boolean;
  setPickupDialog: React.Dispatch<React.SetStateAction<boolean>>;
  pickupEditId: number | null;
  setPickupEditId: React.Dispatch<React.SetStateAction<number | null>>;
  pickupForm: PickupForm;
  setPickupForm: React.Dispatch<React.SetStateAction<PickupForm>>;
  pickupSaving: boolean;
  setPickupSaving: React.Dispatch<React.SetStateAction<boolean>>;
  giftOptions: GiftOptions;
  setGiftOptions: React.Dispatch<React.SetStateAction<GiftOptions>>;
  giftOptionsSaving: boolean;
  setGiftOptionsSaving: React.Dispatch<React.SetStateAction<boolean>>;
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

export default function PickupTab({
  pickupLocations,
  setPickupLocations,
  pickupLocationsLoading,
  pickupDialog,
  setPickupDialog,
  pickupEditId,
  setPickupEditId,
  pickupForm,
  setPickupForm,
  pickupSaving,
  setPickupSaving,
  giftOptions,
  setGiftOptions,
  giftOptionsSaving,
  setGiftOptionsSaving,
  storeId,
}: PickupTabProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <SectionHeader
            title={t('settings.sectionPickup', 'الاستلام من الفرع')}
            description={t('settings.sectionPickupDesc', 'إدارة فروع الاستلام وأوقات الدوام')}
          />
          <PermissionGate permission="settings:update">
            <Button
              onClick={() => {
                setPickupEditId(null);
                setPickupForm({ nameAr: '', nameEn: '', address: '', mapsUrl: '', phone: '', hours: '{}', instructions: '', isActive: true });
                setPickupDialog(true);
              }}
              className="h-9 text-sm"
            >
              <Icon name="Plus" size="xs" className="me-2" />
              {t('settings.createPickup', 'إضافة فرع')}
            </Button>
          </PermissionGate>
        </div>
        {pickupLocationsLoading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)}</div>
        ) : pickupLocations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-4 rounded-2xl bg-neutral-100 mb-4">
              <Icon name="MapPin" size="lg" className="text-neutral-400" />
            </div>
            <p className="text-sm text-neutral-500">{t('settings.noPickupLocations', 'لا توجد فروع')}</p>
            <p className="text-xs text-neutral-400 mt-1">{t('settings.noPickupLocationsHint', 'أضف فرعًا للسماح بخيار الاستلام من الفرع')}</p>
          </div>
        ) : (
          <div className="bg-white/80 rounded-3xl border border-neutral-100 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-neutral-100 hover:bg-transparent">
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('settings.pickupNameAr', 'اسم الفرع')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('settings.pickupAddress', 'العنوان')}</TableHead>
                  <TableHead className="h-10 text-sm text-neutral-500 font-medium">{t('settings.pickupIsActive', 'نشط')}</TableHead>
                  <TableHead className="w-24 h-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pickupLocations.map(loc => (
                  <TableRow key={loc.id} className="border-neutral-100 hover:bg-neutral-50">
                    <TableCell className="text-sm font-medium text-neutral-900 p-3">{loc.nameAr}</TableCell>
                    <TableCell className="text-sm text-neutral-400 p-3">{loc.address ?? '-'}</TableCell>
                    <TableCell className="p-3">
                      <Badge variant={loc.isActive ? 'success' : 'secondary'} className="text-xs">
                        {loc.isActive ? t('settings.pickupActive', 'نشط') : t('settings.pickupInactive', 'غير نشط')}
                      </Badge>
                    </TableCell>
                    <TableCell className="p-3">
                      <div className="flex gap-1">
                        <PermissionGate permission="settings:update">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11"
                            onClick={() => {
                              setPickupEditId(loc.id);
                              setPickupForm({
                                nameAr: loc.nameAr ?? '',
                                nameEn: loc.nameEn ?? '',
                                address: loc.address ?? '',
                                mapsUrl: loc.mapsUrl ?? '',
                                phone: loc.phone ?? '',
                                hours: JSON.stringify(loc.hours ?? {}),
                                instructions: loc.instructions ?? '',
                                isActive: loc.isActive,
                              });
                              setPickupDialog(true);
                            }}
                          >
                            <Icon name="Edit" size="xs" />
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="settings:update">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-11 w-11 text-red-500"
                            onClick={async () => {
                              if (!confirm(t('settings.confirmDeletePickup', 'هل أنت متأكد من حذف هذا الفرع؟'))) return;
                              try {
                                await settingsApi.deletePickupLocation(storeId!, loc.id);
                                setPickupLocations(p => p.filter(l => l.id !== loc.id));
                                toast.success(t('common.deleted'));
                              } catch { toast.error(t('common.error')); }
                            }}
                          >
                            <Icon name="Trash2" size="xs" />
                          </Button>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        {/* Pickup Instructions (shared with gift options) */}
        <div className="mt-4 space-y-1.5">
          <Label className="text-sm text-neutral-500">{t('settings.pickupInstructions', 'تعليمات الاستلام')}</Label>
          <textarea
            className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
            value={giftOptions.pickupInstructions ?? ''}
            onChange={e => setGiftOptions(p => ({ ...p, pickupInstructions: e.target.value || null }))}
            placeholder={t('settings.pickupInstructionsPlaceholder', 'يرجى إحضار رقم الطلب عند الاستلام...')}
          />
          <div className="flex justify-end">
            <PermissionGate permission="settings:update">
              <Button
                className="h-8 text-xs mt-1"
                size="sm"
                disabled={giftOptionsSaving}
                onClick={async () => {
                  setGiftOptionsSaving(true);
                  try {
                    await settingsApi.updateGiftOptions(storeId!, {
                      giftWrapDefaultPrice: Number(giftOptions.giftWrapDefaultPrice),
                      giftMessageMaxLength: giftOptions.giftMessageMaxLength,
                      giftWrapInstructions: giftOptions.giftWrapInstructions,
                      pickupInstructions: giftOptions.pickupInstructions,
                    });
                    toast.success(t('settings.saved'));
                  } catch { toast.error(t('common.error')); }
                  finally { setGiftOptionsSaving(false); }
                }}
              >
                {giftOptionsSaving && <Icon name="Loader2" size="xs" className="me-1 animate-spin" />}
                {t('common.save')}
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Pickup Location Dialog — lives here because the form state is local to this tab. */}
      <Dialog open={pickupDialog} onOpenChange={setPickupDialog}>
        <DialogContent className="max-w-lg bg-white/95 backdrop-blur-2xl border border-neutral-100 shadow-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-neutral-900">
              {pickupEditId ? t('settings.editPickup', 'تعديل الفرع') : t('settings.createPickup', 'إضافة فرع')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.pickupNameAr', 'اسم الفرع (عربي)')} <span className="text-red-500">*</span></Label>
                <Input value={pickupForm.nameAr} onChange={e => setPickupForm(p => ({ ...p, nameAr: e.target.value }))} className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm text-neutral-500">{t('settings.pickupNameEn', 'اسم الفرع (إنجليزي)')}</Label>
                <Input value={pickupForm.nameEn} onChange={e => setPickupForm(p => ({ ...p, nameEn: e.target.value }))} className="h-9 text-sm" dir="ltr" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupAddress', 'العنوان')}</Label>
              <Input value={pickupForm.address} onChange={e => setPickupForm(p => ({ ...p, address: e.target.value }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupMapsUrl', 'رابط خرائط Google')}</Label>
              <Input value={pickupForm.mapsUrl} onChange={e => setPickupForm(p => ({ ...p, mapsUrl: e.target.value }))} className="h-9 text-sm" dir="ltr" placeholder="https://maps.google.com/..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupPhone', 'رقم التواصل')}</Label>
              <Input value={pickupForm.phone} onChange={e => setPickupForm(p => ({ ...p, phone: e.target.value }))} className="h-9 text-sm" dir="ltr" placeholder="05xxxxxxxx" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupHours', 'أوقات الدوام')}</Label>
              <div className="grid grid-cols-2 gap-2">
                {['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].map(day => {
                  const hours = (() => { try { return JSON.parse(pickupForm.hours); } catch { return {}; } })();
                  return (
                    <div key={day} className="flex items-center gap-2">
                      <span className="text-xs text-neutral-400 w-12">{t(`settings.pickup${day.charAt(0).toUpperCase() + day.slice(1)}`, day)}</span>
                      <Input
                        value={hours[day] ?? ''}
                        onChange={e => {
                          const h = { ...(JSON.parse(pickupForm.hours) || {}), [day]: e.target.value };
                          setPickupForm(p => ({ ...p, hours: JSON.stringify(h) }));
                        }}
                        className="h-8 text-xs"
                        placeholder={t('settings.pickupHoursPlaceholder', '09:00-22:00')}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm text-neutral-500">{t('settings.pickupInstructions', 'تعليمات الاستلام')}</Label>
              <textarea
                className="flex h-20 w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                value={pickupForm.instructions}
                onChange={e => setPickupForm(p => ({ ...p, instructions: e.target.value }))}
                placeholder={t('settings.pickupInstructionsPlaceholder', 'يرجى إحضار رقم الطلب عند الاستلام...')}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pickupIsActive"
                checked={pickupForm.isActive}
                onChange={e => setPickupForm(p => ({ ...p, isActive: e.target.checked }))}
                className="rounded border-neutral-300 h-4 w-4"
              />
              <Label htmlFor="pickupIsActive" className="cursor-pointer text-sm text-neutral-500">{t('settings.pickupIsActive', 'نشط')}</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-100">
            <Button variant="outline" className="h-9 text-sm" onClick={() => setPickupDialog(false)}>{t('common.cancel')}</Button>
            <PermissionGate permission="settings:update">
              <Button
                className="h-9 text-sm"
                disabled={pickupSaving || !pickupForm.nameAr.trim()}
                onClick={async () => {
                  if (!pickupForm.nameAr.trim()) { toast.error(t('common.required')); return; }
                  setPickupSaving(true);
                  try {
                    const data = {
                      nameAr: pickupForm.nameAr,
                      nameEn: pickupForm.nameEn || null,
                      address: pickupForm.address || null,
                      mapsUrl: pickupForm.mapsUrl || null,
                      phone: pickupForm.phone || null,
                      hours: JSON.parse(pickupForm.hours),
                      instructions: pickupForm.instructions || null,
                      isActive: pickupForm.isActive,
                    };
                    if (pickupEditId) {
                      const updated = await settingsApi.updatePickupLocation(storeId!, pickupEditId, data) as PickupLocation;
                      setPickupLocations(p => p.map(l => l.id === pickupEditId ? updated : l));
                      toast.success(t('shipping.updated'));
                    } else {
                      const created = await settingsApi.createPickupLocation(storeId!, data) as PickupLocation;
                      setPickupLocations(p => [...p, created]);
                      toast.success(t('shipping.created'));
                    }
                    setPickupDialog(false);
                  } catch (err) {
                    toast.error(err instanceof ApiClientError ? err.message : t('common.error'));
                  } finally { setPickupSaving(false); }
                }}
              >
                {pickupSaving && <Icon name="Loader2" size="xs" className="me-2 animate-spin" />}
                {pickupSaving ? t('common.saving') : t('common.save')}
              </Button>
            </PermissionGate>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

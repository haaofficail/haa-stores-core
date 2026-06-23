import { useTranslation } from 'react-i18next';
import { TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SectionHeader, ToggleRow } from '../atoms';
import type { ThemeConfig } from '../constants';

interface Props {
  config: ThemeConfig;
  updateConfig: (path: string, value: any) => void;
}

export function FooterTab({ config, updateConfig }: Props) {
  const { t } = useTranslation();
  const footer = config.footer || {};
  return (
    <TabsContent value="footer" className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.footerSettings', 'إعدادات الفوتر')} />
        <div className="space-y-4">
          <ToggleRow label={t('theme.showPayment', 'شعارات الدفع')} checked={footer.showPaymentLogos !== false} onChange={(v) => updateConfig('footer.showPaymentLogos', v)} />
          <ToggleRow label={t('theme.showSocial', 'روابط التواصل')} checked={footer.showSocialLinks !== false} onChange={(v) => updateConfig('footer.showSocialLinks', v)} />
          <ToggleRow label={t('theme.showNewsletter', 'الاشتراك البريدى')} checked={footer.showNewsletter !== false} onChange={(v) => updateConfig('footer.showNewsletter', v)} />
          <div>
            <Label className="text-sm font-medium text-neutral-700 mb-2 block">{t('theme.companyDesc', 'وصف الشركة')}</Label>
            <textarea value={footer.companyDescription || ''} onChange={(e) => updateConfig('footer.companyDescription', e.target.value)} className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary-500" rows={3} />
          </div>
        </div>
      </div>

      {/* ─── TRUST BADGES ─── */}
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader
          title="شعارات الثقة السعودية"
          description="فعّل الشارات الرسمية لإظهارها في متجرك. لن تظهر الشارة إلا بعد إدخال البيانات المطلوبة وتفعيل الإقرار."
        />
        <div className="space-y-4 mt-4">
          {([
            { key: 'businessPlatform', label: 'منصة الأعمال', desc: 'توثيق المتجر في منصة الأعمال السعودية', fields: ['verificationNumber', 'verificationUrl'] as const, numberLabel: 'رقم التوثيق', urlLabel: 'رابط التحقق' },
            { key: 'commercialRegistration', label: 'السجل التجاري', desc: 'توثيق السجل التجاري', fields: ['crNumber', 'verificationUrl'] as const, numberLabel: 'رقم السجل التجاري', urlLabel: 'رابط التحقق' },
            { key: 'unifiedQr', label: 'الرمز الإلكتروني الموحد QR', desc: 'رمز QR للتحقق من المتجر', fields: ['qrImageUrl', 'qrTargetUrl'] as const, numberLabel: '', urlLabel: 'رابط صورة QR' },
            { key: 'maroof', label: 'معروف', desc: 'خيار قديم (legacy) — يظهر فقط كشارة ثانوية', fields: ['maroofNumber', 'verificationUrl'] as const, numberLabel: 'رقم معروف', urlLabel: 'رابط التحقق' },
            { key: 'saudiMade', label: 'صنع في السعودية', desc: 'يتطلب عضوية وإقرار أهلية', fields: ['membershipNumber', 'verificationUrl', 'officialAssetUrl'] as const, numberLabel: 'رقم العضوية', urlLabel: 'رابط التحقق' },
            { key: 'vat', label: 'توثيق ضريبي (VAT)', desc: 'الرقم الضريبي الموثق', fields: ['vatNumber', 'verificationUrl'] as const, numberLabel: 'الرقم الضريبي', urlLabel: 'رابط التحقق' },
          ] as const).map(({ key, label, desc, fields, numberLabel, urlLabel }) => {
            const badge = (config.trustBadges || {})[key] as any || {};
            const isEnabled = badge?.enabled || false;
            const hasTerms = badge?.acceptedTerms || false;
            const statusOk = isEnabled && hasTerms && fields.some(f => badge?.[f]);
            const missing: string[] = [];
            if (isEnabled) {
              if (!fields.some(f => badge?.[f])) missing.push('رقم/رابط');
              if (!hasTerms) missing.push('الإقرار');
            }

            return (
              <div key={key} className={`rounded-xl border p-4 space-y-3 transition-colors ${isEnabled ? 'border-neutral-300 bg-neutral-50' : 'border-neutral-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm text-neutral-900">{label}</p>
                    <p className="text-xs text-neutral-500">{desc}</p>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(v) => updateConfig(`trustBadges.${key}.enabled`, v)}
                  />
                </div>

                {isEnabled && (
                  <>
                    {key === 'businessPlatform' && (
                      <>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">{numberLabel}</Label>
                          <Input value={badge?.verificationNumber || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationNumber`, e.target.value)} placeholder="رقم التوثيق في منصة الأعمال" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">{urlLabel}</Label>
                          <Input value={badge?.verificationUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                        </div>
                      </>
                    )}
                    {key === 'commercialRegistration' && (
                      <>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">{numberLabel}</Label>
                          <Input value={badge?.crNumber || ''} onChange={(e) => updateConfig(`trustBadges.${key}.crNumber`, e.target.value)} placeholder="رقم السجل التجاري" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">{urlLabel}</Label>
                          <Input value={badge?.verificationUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                        </div>
                      </>
                    )}
                    {key === 'unifiedQr' && (
                      <>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">رابط صورة QR</Label>
                          <Input value={badge?.qrImageUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.qrImageUrl`, e.target.value)} placeholder="https://example.com/qr.png" dir="ltr" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">رابط الهدف (اختياري)</Label>
                          <Input value={badge?.qrTargetUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.qrTargetUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                        </div>
                        {badge?.qrImageUrl && (
                          <div className="mt-2">
                            <p className="text-xs text-neutral-500 mb-1">معاينة QR:</p>
                            <img src={badge.qrImageUrl} alt="QR preview" className="h-12 w-12 object-contain border rounded" />
                          </div>
                        )}
                      </>
                    )}
                    {key === 'maroof' && (
                      <>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">{numberLabel}</Label>
                          <Input value={badge?.maroofNumber || ''} onChange={(e) => updateConfig(`trustBadges.${key}.maroofNumber`, e.target.value)} placeholder="رقم معروف" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">{urlLabel}</Label>
                          <Input value={badge?.verificationUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                        </div>
                        <p className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg">هذا الخيار قديم (legacy). إذا كانت منصة الأعمال مفعلة، ستكون هي شارة التوثيق الأساسية.</p>
                      </>
                    )}
                    {key === 'saudiMade' && (
                      <>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">{numberLabel}</Label>
                          <Input value={badge?.membershipNumber || ''} onChange={(e) => updateConfig(`trustBadges.${key}.membershipNumber`, e.target.value)} placeholder="رقم العضوية" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">{urlLabel}</Label>
                          <Input value={badge?.verificationUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">رابط أصل الشعار الرسمي (اختياري)</Label>
                          <Input value={badge?.officialAssetUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.officialAssetUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                        </div>
                        <ToggleRow
                          label="تأكيد العضوية"
                          description="أقر بأن المنتجات تحمل شعار صنع في السعودية بشكل قانوني"
                          checked={badge?.memberConfirmed || false}
                          onChange={(v) => updateConfig(`trustBadges.${key}.memberConfirmed`, v)}
                        />
                      </>
                    )}
                    {key === 'vat' && (
                      <>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">{numberLabel}</Label>
                          <Input value={badge?.vatNumber || ''} onChange={(e) => updateConfig(`trustBadges.${key}.vatNumber`, e.target.value)} placeholder="الرقم الضريبي" />
                        </div>
                        <div>
                          <Label className="text-xs font-medium text-neutral-700 mb-1 block">{urlLabel}</Label>
                          <Input value={badge?.verificationUrl || ''} onChange={(e) => updateConfig(`trustBadges.${key}.verificationUrl`, e.target.value)} placeholder="https://" dir="ltr" />
                        </div>
                      </>
                    )}

                    <div className="flex items-start gap-2 pt-1">
                      <input
                        type="checkbox"
                        id={`trust-terms-${key}`}
                        checked={hasTerms}
                        onChange={(e) => updateConfig(`trustBadges.${key}.acceptedTerms`, e.target.checked)}
                        className="mt-0.5 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <label htmlFor={`trust-terms-${key}`} className="text-xs text-neutral-600 cursor-pointer">
                        أقر بأنني مخول باستخدام هذه الشارة/الشعار وأن البيانات المدخلة صحيحة، وأتحمل مسؤولية استخدامها.
                      </label>
                    </div>

                    <div className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${statusOk ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {statusOk ? (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          مستوفي — الشارة ستظهر في المتجر
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3.5 w-3.5" />
                          ينقصه: {missing.join('، ')}
                        </>
                      )}
                    </div>
                  </>
                )}

                {!isEnabled && (
                  <p className="text-xs text-neutral-400">الشارة معطلة. فعّلها لإظهار خيارات الإعداد.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </TabsContent>
  );
}

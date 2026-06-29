import { useTranslation } from 'react-i18next';
import { TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SectionHeader } from '../atoms';
import type { ThemeConfig } from '../constants';

interface Props {
  config: ThemeConfig;
  updateConfig: (path: string, value: unknown) => void;
}

type SocialKey = keyof ThemeConfig['socialLinks'];
const SOCIAL_FIELDS: Array<{ key: SocialKey; label: string }> = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'twitter', label: 'X (Twitter)' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'snapchat', label: 'Snapchat' },
  { key: 'whatsapp', label: 'WhatsApp' },
];

export function SocialTab({ config, updateConfig }: Props) {
  const { t } = useTranslation();
  const socialLinks = config.socialLinks || {};
  return (
    <TabsContent value="social" className="space-y-6">
      <div className="bg-white rounded-2xl border border-neutral-200 p-5">
        <SectionHeader title={t('theme.socialLinks', 'روابط التواصل الاجتماعي')} />
        <div className="space-y-4">
          {SOCIAL_FIELDS.map(({ key, label }) => (
            <div key={key}>
              <Label className="text-sm font-medium text-neutral-700 mb-1 block">{label}</Label>
              <Input value={socialLinks[key] || ''} onChange={(e) => updateConfig(`socialLinks.${key}`, e.target.value)} placeholder={`${label} URL...`} dir="ltr" />
            </div>
          ))}
        </div>
      </div>
    </TabsContent>
  );
}

import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

/**
 * Small layout atoms extracted verbatim from ThemeEditor.tsx — no behavior change.
 */
export function ToggleRow({ label, description, checked, onChange }: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <Label className="text-sm font-medium text-neutral-700">{label}</Label>
        {description && <p className="text-xs text-neutral-500">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="font-bold text-base text-neutral-900">{title}</h3>
      {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
    </div>
  );
}

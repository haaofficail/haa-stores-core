import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ThemeEditorField } from '@haa/storefront-themes/server';

function getNestedValue(obj: Record<string, any>, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setNestedValue(obj: Record<string, any>, path: string, value: unknown): Record<string, any> {
  const keys = path.split('.');
  const result = structuredClone(obj);
  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]] || typeof current[keys[i]] !== 'object') current[keys[i]] = {};
    current = current[keys[i]];
  }
  current[keys[keys.length - 1]] = value;
  return result;
}

export function SchemaFieldRenderer({
  field,
  config,
  onUpdate,
}: {
  field: ThemeEditorField;
  config: Record<string, any>;
  onUpdate: (path: string, value: unknown) => void;
}) {
  const value = getNestedValue(config, field.key);

  switch (field.type) {
    case 'text':
      return (
        <div>
          <Label className="text-sm font-medium text-neutral-700 mb-1.5 block">{field.label}</Label>
          <Input
            value={String(value ?? '')}
            onChange={(e) => onUpdate(field.key, e.target.value)}
            className="w-full"
          />
        </div>
      );

    case 'textarea':
      return (
        <div>
          <Label className="text-sm font-medium text-neutral-700 mb-1.5 block">{field.label}</Label>
          <textarea
            value={String(value ?? '')}
            onChange={(e) => onUpdate(field.key, e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-neutral-200 text-sm focus:outline-none focus:border-primary-500"
            rows={3}
          />
        </div>
      );

    case 'boolean':
      return (
        <div className="flex items-center justify-between py-1.5">
          <Label className="text-sm font-medium text-neutral-700">{field.label}</Label>
          <Switch
            checked={value !== false}
            onCheckedChange={(v) => onUpdate(field.key, v)}
          />
        </div>
      );

    case 'select':
      return (
        <div>
          <Label className="text-sm font-medium text-neutral-700 mb-1.5 block">{field.label}</Label>
          <Select
            value={String(value ?? field.options?.[0] ?? '')}
            onValueChange={(v) => onUpdate(field.key, v)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt: string) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );

    default:
      return (
        <div>
          <Label className="text-sm font-medium text-neutral-700 mb-1.5 block">{field.label}</Label>
          <Input
            value={String(value ?? '')}
            onChange={(e) => onUpdate(field.key, e.target.value)}
            className="w-full"
          />
        </div>
      );
  }
}

export function saveThemeSpecificConfig(
  config: Record<string, any>,
  activeTheme: string,
  path: string,
  value: unknown,
): Record<string, any> {
  const next = structuredClone(config);
  if (!next.themeSpecific) next.themeSpecific = {};
  if (!next.themeSpecific[activeTheme]) next.themeSpecific[activeTheme] = {};
  next.themeSpecific[activeTheme] = setNestedValue(next.themeSpecific[activeTheme], path, value);
  return next;
}

export function loadThemeSpecificConfig(
  config: Record<string, any>,
  activeTheme: string,
): Record<string, any> {
  return config?.themeSpecific?.[activeTheme] ?? {};
}

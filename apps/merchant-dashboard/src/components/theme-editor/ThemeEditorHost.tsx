import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getThemeCapsule } from '@haa/storefront-themes';
import { SchemaFieldRenderer, saveThemeSpecificConfig, loadThemeSpecificConfig } from './SchemaFieldRenderer';
import type { ThemeEditorGroup } from '@haa/storefront-themes';

export function ThemeEditorHost({
  config,
  activeTheme,
  onUpdateConfig,
}: {
  config: Record<string, any>;
  activeTheme: string;
  onUpdateConfig: (path: string, value: any) => void;
}) {
  const { t } = useTranslation();
  const capsule = useMemo(() => getThemeCapsule(activeTheme), [activeTheme]);
  const schema = capsule?.editorSchema;
  const hasSchema = Boolean(schema?.groups?.length);

  const themeSpecificConfig = useMemo(
    () => loadThemeSpecificConfig(config, activeTheme),
    [config, activeTheme],
  );

  const handleUpdate = (path: string, value: unknown) => {
    const next = saveThemeSpecificConfig(config, activeTheme, path, value);
    onUpdateConfig('themeSpecific', next.themeSpecific);
  };

  const preview = capsule?.preview;
  const capabilities = capsule?.capabilities;

  return (
    <div className="space-y-6">
      {/* Preview Card */}
      {preview && (
        <div className="bg-white rounded-2xl border border-neutral-200 p-5">
          <h3 className="text-sm font-bold text-neutral-900 mb-3">
            {t('theme.capsulePreview', 'نبذة عن الثيم')}
          </h3>
          <div className="space-y-2">
            <p className="text-sm text-neutral-600">{preview.descriptionAr}</p>
            <div className="flex flex-wrap gap-2">
              {preview.sampleStoreType && (
                <span className="text-xs bg-neutral-100 text-neutral-600 rounded-full px-2.5 py-0.5">
                  {preview.sampleStoreType}
                </span>
              )}
              {capsule?.category && (
                <span className="text-xs bg-primary-50 text-primary-700 rounded-full px-2.5 py-0.5">
                  {capsule.category}
                </span>
              )}
              {capsule?.version && (
                <span className="text-xs text-neutral-400 font-mono">
                  v{capsule.version}
                </span>
              )}
            </div>
            {capabilities && (
              <details className="text-xs text-neutral-500 mt-2">
                <summary className="cursor-pointer hover:text-neutral-700 select-none">
                  {t('theme.capabilities', 'الإمكانيات')}
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {Object.entries(capabilities).map(([key, val]) => (
                    <div key={key} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${val ? 'bg-green-400' : 'bg-neutral-200'}`} />
                      <span className="text-neutral-500">{key.replace('supports', '')}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>
      )}

      {/* Schema-based Editor */}
      {hasSchema && schema ? (
        schema.groups.map((group: ThemeEditorGroup) => (
          <div key={group.id} className="bg-white rounded-2xl border border-neutral-200 p-5">
            <h3 className="text-sm font-bold text-neutral-900 mb-4">{group.title}</h3>
            <div className="space-y-4">
              {group.fields.map((field) => (
                <SchemaFieldRenderer
                  key={field.key}
                  field={field}
                  config={themeSpecificConfig}
                  onUpdate={handleUpdate}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center">
          <p className="text-sm text-neutral-500">
            {t('theme.noSchema', 'لا يوجد محرر مخصص لهذا الثيم. استخدم الأقسام العامة.')}
          </p>
        </div>
      )}
    </div>
  );
}

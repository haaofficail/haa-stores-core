export type ThemeCapsuleCategory =
  | 'luxury' | 'minimal' | 'fashion' | 'beauty'
  | 'electronics' | 'food' | 'general';

export type ThemeTokens = {
  colors: Record<string, string>;
  radius?: Record<string, string>;
  spacing?: Record<string, string>;
  typography?: Record<string, string>;
  shadows?: Record<string, string>;
};

export type ThemeEditorField =
  | { key: string; type: 'text'; label: string }
  | { key: string; type: 'textarea'; label: string }
  | { key: string; type: 'boolean'; label: string }
  | { key: string; type: 'select'; label: string; options: string[] }
  | { key: string; type: 'color'; label: string }
  | { key: string; type: 'image'; label: string };

export type ThemeEditorGroup = {
  id: string;
  title: string;
  fields: ThemeEditorField[];
};

export type ThemeEditorSchema = {
  groups: ThemeEditorGroup[];
};

export type ThemeSpecificConfig = Record<string, unknown>;

export type ThemeCapabilityFlags = {
  supportsHero: boolean;
  supportsCollections: boolean;
  supportsStorySection: boolean;
  supportsProductBadges: boolean;
  supportsReviews: boolean;
  supportsSalesCount: boolean;
  supportsNewsletter: boolean;
  supportsTrustBadges: boolean;
  supportsCustomFooter: boolean;
};

export type ThemePreviewMeta = {
  thumbnail?: string;
  description: string;
  descriptionAr: string;
  sampleStoreType: string;
};

export type ThemeCapsule = {
  key: string;
  name: string;
  nameAr: string;
  category: ThemeCapsuleCategory;
  version: string;

  tokens: ThemeTokens;
  defaultConfig: ThemeSpecificConfig;
  editorSchema: ThemeEditorSchema;

  preview: ThemePreviewMeta;
  capabilities: ThemeCapabilityFlags;
};

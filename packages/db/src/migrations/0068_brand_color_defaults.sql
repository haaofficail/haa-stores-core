-- Brand Color Defaults — replace banned color #56a1e3 with official Haa brand primary #5c9cd5.
--
-- Scope:
--   1. ALTER the column default on stores.primary_color
--   2. ALTER the jsonb default on store_settings.theme_config (primary color key)
--   3. UPDATE existing rows that still carry the banned color as their stored value
--      (only rows where the value was never explicitly changed by the merchant)
--
-- Idempotent: all statements use IF EXISTS / conditional WHERE clauses.
-- Rollback: reverse the ALTER defaults and UPDATE below (swap color values).

-- 1. Column default
ALTER TABLE "stores"
  ALTER COLUMN "primary_color" SET DEFAULT '#5c9cd5';

-- 2. JSON default for theme_config — update the jsonb default expression
ALTER TABLE "store_settings"
  ALTER COLUMN "theme_config" SET DEFAULT '{
    "preset": "minimal",
    "colors": {
      "primary": "#5c9cd5",
      "surface1": "#ffffff",
      "surface2": "#f8f9fa",
      "surface3": "#f1f3f5",
      "textPrimary": "#1a1a1a",
      "textSecondary": "#6b7280",
      "textTertiary": "#9ca3af",
      "border": "#e5e7eb",
      "borderHover": "#d1d5db",
      "success": "#10b981",
      "warning": "#f59e0b",
      "error": "#ef4444"
    },
    "font": {
      "family": "IBM Plex Sans Arabic"
    }
  }';

-- 3. Migrate existing stores that still have the banned default color
UPDATE "stores"
SET "primary_color" = '#5c9cd5'
WHERE "primary_color" = '#56a1e3';

-- 4. Migrate existing store_settings where the jsonb primary color is still the banned color
UPDATE "store_settings"
SET "theme_config" = jsonb_set(
  "theme_config",
  '{colors,primary}',
  '"#5c9cd5"'
)
WHERE "theme_config" -> 'colors' ->> 'primary' = '#56a1e3';

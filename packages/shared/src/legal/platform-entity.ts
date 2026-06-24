/**
 * Official commercial registration data for the Haa Stores
 * operating entity. Owner-provided 2026-06-24.
 *
 * Single source of truth. NEVER duplicate these values as
 * string literals elsewhere — import them.
 */
export const PLATFORM_LEGAL_ENTITY = {
  legalNameAr: 'مؤسسة حرف الهاء التجارية',
  legalNameEn: 'Haa Stores Establishment', // best transliteration
  entityType: 'establishment', // مؤسسة
  commercialRegistration: '7038798612',
  issueDate: '2024-04-08',
  status: 'active' as const,
  // Display strings ready for inline use (escape-safe — pure data, no HTML).
  displayLine: 'مؤسسة حرف الهاء التجارية · س.ت. 7038798612',
} as const;

export type PlatformLegalEntity = typeof PLATFORM_LEGAL_ENTITY;

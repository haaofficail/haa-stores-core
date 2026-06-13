import { eq, and } from 'drizzle-orm';
import { createDbClient, DbClient } from '@haa/db';
import * as s from '@haa/db/schema';
import type { ProviderCode } from '@haa/shared';
import { encrypt, decrypt, redactCredential } from './encryption.js';
export { redactCredential, isEncryptionKeySet } from './encryption.js';

export interface PaymentProviderSetting {
  id: number;
  storeId: number;
  providerCode: string;
  enabled: boolean;
  mode: string;
  country: string;
  currency: string;
  displayNameAr: string | null;
  displayNameEn: string | null;
  sortOrder: number;
  minOrderAmount: string | null;
  maxOrderAmount: string | null;
  supportedPaymentMethod: string;
  status: string;
  lastValidatedAt: string | null;
  lastValidationError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentProviderSettingView {
  providerCode: string;
  enabled: boolean;
  mode: string;
  status: string;
  displayNameAr: string | null;
  displayNameEn: string | null;
  sortOrder: number;
  minOrderAmount: string | null;
  maxOrderAmount: string | null;
  supportedPaymentMethod: string;
  lastValidatedAt: string | null;
  lastValidationError: string | null;
  credentialsConfigured: boolean;
  credentialsPreview: string | null;
}

export interface UpsertPaymentProviderInput {
  enabled?: boolean;
  mode?: string;
  country?: string;
  currency?: string;
  displayNameAr?: string;
  displayNameEn?: string;
  sortOrder?: number;
  minOrderAmount?: string;
  maxOrderAmount?: string;
}

export interface CredentialsInput {
  tabby?: { secretKey?: string; publicKey?: string; merchantCode?: string; webhookSecret?: string };
  tamara?: { apiToken?: string; notificationToken?: string };
}

export interface ProviderValidationResult {
  valid: boolean;
  errors: string[];
}

export interface PaymentMethodAvailability {
  provider: string;
  name: string;
  available: boolean;
  reason: string | null;
  mode: string;
  minOrderAmount: string | null;
  maxOrderAmount: string | null;
  currency: string;
}

export type UnavailabilityReason =
  | 'PROVIDER_DISABLED'
  | 'PROVIDER_NOT_CONFIGURED'
  | 'MISSING_CREDENTIALS'
  | 'UNSUPPORTED_COUNTRY'
  | 'UNSUPPORTED_CURRENCY'
  | 'ORDER_AMOUNT_BELOW_MINIMUM'
  | 'ORDER_AMOUNT_ABOVE_MAXIMUM';

const BNPL_PROVIDERS = [
  { code: 'tabby' as ProviderCode, method: 'tabby_installments', ar: 'تابي', en: 'Tabby' },
  { code: 'tamara' as ProviderCode, method: 'tamara_installments', ar: 'تمارا', en: 'Tamara' },
];

export function getTabbyBaseUrl(country: string): string {
  return country === 'SA' ? 'https://api.tabby.sa' : 'https://api.tabby.ai';
}

export function getTamaraBaseUrl(mode: string): string {
  return mode === 'live' ? 'https://api.tamara.co' : 'https://api-sandbox.tamara.co';
}

export function validateTabbyCredentials(input: { secretKey?: string; publicKey?: string }): ProviderValidationResult {
  const errors: string[] = [];
  if (!input.secretKey) errors.push('Tabby secretKey is required');
  if (!input.publicKey) errors.push('Tabby publicKey is required');
  return { valid: errors.length === 0, errors };
}

export function validateTamaraCredentials(input: { apiToken?: string; notificationToken?: string }): ProviderValidationResult {
  const errors: string[] = [];
  if (!input.apiToken) errors.push('Tamara apiToken is required');
  if (!input.notificationToken) errors.push('Tamara notificationToken (webhookToken) is required');
  return { valid: errors.length === 0, errors };
}

export class PaymentProviderSettingsService {
  constructor(private db: DbClient = createDbClient()) {}

  async list(storeId: number): Promise<PaymentProviderSettingView[]> {
    const rows = await this.db.select().from(s.merchantPaymentProviderSettings)
      .where(eq(s.merchantPaymentProviderSettings.storeId, storeId));

    const results: PaymentProviderSettingView[] = [];

    for (const provider of BNPL_PROVIDERS) {
      const row = rows.find(r => r.providerCode === provider.code);
      const creds = await this.getCredentialsRaw(storeId, provider.code);

      let credsPreview: string | null = null;
      if (creds) {
        try {
          const decrypted = decrypt(creds.encryptedPayload);
          const payload = JSON.parse(decrypted) as Record<string, string>;
          const firstKey = Object.values(payload)[0];
          if (firstKey) credsPreview = redactCredential(firstKey);
        } catch {
          // If decryption fails (e.g. wrong key), just show null
        }
      }

      results.push({
        providerCode: provider.code,
        enabled: row?.enabled ?? false,
        mode: row?.mode ?? 'test',
        status: row?.status ?? (creds ? 'configured' : 'not_configured'),
        displayNameAr: row?.displayNameAr ?? provider.ar,
        displayNameEn: row?.displayNameEn ?? provider.en,
        sortOrder: row?.sortOrder ?? 0,
        minOrderAmount: row?.minOrderAmount ?? null,
        maxOrderAmount: row?.maxOrderAmount ?? null,
        supportedPaymentMethod: row?.supportedPaymentMethod ?? provider.method,
        lastValidatedAt: row?.lastValidatedAt?.toISOString() ?? null,
        lastValidationError: row?.lastValidationError ?? null,
        credentialsConfigured: !!creds,
        credentialsPreview: credsPreview,
      });
    }

    return results;
  }

  async upsertSettings(storeId: number, providerCode: string, input: UpsertPaymentProviderInput): Promise<PaymentProviderSetting> {
    const existing = await this.db.select().from(s.merchantPaymentProviderSettings)
      .where(and(
        eq(s.merchantPaymentProviderSettings.storeId, storeId),
        eq(s.merchantPaymentProviderSettings.providerCode, providerCode),
      )).limit(1);

    const provider = BNPL_PROVIDERS.find(p => p.code === providerCode);
    if (!provider) throw new Error(`Unknown provider: ${providerCode}`);

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (input.enabled !== undefined) updateData.enabled = input.enabled;
    if (input.mode !== undefined) updateData.mode = input.mode;
    if (input.country !== undefined) updateData.country = input.country;
    if (input.currency !== undefined) updateData.currency = input.currency;
    if (input.displayNameAr !== undefined) updateData.displayNameAr = input.displayNameAr;
    if (input.displayNameEn !== undefined) updateData.displayNameEn = input.displayNameEn;
    if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
    if (input.minOrderAmount !== undefined) updateData.minOrderAmount = input.minOrderAmount;
    if (input.maxOrderAmount !== undefined) updateData.maxOrderAmount = input.maxOrderAmount;

    if (existing.length > 0) {
      const [updated] = await this.db.update(s.merchantPaymentProviderSettings)
        .set(updateData)
        .where(eq(s.merchantPaymentProviderSettings.id, existing[0].id))
        .returning();
      return updated as unknown as PaymentProviderSetting;
    }

    const [created] = await this.db.insert(s.merchantPaymentProviderSettings).values({
      storeId,
      providerCode,
      supportedPaymentMethod: provider.method,
      ...updateData,
    } as any).returning();

    return created as unknown as PaymentProviderSetting;
  }

  async saveCredentials(storeId: number, providerCode: string, input: Record<string, string>): Promise<void> {
    const encryptedPayload = encrypt(JSON.stringify(input));
    const existing = await this.db.select().from(s.merchantPaymentProviderCredentials)
      .where(and(
        eq(s.merchantPaymentProviderCredentials.storeId, storeId),
        eq(s.merchantPaymentProviderCredentials.providerCode, providerCode),
      )).limit(1);

    if (existing.length > 0) {
      await this.db.update(s.merchantPaymentProviderCredentials)
        .set({ encryptedPayload, keyVersion: 'v1', updatedAt: new Date(), rotatedAt: new Date() })
        .where(eq(s.merchantPaymentProviderCredentials.id, existing[0].id));
    } else {
      await this.db.insert(s.merchantPaymentProviderCredentials).values({
        storeId, providerCode, encryptedPayload, keyVersion: 'v1',
      });
    }
  }

  async deleteCredentials(storeId: number, providerCode: string): Promise<void> {
    await this.db.delete(s.merchantPaymentProviderCredentials)
      .where(and(
        eq(s.merchantPaymentProviderCredentials.storeId, storeId),
        eq(s.merchantPaymentProviderCredentials.providerCode, providerCode),
      ));

    await this.db.update(s.merchantPaymentProviderSettings)
      .set({ status: 'not_configured', enabled: false, lastValidatedAt: null, lastValidationError: null, updatedAt: new Date() })
      .where(and(
        eq(s.merchantPaymentProviderSettings.storeId, storeId),
        eq(s.merchantPaymentProviderSettings.providerCode, providerCode),
      ));
  }

  async disable(storeId: number, providerCode: string): Promise<void> {
    const existing = await this.db.select().from(s.merchantPaymentProviderSettings)
      .where(and(
        eq(s.merchantPaymentProviderSettings.storeId, storeId),
        eq(s.merchantPaymentProviderSettings.providerCode, providerCode),
      )).limit(1);

    if (existing.length > 0) {
      await this.db.update(s.merchantPaymentProviderSettings)
        .set({ enabled: false, updatedAt: new Date() })
        .where(eq(s.merchantPaymentProviderSettings.id, existing[0].id));
    }
  }

  async validate(storeId: number, providerCode: string): Promise<ProviderValidationResult> {
    const creds = await this.getCredentialsRaw(storeId, providerCode);
    if (!creds) return { valid: false, errors: ['No credentials configured'] };

    let payload: Record<string, string>;
    try {
      payload = JSON.parse(decrypt(creds.encryptedPayload)) as Record<string, string>;
    } catch {
      return { valid: false, errors: ['Failed to decrypt credentials'] };
    }

    let result: ProviderValidationResult;
    if (providerCode === 'tabby') {
      result = validateTabbyCredentials(payload);
    } else if (providerCode === 'tamara') {
      result = validateTamaraCredentials(payload);
    } else {
      result = { valid: false, errors: [`Unknown provider: ${providerCode}`] };
    }

    const status = result.valid ? 'configured' : 'invalid';
    await this.db.update(s.merchantPaymentProviderSettings)
      .set({
        status,
        lastValidatedAt: new Date(),
        lastValidationError: result.valid ? null : result.errors.join('; '),
        updatedAt: new Date(),
      })
      .where(and(
        eq(s.merchantPaymentProviderSettings.storeId, storeId),
        eq(s.merchantPaymentProviderSettings.providerCode, providerCode),
      ));

    return result;
  }

  async getAvailableMethods(
    storeId: number,
    options?: { country?: string; currency?: string; amount?: number }
  ): Promise<PaymentMethodAvailability[]> {
    const rows = await this.db.select().from(s.merchantPaymentProviderSettings)
      .where(eq(s.merchantPaymentProviderSettings.storeId, storeId));

    const results: PaymentMethodAvailability[] = [];

    for (const provider of BNPL_PROVIDERS) {
      const row = rows.find(r => r.providerCode === provider.code);
      const credsRow = await this.getCredentialsRaw(storeId, provider.code);

      const enabled = row?.enabled ?? false;
      const status = row?.status ?? (credsRow ? 'configured' : 'not_configured');
      const mode = row?.mode ?? 'test';
      const currency = row?.currency ?? 'SAR';
      const displayNameAr = row?.displayNameAr ?? provider.ar;
      const displayNameEn = row?.displayNameEn ?? provider.en;
      const sortOrder = row?.sortOrder ?? 0;
      const minOrderAmount = row?.minOrderAmount ?? null;
      const maxOrderAmount = row?.maxOrderAmount ?? null;
      const configuredCountry = row?.country ?? null;

      let available = true;
      let reason: string | null = null;

      if (!enabled) {
        available = false;
        reason = 'PROVIDER_DISABLED';
      } else if (status === 'not_configured') {
        available = false;
        reason = 'PROVIDER_NOT_CONFIGURED';
      } else if (!credsRow) {
        available = false;
        reason = 'MISSING_CREDENTIALS';
      } else if (configuredCountry && options?.country && configuredCountry !== options.country) {
        available = false;
        reason = 'UNSUPPORTED_COUNTRY';
      } else if (options?.currency && currency !== options.currency) {
        available = false;
        reason = 'UNSUPPORTED_CURRENCY';
      } else if (options?.amount !== undefined && minOrderAmount !== null && Number(minOrderAmount) > options.amount) {
        available = false;
        reason = 'ORDER_AMOUNT_BELOW_MINIMUM';
      } else if (options?.amount !== undefined && maxOrderAmount !== null && Number(maxOrderAmount) < options.amount) {
        available = false;
        reason = 'ORDER_AMOUNT_ABOVE_MAXIMUM';
      }

      results.push({
        provider: provider.code,
        name: displayNameAr ?? provider.ar,
        available,
        reason,
        mode,
        minOrderAmount,
        maxOrderAmount,
        currency,
      });
    }

    results.sort((a, b) => {
      const aOrder = rows.find(r => r.providerCode === a.provider)?.sortOrder ?? 0;
      const bOrder = rows.find(r => r.providerCode === b.provider)?.sortOrder ?? 0;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return a.name.localeCompare(b.name);
    });

    return results;
  }

  async getCredentialsDecrypted(storeId: number, providerCode: string): Promise<Record<string, string> | null> {
    const creds = await this.getCredentialsRaw(storeId, providerCode);
    if (!creds) return null;
    try {
      return JSON.parse(decrypt(creds.encryptedPayload)) as Record<string, string>;
    } catch {
      return null;
    }
  }

  private async getCredentialsRaw(storeId: number, providerCode: string) {
    const [row] = await this.db.select().from(s.merchantPaymentProviderCredentials)
      .where(and(
        eq(s.merchantPaymentProviderCredentials.storeId, storeId),
        eq(s.merchantPaymentProviderCredentials.providerCode, providerCode),
      )).limit(1);
    return row ?? null;
  }
}

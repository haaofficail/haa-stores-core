export type MerchantComplianceForm = {
  businessType: string;
  legalName: string;
  commercialName: string;
  nationalId: string;
  hasNationalIdOnFile: boolean;
  nationalIdLast4: string;
  freelanceDocNumber: string;
  crNumber: string;
  city: string;
  address: string;
  vatNumber: string;
};

export type ComplianceProfileResponse = {
  businessType?: string | null;
  legalName?: string | null;
  commercialName?: string | null;
  nationalIdOrIqama?: string | null;
  nationalId?: string | null;
  hasNationalIdOrIqama?: boolean | null;
  nationalIdOrIqamaLast4?: string | null;
  nationalIdLast4?: string | null;
  freelanceDocumentNumber?: string | null;
  freelanceDocNumber?: string | null;
  commercialRegistrationNumber?: string | null;
  crNumber?: string | null;
  city?: string | null;
  address?: string | null;
  vatNumber?: string | null;
};

export type ComplianceProfileUpdatePayload = {
  businessType: string;
  legalName: string;
  city: string;
  address: string;
  commercialName?: string;
  nationalIdOrIqama?: string;
  freelanceDocumentNumber?: string;
  commercialRegistrationNumber?: string;
  vatNumber?: string;
};

export type MerchantBankAccountSummary = {
  id?: number;
  accountHolderName?: string | null;
  bankName?: string | null;
  ibanLast4?: string | null;
  isDefault?: boolean | null;
  status?: string | null;
};

const READY_BANK_STATUSES = new Set(['submitted', 'under_review', 'verified', 'approved']);

function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function emptyComplianceProfile(): MerchantComplianceForm {
  return {
    businessType: '',
    legalName: '',
    commercialName: '',
    nationalId: '',
    hasNationalIdOnFile: false,
    nationalIdLast4: '',
    freelanceDocNumber: '',
    crNumber: '',
    city: '',
    address: '',
    vatNumber: '',
  };
}

export function normalizeComplianceProfile(profile: ComplianceProfileResponse | null | undefined): MerchantComplianceForm {
  if (!profile) return emptyComplianceProfile();

  const nationalId = toText(profile.nationalIdOrIqama ?? profile.nationalId);
  const nationalIdLast4 = toText(
    profile.nationalIdOrIqamaLast4 ?? profile.nationalIdLast4 ?? (nationalId ? nationalId.slice(-4) : ''),
  );

  return {
    businessType: toText(profile.businessType),
    legalName: toText(profile.legalName),
    commercialName: toText(profile.commercialName),
    nationalId,
    hasNationalIdOnFile: Boolean(profile.hasNationalIdOrIqama) || nationalId.length > 0 || nationalIdLast4.length > 0,
    nationalIdLast4,
    freelanceDocNumber: toText(profile.freelanceDocumentNumber ?? profile.freelanceDocNumber),
    crNumber: toText(profile.commercialRegistrationNumber ?? profile.crNumber),
    city: toText(profile.city),
    address: toText(profile.address),
    vatNumber: toText(profile.vatNumber),
  };
}

export function hasProfileNationalId(form: MerchantComplianceForm): boolean {
  return form.nationalId.trim().length > 0 || form.hasNationalIdOnFile;
}

export function toProfileUpdatePayload(form: MerchantComplianceForm): ComplianceProfileUpdatePayload {
  const payload: ComplianceProfileUpdatePayload = {
    businessType: form.businessType,
    legalName: form.legalName,
    city: form.city,
    address: form.address,
  };

  if (form.commercialName.trim()) payload.commercialName = form.commercialName.trim();
  if (form.nationalId.trim()) payload.nationalIdOrIqama = form.nationalId.replace(/\s/g, '');
  if (form.freelanceDocNumber.trim()) payload.freelanceDocumentNumber = form.freelanceDocNumber.trim();
  if (form.crNumber.trim()) payload.commercialRegistrationNumber = form.crNumber.trim();
  if (form.vatNumber.trim()) payload.vatNumber = form.vatNumber.trim();

  return payload;
}

export function validateSaudiIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '');
  if (!/^SA\d{22}$/.test(cleaned)) return false;

  const rearranged = (cleaned.slice(4) + cleaned.slice(0, 4)).split('');
  const numeric = rearranged.map((char) => {
    const code = char.charCodeAt(0);
    return code >= 65 ? String(code - 55) : char;
  }).join('');

  let remainder = 0;
  for (let index = 0; index < numeric.length; index += 1) {
    remainder = (remainder * 10 + Number.parseInt(numeric[index], 10)) % 97;
  }
  return remainder === 1;
}

export function normalizeBankAccountSummary(value: unknown): MerchantBankAccountSummary | null {
  const accounts = Array.isArray(value) ? value : value ? [value] : [];
  const primary = accounts.find((account): account is MerchantBankAccountSummary => {
    return Boolean(account && typeof account === 'object' && (account as MerchantBankAccountSummary).isDefault);
  }) ?? accounts.find((account): account is MerchantBankAccountSummary => Boolean(account && typeof account === 'object'));

  if (!primary) return null;
  return {
    id: typeof primary.id === 'number' ? primary.id : undefined,
    accountHolderName: toText(primary.accountHolderName),
    bankName: toText(primary.bankName),
    ibanLast4: toText(primary.ibanLast4),
    isDefault: Boolean(primary.isDefault),
    status: toText(primary.status),
  };
}

export function isBankAccountReady(account: MerchantBankAccountSummary | null, pendingIban: string): boolean {
  if (account?.ibanLast4 && READY_BANK_STATUSES.has(account.status ?? '')) return true;
  return pendingIban.trim().length > 0 && validateSaudiIban(pendingIban);
}

export function formatMaskedIban(last4: string | null | undefined): string {
  const suffix = toText(last4);
  return suffix ? `SA **** **** **** **** ${suffix}` : '';
}

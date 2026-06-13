export type ComplianceSource = 'kyc' | 'store' | 'policies' | 'settings' | 'shipping' | 'payment';

export type ComplianceSeverity = 'error' | 'warning';

export interface ComplianceCheckItem {
  key: string;
  label: string;
  passed: boolean;
  required: boolean;
  source: ComplianceSource;
  severity: ComplianceSeverity;
  message: string;
}

export interface ComplianceCheckResult {
  passed: boolean;
  items: ComplianceCheckItem[];
  blockingErrorsCount: number;
  warningsCount: number;
  checkedAt: string;
}

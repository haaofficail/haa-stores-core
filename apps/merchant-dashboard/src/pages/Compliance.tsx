import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { complianceApi, ApiClientError, uploadFile as apiUploadFile } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Loader2, Upload, Trash2, CheckCircle2, XCircle, AlertTriangle, Clock,
  FileText, CreditCard, ShieldCheck, Info, Eye, EyeOff, CircleCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { PermissionGate } from '@/lib/permissions';



function validateSaudiIban(iban: string): boolean {
  const cleaned = iban.replace(/\s/g, '');
  if (!/^SA\d{22}$/.test(cleaned)) return false;

  // Modulo 97 checksum (IBAN standard ISO 7064)
  const rearranged = (cleaned.slice(4) + cleaned.slice(0, 4)).split('');
  const numeric = rearranged.map(c => {
    const code = c.charCodeAt(0);
    return code >= 65 ? String(code - 55) : c;
  }).join('');
  let remainder = 0;
  for (let i = 0; i < numeric.length; i++) {
    remainder = (remainder * 10 + parseInt(numeric[i], 10)) % 97;
  }
  return remainder === 1;
}

function maskIban(iban: string): string {
  if (!iban) return '';
  const cleaned = iban.replace(/\s/g, '');
  if (cleaned.length < 8) return cleaned;
  return `SA **** **** **** **** ${cleaned.slice(-4)}`;
}

export default function CompliancePage() {
  const { storeId } = useAuth();
  const { t } = useTranslation();
  const loadIdRef = useRef(0);

  const STATUS_MAP: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; message: string }> = {
    not_started:    { label: t('compliance.statusCard.notStarted'),       color: 'text-neutral-700', bg: 'bg-neutral-50 border-neutral-200', icon: <Clock className="h-6 w-6 text-neutral-400" />, message: t('compliance.statusCard.notStartedMsg') },
    draft:          { label: t('compliance.statusCard.draft'),            color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: <FileText className="h-6 w-6 text-yellow-500" />,  message: t('compliance.statusCard.draftMsg') },
    submitted:      { label: t('compliance.statusCard.submitted'),        color: 'text-primary-700',   bg: 'bg-primary-50 border-primary-200',     icon: <Clock className="h-6 w-6 text-primary-500" />,       message: t('compliance.statusCard.submittedMsg') },
    under_review:   { label: t('compliance.statusCard.underReview'),      color: 'text-primary-700',   bg: 'bg-primary-50 border-primary-200',     icon: <ShieldCheck className="h-6 w-6 text-primary-500" />, message: t('compliance.statusCard.underReviewMsg') },
    approved:       { label: t('compliance.statusCard.approved'),         color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   icon: <CheckCircle2 className="h-6 w-6 text-green-500" />, message: t('compliance.statusCard.approvedMsg') },
    rejected:       { label: t('compliance.statusCard.rejected'),         color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       icon: <XCircle className="h-6 w-6 text-red-500" />,       message: t('compliance.statusCard.rejectedMsg') },
    needs_more_info:{ label: t('compliance.statusCard.needsMoreInfo'),    color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', icon: <AlertTriangle className="h-6 w-6 text-orange-500" />, message: t('compliance.statusCard.needsMoreInfoMsg') },
    suspended:      { label: t('compliance.statusCard.suspended'),        color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       icon: <XCircle className="h-6 w-6 text-red-500" />,       message: t('compliance.statusCard.suspendedMsg') },
  };

  const DOCUMENT_TYPES = [
    { key: 'commercial_registration', label: t('compliance.documents.types.commercial_registration') },
    { key: 'freelance_document',     label: t('compliance.documents.types.freelance_document') },
    { key: 'vat_certificate',        label: t('compliance.documents.types.vat_certificate') },
    { key: 'iban_certificate',       label: t('compliance.documents.types.iban_certificate') },
    { key: 'other',                  label: t('compliance.documents.types.other') },
  ] as const;

  const BUSINESS_TYPE_LABELS: Record<string, string> = {
    individual: t('compliance.businessProfile.businessType_individual'),
    establishment: t('compliance.businessProfile.businessType_establishment'),
    company: t('compliance.businessProfile.businessType_company'),
    freelancer: t('compliance.businessProfile.businessType_freelancer'),
    productive_family: t('compliance.businessProfile.businessType_productive_family'),
  };

  const [status, setStatus] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [bankAccount, setBankAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState<{ passed: boolean; items: Array<{ key: string; label: string; passed: boolean; required: boolean; source: string; severity: string; message: string }>; blockingErrorsCount: number; warningsCount: number } | null>(null);

  const [form, setForm] = useState({
    businessType: '',
    legalName: '',
    commercialName: '',
    nationalId: '',
    freelanceDocNumber: '',
    crNumber: '',
    city: '',
    address: '',
    vatNumber: '',
  });

  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    bankName: '',
    iban: '',
  });

  const [uploadType, setUploadType] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showFullIban, setShowFullIban] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadData = useCallback(async () => {
    if (!storeId) return;
    const id = ++loadIdRef.current;
    setLoading(true);
    try {
      const [statusData, profileData, docsData, bankData, checklistData] = await Promise.allSettled([
        complianceApi.getStatus(storeId),
        complianceApi.getProfile(storeId),
        complianceApi.getDocuments(storeId),
        complianceApi.getBankAccount(storeId),
        complianceApi.getChecklist(storeId),
      ]);

      if (id !== loadIdRef.current) return;
      if (statusData.status === 'fulfilled') setStatus(statusData.value);
      if (profileData.status === 'fulfilled') {
        const p = profileData.value;
        setForm({
          businessType: p.businessType ?? '',
          legalName: p.legalName ?? '',
          commercialName: p.commercialName ?? '',
          nationalId: p.nationalId ?? '',
          freelanceDocNumber: p.freelanceDocNumber ?? '',
          crNumber: p.crNumber ?? '',
          city: p.city ?? '',
          address: p.address ?? '',
          vatNumber: p.vatNumber ?? '',
        });
      }
      if (id !== loadIdRef.current) return;
      if (docsData.status === 'fulfilled') setDocuments(docsData.value ?? []);
      if (bankData.status === 'fulfilled') {
        const b = bankData.value;
        setBankAccount(b);
        setBankForm({
          accountHolderName: b.accountHolderName ?? '',
          bankName: b.bankName ?? '',
          iban: b.iban ?? '',
        });
      }
      if (checklistData.status === 'fulfilled') setChecklist(checklistData.value);
    } finally {
      if (id === loadIdRef.current) setLoading(false);
    }
  }, [storeId]);

  useEffect(() => { loadData(); }, [loadData]);

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const updateBankForm = (field: string, value: string) => {
    setBankForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const isIndividualOrFreelancer = form.businessType === 'individual' || form.businessType === 'freelancer';
  const isCompanyOrEstablishment = form.businessType === 'company' || form.businessType === 'establishment';

  const validateProfile = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!form.businessType) e.businessType = t('compliance.validation.businessTypeRequired');
    if (!form.legalName.trim()) e.legalName = t('compliance.validation.legalNameRequired');
    if (!form.city.trim()) e.city = t('compliance.validation.cityRequired');
    if (!form.address.trim()) e.address = t('compliance.validation.addressRequired');
    if (isIndividualOrFreelancer) {
      if (!form.nationalId.trim()) e.nationalId = t('compliance.validation.nationalIdRequired');
    }
    if (isCompanyOrEstablishment) {
      if (!form.crNumber.trim()) e.crNumber = t('compliance.validation.crNumberRequired');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [t, form, isIndividualOrFreelancer, isCompanyOrEstablishment]);

  const validateBank = useCallback((): boolean => {
    const e: Record<string, string> = {};
    if (!bankForm.accountHolderName.trim()) e.accountHolderName = t('compliance.validation.accountHolderNameRequired');
    if (!bankForm.bankName.trim()) e.bankName = t('compliance.validation.bankNameRequired');
    if (!bankForm.iban.trim()) {
      e.iban = t('compliance.validation.ibanRequired');
    } else if (!validateSaudiIban(bankForm.iban)) {
      e.iban = t('compliance.validation.ibanInvalid');
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }, [t, bankForm]);

  const canSubmit = useMemo(() => {
    const hasBasicFields = form.businessType && form.legalName.trim() && form.city.trim() && form.address.trim();
    const hasConditionalFields = isIndividualOrFreelancer ? !!form.nationalId.trim() : true;
    const hasCrFields = isCompanyOrEstablishment ? !!form.crNumber.trim() : true;
    return hasBasicFields && hasConditionalFields && hasCrFields;
  }, [form, isIndividualOrFreelancer, isCompanyOrEstablishment]);

  const readinessItems = useMemo(() => {
    const items = [
      { key: 'businessProfile', labelKey: 'compliance.readinessChecklist.businessProfile', done: !!(form.businessType && form.legalName.trim() && form.city.trim() && form.address.trim()) },
      { key: 'documents', labelKey: 'compliance.readinessChecklist.documents', done: documents.length > 0 },
      { key: 'bankAccount', labelKey: 'compliance.readinessChecklist.bankAccount', done: !!(bankAccount?.iban || (bankForm.iban && validateSaudiIban(bankForm.iban))) },
      { key: 'vatNumber', labelKey: 'compliance.readinessChecklist.vatNumber', done: !!form.vatNumber.trim() },
      { key: 'submitForReview', labelKey: 'compliance.readinessChecklist.submitForReview', done: status?.status === 'submitted' || status?.status === 'under_review' || status?.status === 'approved' },
    ];
    return items;
  }, [form, documents, bankAccount, bankForm.iban, status]);

  const readinessCompleted = readinessItems.filter(i => i.done).length;
  const readinessTotal = readinessItems.length;

  const saveProfile = async () => {
    if (!storeId) return;
    if (!validateProfile()) {
      toast.error(t('compliance.validation.fillRequiredFields'));
      return;
    }
    setSaving(true);
    try {
      const data: any = {
        businessType: form.businessType,
        legalName: form.legalName,
        city: form.city,
        address: form.address,
      };
      if (form.commercialName) data.commercialName = form.commercialName;
      if (form.nationalId) data.nationalId = form.nationalId;
      if (form.freelanceDocNumber) data.freelanceDocNumber = form.freelanceDocNumber;
      if (form.crNumber) data.crNumber = form.crNumber;
      if (form.vatNumber) data.vatNumber = form.vatNumber;

      await complianceApi.updateProfile(storeId, data);
      loadData();
      toast.success(t('compliance.businessProfile.saved'));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('compliance.validation.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    if (!storeId) return;
    if (!validateProfile()) {
      toast.error(t('compliance.validation.fillRequiredFieldsBeforeSubmit'));
      return;
    }
    setSubmitting(true);
    try {
      await complianceApi.submit(storeId);
      loadData();
      toast.success(t('compliance.buttons.submitted'));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('compliance.validation.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async () => {
    if (!storeId || !uploadType || !uploadFile) {
      if (!uploadType) toast.error(t('compliance.validation.selectDocumentType'));
      else if (!uploadFile) toast.error(t('compliance.validation.selectFile'));
      return;
    }
    setUploading(true);
    try {
      const uploadResult = await apiUploadFile(storeId, uploadFile);
      await complianceApi.uploadDocument(storeId, {
        type: uploadType,
        fileUrl: uploadResult.url,
        filename: uploadFile.name,
        mimeType: uploadFile.type,
        sizeBytes: uploadFile.size,
      });
      setUploadType('');
      setUploadFile(null);
      loadData();
      toast.success(t('compliance.documents.uploadSuccess'));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('compliance.validation.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    if (!storeId) return;
    try {
      await complianceApi.deleteDocument(storeId, documentId);
      loadData();
      toast.success(t('compliance.documents.deleted'));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('compliance.validation.deleteError'));
    }
  };

  const saveBankAccount = async () => {
    if (!storeId) return;
    if (!validateBank()) {
      toast.error(t('compliance.validation.fixBankDetails'));
      return;
    }
    setSaving(true);
    try {
      await complianceApi.updateBankAccount(storeId, {
        accountHolderName: bankForm.accountHolderName,
        bankName: bankForm.bankName,
        iban: bankForm.iban.replace(/\s/g, ''),
      });
      loadData();
      toast.success(t('compliance.bankAccount.saved'));
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : t('compliance.validation.saveError'));
    } finally {
      setSaving(false);
    }
  };

  const statusInfo = status ? STATUS_MAP[status.status] ?? STATUS_MAP.not_started : STATUS_MAP.not_started;

  const docStatusLabel = (s: string) => {
    switch (s) {
      case 'approved': return t('compliance.documents.status.approved');
      case 'rejected': return t('compliance.documents.status.rejected');
      case 'uploaded': return t('compliance.documents.status.uploaded');
      default: return t('compliance.documents.status.not_uploaded');
    }
  };

  const docStatusColor = (s: string) => {
    switch (s) {
      case 'approved': return 'bg-green-100 text-green-700 border-green-200';
      case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'uploaded': return 'bg-primary-100 text-primary-700 border-primary-200';
      default: return 'bg-neutral-100 text-neutral-500 border-neutral-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
        <h1 className="text-2xl font-bold text-neutral-900">{t('compliance.title')}</h1>
        <Skeleton className="h-32 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-64 w-full rounded-3xl" />
        <Skeleton className="h-48 w-full rounded-3xl" />
        <Skeleton className="h-40 w-full rounded-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in" dir="rtl">
      <h1 className="text-2xl font-bold text-neutral-900">{t('compliance.title')}</h1>

      {/* Privacy Alert */}
      <div className="bg-primary-50/50 border border-primary-200/50 rounded-3xl p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-primary-500 mt-0.5 shrink-0" />
        <p className="text-sm text-primary-800">
          {t('compliance.privacyAlert.message')}
        </p>
      </div>

      {/* KYC Status Header */}
      <div className={`bg-white/80 backdrop-blur-xl rounded-3xl border shadow-card overflow-hidden border-2 ${statusInfo.bg}`}>
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-white/80 shadow-sm">{statusInfo.icon}</div>
              <div>
                <p className="text-sm text-neutral-500 mb-1">{t('compliance.statusCard.verificationStatus')}</p>
                <Badge variant="outline" className={`text-sm font-bold ${statusInfo.color} border-current`}>
                  {statusInfo.label}
                </Badge>
                <p className="text-sm mt-2 text-neutral-500">{statusInfo.message}</p>
              </div>
            </div>
            <div className="text-left">
              <p className="text-3xl font-bold text-neutral-900">{status?.completionPercent ?? 0}%</p>
              <p className="text-xs text-neutral-400 mt-1">{t('compliance.statusCard.completionPercentage')}</p>
              {status?.updatedAt && (
                <p className="text-xs text-neutral-400 mt-0.5">
                  {t('compliance.statusCard.lastUpdated')}: {new Date(status.updatedAt).toLocaleDateString('ar-SA')}
                </p>
              )}
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-white/60 rounded-full h-3">
              <div
                className="h-3 rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${status?.completionPercent ?? 0}%` }}
              />
            </div>
          </div>

          {status?.status === 'rejected' && status?.rejectionReason && (
            <div className="mt-4 p-3 bg-red-100/50 border border-red-200 rounded-2xl flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">{t('compliance.statusCard.rejectionReason')}</p>
                <p className="text-xs text-red-700 mt-0.5">{status.rejectionReason}</p>
              </div>
            </div>
          )}

          {status?.status === 'needs_more_info' && status?.needsMoreInfoReason && (
            <div className="mt-4 p-3 bg-orange-100/50 border border-orange-200 rounded-2xl flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-orange-800">{t('compliance.statusCard.needsMoreInfoReason')}</p>
                <p className="text-xs text-orange-700 mt-0.5">{status.needsMoreInfoReason}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Readiness Checklist */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-base text-neutral-900">{t('compliance.readinessChecklist.title')}</h3>
              <p className="text-sm text-neutral-400 mt-1">{t('compliance.readinessChecklist.description')}</p>
            </div>
            <div className="text-sm font-medium">
              <span className="text-green-600">{readinessCompleted}</span>
              <span className="text-neutral-400"> / {readinessTotal} {t('compliance.readinessChecklist.completed')}</span>
            </div>
          </div>
          <div className="space-y-2">
            {readinessItems.map(item => (
              <div key={item.key} className="flex items-center justify-between p-3 rounded-2xl border border-neutral-100 bg-white/50">
                <div className="flex items-center gap-3">
                  {item.done ? (
                    <CircleCheck className="h-5 w-5 text-green-500 shrink-0" />
                  ) : (
                    <div className="h-5 w-5 rounded-full border-2 border-neutral-300 shrink-0" />
                  )}
                  <span className={`text-sm ${item.done ? 'text-neutral-900' : 'text-neutral-400'}`}>
                    {t(item.labelKey)}
                  </span>
                </div>
                <Badge variant={item.done ? 'default' : 'secondary'} className="text-xs px-2.5 py-0.5">
                  {item.done ? t('compliance.readinessChecklist.completed') : t('compliance.readinessChecklist.remaining')}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Compliance Checklist (Publish Readiness) */}
      {checklist && (
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-neutral-900">جاهزية النشر</h3>
                <p className="text-sm text-neutral-400 mt-1">فحص الامتثال قبل نشر المتجر</p>
              </div>
              <div className="flex items-center gap-3">
                {checklist.blockingErrorsCount > 0 && (
                  <Badge variant="destructive" className="text-xs px-2.5 py-0.5">
                    {checklist.blockingErrorsCount} أخطاء
                  </Badge>
                )}
                {checklist.warningsCount > 0 && (
                  <Badge variant="secondary" className="text-xs px-2.5 py-0.5 bg-yellow-50 text-yellow-700 border-yellow-200">
                    {checklist.warningsCount} تحذيرات
                  </Badge>
                )}
                {checklist.passed && (
                  <Badge variant="default" className="text-xs px-2.5 py-0.5 bg-green-50 text-green-700 border-green-200">
                    <CircleCheck className="h-3 w-3 mr-1" />
                    جاهز للنشر
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {checklist.items.map(item => (
                <div key={item.key} className={`flex items-center justify-between p-3 rounded-2xl border ${item.passed ? 'border-green-100 bg-green-50/30' : item.severity === 'error' ? 'border-red-100 bg-red-50/30' : 'border-yellow-100 bg-yellow-50/30'}`}>
                  <div className="flex items-center gap-3">
                    {item.passed ? (
                      <CircleCheck className="h-5 w-5 text-green-500 shrink-0" />
                    ) : item.severity === 'error' ? (
                      <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-yellow-500 shrink-0" />
                    )}
                    <div>
                      <span className={`text-sm ${item.passed ? 'text-neutral-900' : 'text-neutral-700'}`}>
                        {item.label}
                      </span>
                      {!item.passed && (
                        <p className={`text-xs mt-0.5 ${item.severity === 'error' ? 'text-red-600' : 'text-yellow-600'}`}>
                          {item.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge
                    variant={item.passed ? 'default' : 'secondary'}
                    className={`text-xs px-2.5 py-0.5 ${item.passed ? 'bg-green-50 text-green-700' : item.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'}`}
                  >
                    {item.passed ? 'مكتمل' : item.required ? 'إلزامي' : 'يُنصح'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Business Profile Form */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-base text-neutral-900">{t('compliance.businessProfile.title')}</h3>
            <p className="text-sm text-neutral-400 mt-1">{t('compliance.businessProfile.description')}</p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">{t('compliance.businessProfile.businessType')} <span className="text-red-500">*</span></Label>
              <Select value={form.businessType} onValueChange={v => updateForm('businessType', v)}>
                <SelectTrigger className={`h-9 text-sm ${errors.businessType ? 'border-red-300' : ''}`}>
                  <SelectValue placeholder={t('compliance.businessProfile.businessTypePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BUSINESS_TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-neutral-400">{t('compliance.businessProfile.businessTypeHelper')}</p>
              {errors.businessType && <p className="text-xs text-red-500">{errors.businessType}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('compliance.businessProfile.legalName')} <span className="text-red-500">*</span></Label>
                <Input
                  value={form.legalName}
                  onChange={e => updateForm('legalName', e.target.value)}
                  placeholder={t('compliance.businessProfile.legalNamePlaceholder')}
                  className={`h-9 text-sm ${errors.legalName ? 'border-red-300' : ''}`}
                />
                <p className="text-xs text-neutral-400">{t('compliance.businessProfile.legalNameHelper')}</p>
                {errors.legalName && <p className="text-xs text-red-500">{errors.legalName}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('compliance.businessProfile.commercialName')} <span className="text-neutral-400 text-xs">({t('compliance.businessProfile.optional')})</span></Label>
                <Input
                  value={form.commercialName}
                  onChange={e => updateForm('commercialName', e.target.value)}
                  placeholder={t('compliance.businessProfile.commercialNamePlaceholder')}
                  className="h-9 text-sm"
                />
                <p className="text-xs text-neutral-400">{t('compliance.businessProfile.commercialNameHelper')}</p>
              </div>
            </div>

            {isIndividualOrFreelancer && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('compliance.businessProfile.nationalId')} <span className="text-red-500">*</span></Label>
                <Input
                  value={form.nationalId}
                  onChange={e => updateForm('nationalId', e.target.value)}
                  placeholder={t('compliance.businessProfile.nationalIdPlaceholder')}
                  dir="ltr"
                  className={`text-left h-9 text-sm ${errors.nationalId ? 'border-red-300' : ''}`}
                />
                <p className="text-xs text-neutral-400">{t('compliance.businessProfile.nationalIdHelper')}</p>
                  {errors.nationalId && <p className="text-xs text-red-500">{errors.nationalId}</p>}
                </div>
                <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('compliance.businessProfile.freelanceDocNumber')}</Label>
                <Input
                  value={form.freelanceDocNumber}
                  onChange={e => updateForm('freelanceDocNumber', e.target.value)}
                  placeholder={t('compliance.businessProfile.freelanceDocNumberPlaceholder')}
                  dir="ltr"
                  className="text-left h-9 text-sm"
                />
                <p className="text-xs text-neutral-400">{t('compliance.businessProfile.freelanceDocNumberHelper')}</p>
                </div>
              </div>
            )}

            {isCompanyOrEstablishment && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('compliance.businessProfile.crNumber')} <span className="text-red-500">*</span></Label>
                <Input
                  value={form.crNumber}
                  onChange={e => updateForm('crNumber', e.target.value)}
                  placeholder={t('compliance.businessProfile.crNumberPlaceholder')}
                  dir="ltr"
                  className={`text-left h-9 text-sm ${errors.crNumber ? 'border-red-300' : ''}`}
                />
                <p className="text-xs text-neutral-400">{t('compliance.businessProfile.crNumberHelper')}</p>
                  {errors.crNumber && <p className="text-xs text-red-500">{errors.crNumber}</p>}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('compliance.businessProfile.city')} <span className="text-red-500">*</span></Label>
                <Input
                  value={form.city}
                  onChange={e => updateForm('city', e.target.value)}
                  placeholder={t('compliance.businessProfile.cityPlaceholder')}
                  className={`h-9 text-sm ${errors.city ? 'border-red-300' : ''}`}
                />
                {errors.city && <p className="text-xs text-red-500">{errors.city}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('compliance.businessProfile.address')} <span className="text-red-500">*</span></Label>
                <Input
                  value={form.address}
                  onChange={e => updateForm('address', e.target.value)}
                  placeholder={t('compliance.businessProfile.addressPlaceholder')}
                  className={`h-9 text-sm ${errors.address ? 'border-red-300' : ''}`}
                />
                {errors.address && <p className="text-xs text-red-500">{errors.address}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">{t('compliance.businessProfile.vatNumber')} <span className="text-neutral-400 text-xs">({t('compliance.businessProfile.optional')})</span></Label>
              <Input
                value={form.vatNumber}
                onChange={e => updateForm('vatNumber', e.target.value)}
                placeholder={t('compliance.businessProfile.vatNumberPlaceholder')}
                dir="ltr"
                className="text-left h-9 text-sm"
              />
              <p className="text-xs text-neutral-400">{t('compliance.businessProfile.vatNumberHelper')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-base text-neutral-900">{t('compliance.documents.title')}</h3>
            <p className="text-sm text-neutral-400 mt-1">{t('compliance.documents.description')}</p>
          </div>

          {documents.length > 0 && (
            <div className="space-y-3 mb-6">
              {documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-4 border border-neutral-100 rounded-2xl bg-white/50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-neutral-400 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">{doc.filename}</p>
                      <p className="text-xs text-neutral-400">
                        {DOCUMENT_TYPES.find(d => d.key === doc.type)?.label ?? doc.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs px-2.5 py-0.5 ${docStatusColor(doc.status)}`}>
                      {docStatusLabel(doc.status)}
                    </Badge>
                    <PermissionGate permission="compliance:documents">
                      <Button variant="ghost" size="sm" className="h-9 text-sm text-red-500 hover:text-red-700" onClick={() => handleDeleteDocument(doc.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
              ))}
            </div>
          )}

          {documents.length === 0 && (
            <p className="text-sm text-neutral-400 mb-6">{t('compliance.documents.noDocuments')}</p>
          )}

          <div className="border-t border-neutral-100 pt-4">
            <p className="text-sm font-medium text-neutral-900 mb-3">{t('compliance.documents.uploadNew')}</p>
            <div className="flex items-end gap-3">
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-neutral-500">{t('compliance.documents.documentType')}</Label>
                <Select value={uploadType} onValueChange={setUploadType}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder={t('compliance.documents.documentTypePlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map(dt => (
                      <SelectItem key={dt.key} value={dt.key}>{dt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <Label className="text-xs text-neutral-500">{t('compliance.documents.file')}</Label>
                <Input
                  type="file"
                  onChange={e => setUploadFile(e.target.files?.[0] ?? null)}
                  className="h-9 text-sm cursor-pointer"
                  accept=".pdf,.jpg,.jpeg,.png"
                />
              </div>
              <PermissionGate permission="compliance:documents">
                <Button onClick={handleUpload} disabled={uploading || !uploadType || !uploadFile} className="h-9 text-sm px-4 shrink-0">
                  {uploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Upload className="h-4 w-4 mr-1" />
                  {t('compliance.documents.upload')}
                </Button>
              </PermissionGate>
            </div>
          </div>

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200/50 rounded-2xl flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-700">{t('compliance.documents.privacyNotice')}</p>
          </div>
        </div>
      </div>

      {/* Bank Account Section */}
      <div className="bg-white/80 backdrop-blur-xl rounded-3xl border border-white/50 shadow-card overflow-hidden">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="font-bold text-base text-neutral-900">{t('compliance.bankAccount.title')}</h3>
            <p className="text-sm text-neutral-400 mt-1">{t('compliance.bankAccount.description')}</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('compliance.bankAccount.accountHolderName')} <span className="text-red-500">*</span></Label>
                <Input
                  value={bankForm.accountHolderName}
                  onChange={e => updateBankForm('accountHolderName', e.target.value)}
                  placeholder={t('compliance.bankAccount.accountHolderNamePlaceholder')}
                  className={`h-9 text-sm ${errors.accountHolderName ? 'border-red-300' : ''}`}
                />
                <p className="text-xs text-neutral-400">{t('compliance.bankAccount.accountHolderNameHelper')}</p>
                {errors.accountHolderName && <p className="text-xs text-red-500">{errors.accountHolderName}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-sm text-neutral-500">{t('compliance.bankAccount.bankName')} <span className="text-red-500">*</span></Label>
                <Input
                  value={bankForm.bankName}
                  onChange={e => updateBankForm('bankName', e.target.value)}
                  placeholder={t('compliance.bankAccount.bankNamePlaceholder')}
                  className={`h-9 text-sm ${errors.bankName ? 'border-red-300' : ''}`}
                />
                <p className="text-xs text-neutral-400">{t('compliance.bankAccount.bankNameHelper')}</p>
                {errors.bankName && <p className="text-xs text-red-500">{errors.bankName}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-sm text-neutral-500">{t('compliance.bankAccount.iban')} <span className="text-red-500">*</span></Label>
              <Input
                value={bankForm.iban}
                onChange={e => updateBankForm('iban', e.target.value)}
                placeholder={t('compliance.bankAccount.ibanPlaceholder')}
                dir="ltr"
                className={`text-left h-9 text-sm ${errors.iban ? 'border-red-300' : ''}`}
              />
              <p className="text-xs text-neutral-400">{t('compliance.bankAccount.ibanHelper')}</p>
              {errors.iban && <p className="text-xs text-red-500">{errors.iban}</p>}
            </div>
          </div>

          {bankAccount?.iban && (
            <div className="mt-4 p-3 bg-neutral-50 rounded-2xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-neutral-400 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{bankAccount.bankName}</p>
                    <p className="text-xs text-neutral-400 font-mono" dir="ltr">
                      {showFullIban ? bankAccount.iban : maskIban(bankAccount.iban)}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullIban(!showFullIban)}
                  className="text-neutral-400"
                >
                  {showFullIban ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          )}

          <div className="mt-3 p-3 bg-primary-50/50 border border-primary-200/50 rounded-2xl flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary-500 shrink-0" />
            <p className="text-xs text-primary-700">{t('compliance.bankAccount.securityNotice')}</p>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <PermissionGate permission="compliance:write">
              <Button variant="outline" className="h-9 text-sm" onClick={saveBankAccount} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {saving ? t('compliance.buttons.saving') : t('compliance.buttons.saveBankAccount')}
              </Button>
            </PermissionGate>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end gap-3 pb-6">
        <PermissionGate permission="compliance:write">
          <Button variant="outline" className="h-9 text-sm" onClick={saveProfile} disabled={saving || submitting}>
            {(saving || submitting) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {saving ? t('compliance.buttons.saving') : t('compliance.buttons.saveDraft')}
          </Button>
        </PermissionGate>
        <PermissionGate permission="compliance:submit">
          <Button
            onClick={submitForReview}
            disabled={saving || submitting || !canSubmit}
            className="h-9 text-sm px-4 bg-green-600 hover:bg-green-700 text-white"
          >
            {(saving || submitting) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting ? t('compliance.buttons.submitting') : t('compliance.buttons.submitForReview')}
          </Button>
        </PermissionGate>
      </div>
    </div>
  );
}

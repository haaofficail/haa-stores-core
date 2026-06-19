import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

export function UnauthorizedState() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <ShieldAlert className="h-16 w-16 text-neutral-300 mb-4" />
      <h2 className="text-xl font-semibold text-neutral-700 mb-2">
        {t('unauthorized.title', 'ليس لديك صلاحية للوصول إلى هذه الصفحة')}
      </h2>
      <p className="text-sm text-neutral-500 mb-6 max-w-md">
        {t('unauthorized.description', 'إذا كنت تعتقد أن هذه مشكلة، يرجى التواصل مع مدير المتجر.')}
      </p>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
      >
        {t('unauthorized.backToDashboard', 'العودة للوحة التحكم')}
      </Link>
    </div>
  );
}

import { Icon } from './icon';

interface UnauthorizedStateProps {
  permission?: string;
}

export function UnauthorizedState({ permission }: UnauthorizedStateProps) {
  return (
    <div className="flex min-h-[360px] flex-col items-center justify-center rounded-xl border border-amber-100 bg-white px-6 py-16 text-center shadow-sm">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
        <Icon name="AlertTriangle" size="md" className="text-amber-500" />
      </div>
      <h2 className="text-title3 font-bold text-gray-900">لا تملك صلاحية الوصول</h2>
      <p className="mt-2 max-w-md text-footnote text-gray-500">
        هذه الصفحة محمية بصلاحيات تشغيلية. اطلب من مالك المنصة أو مسؤول الصلاحيات منحك الوصول المناسب.
      </p>
      {permission && (
        <p className="mt-4 rounded-full bg-gray-50 px-3 py-1 font-mono text-xs text-gray-500" dir="ltr">
          {permission}
        </p>
      )}
    </div>
  );
}

import { Icon } from './icon';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({ message = 'تعذّر تحميل البيانات', onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="h-12 w-12 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <Icon name="AlertCircle" size="md" className="text-red-400" />
      </div>
      <p className="text-callout font-medium text-gray-700 mb-1">تعذّر تحميل البيانات</p>
      <p className="text-footnote text-gray-400 mb-5">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 text-footnote font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}

import { useTranslation } from 'react-i18next';
import { Icon } from './icon';

interface TablePagerProps {
  page: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  filteredCount: number;
  onPageChange: (updater: number | ((prev: number) => number)) => void;
  /** Localized noun for the counted items, e.g. "تاجر". */
  itemLabel?: string;
}

/**
 * Prev/next pager matching the merchant dashboard reference (RTL-aware:
 * ChevronRight = previous, ChevronLeft = next; ≥44px hit areas, WCAG 2.5.5).
 * Renders nothing when everything fits on a single page.
 */
export function TablePager({
  page,
  totalPages,
  startIndex,
  endIndex,
  filteredCount,
  onPageChange,
  itemLabel,
}: TablePagerProps) {
  const { t } = useTranslation();
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4 pb-4 px-4 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        {t('pager.showing', 'عرض')} {startIndex}–{endIndex} {t('pager.of', 'من')} {filteredCount}{' '}
        {itemLabel ?? t('pager.items', 'عنصر')}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(p => Math.max(1, p - 1))}
          disabled={page <= 1}
          aria-label={t('pager.prev', 'الصفحة السابقة')}
          className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
        >
          <Icon name="ChevronRight" size="xs" />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(p => Math.min(totalPages, p + 1))}
          disabled={page >= totalPages}
          aria-label={t('pager.next', 'الصفحة التالية')}
          className="h-11 w-11 inline-flex items-center justify-center rounded-xl hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-500"
        >
          <Icon name="ChevronLeft" size="xs" />
        </button>
      </div>
    </div>
  );
}

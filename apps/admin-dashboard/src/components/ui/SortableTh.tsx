import { Icon } from './icon';
import type { SortState } from '../../lib/useTableControls';

interface SortableThProps {
  /** Column key matching the value used by the table-controls hook. */
  sortKey: string;
  label: string;
  sort: SortState;
  onToggle: (key: string) => void;
  className?: string;
}

/**
 * A sortable `<th>` that mirrors the existing admin table header styling
 * (`bg-gray-50`, `text-start`, `text-gray-500`) and adds a click target with
 * an `aria-sort` state and a directional chevron.
 */
export function SortableTh({ sortKey, label, sort, onToggle, className = '' }: SortableThProps) {
  const active = sort.key === sortKey;
  const ariaSort: 'ascending' | 'descending' | 'none' = active
    ? sort.dir === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';
  const iconName = active ? (sort.dir === 'asc' ? 'ChevronUp' : 'ChevronDown') : 'ChevronsUpDown';

  return (
    <th aria-sort={ariaSort} className={`px-4 py-3 text-start font-medium text-gray-500 ${className}`}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className="inline-flex items-center gap-1 select-none hover:text-gray-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 rounded"
      >
        <span>{label}</span>
        <Icon
          name={iconName}
          size="2xs"
          className={active ? 'text-primary-600' : 'text-gray-400'}
        />
      </button>
    </th>
  );
}

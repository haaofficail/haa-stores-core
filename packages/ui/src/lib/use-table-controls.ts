import { useCallback, useEffect, useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: string | null;
  dir: SortDir;
}

interface PersistedState {
  query: string;
  sort: SortState;
  pageSize: number;
}

export interface UseTableControlsOptions<T> {
  /** Raw rows from the API (already loaded; this hook does client-side filter/sort/paginate). */
  rows: T[];
  /** Plain fields used by the built-in case-insensitive contains filter. Ignored if `filterFn` is given. */
  searchFields?: string[];
  /** Custom filter predicate; overrides `searchFields`. */
  filterFn?: (row: T, query: string) => boolean;
  /** Initial sort applied before the user clicks any header. */
  initialSort?: SortState;
  /** Page size (rows per page). Default 20. */
  pageSize?: number;
  /** When set, query + sort + pageSize survive reloads under the app-specific storage prefix. */
  storageKey?: string;
  /** Custom accessor for sortable cell values (e.g. nested or computed fields). */
  getValue?: (row: T, key: string) => unknown;
}

export interface TableControls<T> {
  query: string;
  setQuery: (query: string) => void;
  sort: SortState;
  toggleSort: (key: string) => void;
  page: number;
  setPage: (updater: number | ((prev: number) => number)) => void;
  pageSize: number;
  /** Rows for the current page after filter + sort + paginate. */
  rows: T[];
  /** Count after filtering (before pagination). */
  filteredCount: number;
  totalPages: number;
  /** 1-based index of the first visible row (0 when empty). */
  startIndex: number;
  /** 1-based index of the last visible row. */
  endIndex: number;
}

function browserStorage(): Storage | null {
  return typeof globalThis.window === 'undefined' ? null : globalThis.window.localStorage;
}

function readPersisted(storagePrefix: string, storageKey: string | undefined): Partial<PersistedState> | null {
  const storage = browserStorage();
  if (!storageKey || !storage) return null;
  try {
    const raw = storage.getItem(storagePrefix + storageKey);
    return raw ? (JSON.parse(raw) as Partial<PersistedState>) : null;
  } catch {
    return null;
  }
}

function defaultGetValue<T>(row: T, key: string): unknown {
  if (typeof row !== 'object' || row === null) return undefined;
  return (row as Record<string, unknown>)[key];
}

function isNil(value: unknown): boolean {
  return value === null || value === undefined || value === '';
}

function coerceNumeric(value: unknown): number {
  return typeof value === 'string' ? Number(value) : Number.NaN;
}

/** Locale-aware comparator for two non-nullish values. Nullish handling lives
 * in the sort callback so it stays direction-independent. */
function compareValues(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;

  const aNum = coerceNumeric(a);
  const bNum = coerceNumeric(b);
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

  const aTime = Date.parse(String(a));
  const bTime = Date.parse(String(b));
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime;

  return String(a).localeCompare(String(b), 'ar');
}

function searchValue<T>(row: T, field: string): string {
  if (typeof row !== 'object' || row === null) return '';
  return String((row as Record<string, unknown>)[field] ?? '').toLowerCase();
}

export function createUseTableControls(storagePrefix: string) {
  return function useTableControls<T>(options: UseTableControlsOptions<T>): TableControls<T> {
    const {
      rows,
      searchFields,
      filterFn,
      initialSort = { key: null, dir: 'asc' },
      pageSize: pageSizeOption = 20,
      storageKey,
      getValue = defaultGetValue,
    } = options;

    const persisted = useMemo(() => readPersisted(storagePrefix, storageKey), [storageKey]);

    const [query, setRawQuery] = useState<string>(persisted?.query ?? '');
    const [sort, setSort] = useState<SortState>(persisted?.sort ?? initialSort);
    const [page, setPage] = useState(1);
    const pageSize = persisted?.pageSize ?? pageSizeOption;

    useEffect(() => {
      const storage = browserStorage();
      if (!storageKey || !storage) return;
      try {
        const payload: PersistedState = { query, sort, pageSize };
        storage.setItem(storagePrefix + storageKey, JSON.stringify(payload));
      } catch {
        /* storage full or unavailable: table controls should still work */
      }
    }, [storageKey, query, sort, pageSize]);

    const setQuery = useCallback((nextQuery: string) => {
      setRawQuery(nextQuery);
      setPage(1);
    }, []);

    const toggleSort = useCallback((key: string) => {
      setSort(prev => {
        if (prev.key !== key) return { key, dir: 'asc' };
        if (prev.dir === 'asc') return { key, dir: 'desc' };
        return { key: null, dir: 'asc' };
      });
      setPage(1);
    }, []);

    const filtered = useMemo(() => {
      const normalizedQuery = query.trim().toLowerCase();
      if (!normalizedQuery) return rows;
      if (filterFn) return rows.filter(row => filterFn(row, query));
      if (!searchFields?.length) return rows;
      return rows.filter(row => searchFields.some(field => searchValue(row, field).includes(normalizedQuery)));
    }, [rows, query, filterFn, searchFields]);

    const sorted = useMemo(() => {
      if (!sort.key) return filtered;
      const key = sort.key;
      const dir = sort.dir === 'asc' ? 1 : -1;
      return [...filtered].sort((a, b) => {
        const av = getValue(a, key);
        const bv = getValue(b, key);
        const aNil = isNil(av);
        const bNil = isNil(bv);
        if (aNil && bNil) return 0;
        if (aNil) return 1;
        if (bNil) return -1;
        return compareValues(av, bv) * dir;
      });
    }, [filtered, sort, getValue]);

    const filteredCount = sorted.length;
    const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
    const safePage = Math.min(page, totalPages);

    useEffect(() => {
      if (page > totalPages) setPage(totalPages);
    }, [page, totalPages]);

    const pageRows = useMemo(() => {
      const start = (safePage - 1) * pageSize;
      return sorted.slice(start, start + pageSize);
    }, [sorted, safePage, pageSize]);

    const startIndex = filteredCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
    const endIndex = Math.min(safePage * pageSize, filteredCount);

    return {
      query,
      setQuery,
      sort,
      toggleSort,
      page: safePage,
      setPage,
      pageSize,
      rows: pageRows,
      filteredCount,
      totalPages,
      startIndex,
      endIndex,
    };
  };
}

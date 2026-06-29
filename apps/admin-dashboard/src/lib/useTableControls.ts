/* eslint-disable @typescript-eslint/no-explicit-any -- admin list rows carry legacy `any` typing on API responses; the table-controls hook is intentionally generic over them (P2-030 follow-up). */
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

interface UseTableControlsOptions<T> {
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
  /** When set, query + sort + pageSize survive reloads under `haa-admin-table:<storageKey>`. */
  storageKey?: string;
  /** Custom accessor for sortable cell values (e.g. nested or computed fields). */
  getValue?: (row: T, key: string) => unknown;
}

const STORAGE_PREFIX = 'haa-admin-table:';

function readPersisted(storageKey: string | undefined): Partial<PersistedState> | null {
  if (!storageKey || typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + storageKey);
    return raw ? (JSON.parse(raw) as Partial<PersistedState>) : null;
  } catch {
    return null;
  }
}

function defaultGetValue(row: any, key: string): unknown {
  return row?.[key];
}

/** Stable, locale-aware comparator. Nullish values always sort last. */
function compareValues(a: unknown, b: unknown): number {
  const aNil = a === null || a === undefined || a === '';
  const bNil = b === null || b === undefined || b === '';
  if (aNil && bNil) return 0;
  if (aNil) return 1;
  if (bNil) return -1;

  if (typeof a === 'number' && typeof b === 'number') return a - b;

  const aNum = typeof a === 'string' ? Number(a) : NaN;
  const bNum = typeof b === 'string' ? Number(b) : NaN;
  if (!Number.isNaN(aNum) && !Number.isNaN(bNum)) return aNum - bNum;

  const aTime = Date.parse(String(a));
  const bTime = Date.parse(String(b));
  if (!Number.isNaN(aTime) && !Number.isNaN(bTime)) return aTime - bTime;

  return String(a).localeCompare(String(b), 'ar');
}

export interface TableControls<T> {
  query: string;
  setQuery: (q: string) => void;
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

/**
 * Client-side table controls: search filtering, column sorting, and pagination
 * with optional localStorage persistence. Admin list endpoints return full
 * arrays, so all processing happens in the browser.
 */
export function useTableControls<T>(options: UseTableControlsOptions<T>): TableControls<T> {
  const {
    rows,
    searchFields,
    filterFn,
    initialSort = { key: null, dir: 'asc' },
    pageSize: pageSizeOption = 20,
    storageKey,
    getValue = defaultGetValue,
  } = options;

  const persisted = useMemo(() => readPersisted(storageKey), [storageKey]);

  const [query, setQueryState] = useState<string>(persisted?.query ?? '');
  const [sort, setSort] = useState<SortState>(persisted?.sort ?? initialSort);
  const pageSize = persisted?.pageSize ?? pageSizeOption;
  const [page, setPageState] = useState(1);

  // Persist user controls.
  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    try {
      const payload: PersistedState = { query, sort, pageSize };
      window.localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(payload));
    } catch {
      /* storage full or unavailable — non-fatal */
    }
  }, [storageKey, query, sort, pageSize]);

  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    setPageState(1);
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSort(prev => {
      if (prev.key !== key) return { key, dir: 'asc' };
      if (prev.dir === 'asc') return { key, dir: 'desc' };
      return { key: null, dir: 'asc' };
    });
    setPageState(1);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    if (filterFn) return rows.filter(row => filterFn(row, query));
    if (searchFields && searchFields.length > 0) {
      return rows.filter(row =>
        searchFields.some(field => String((row as any)?.[field] ?? '').toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [rows, query, filterFn, searchFields]);

  const sorted = useMemo(() => {
    if (!sort.key) return filtered;
    const key = sort.key;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => compareValues(getValue(a, key), getValue(b, key)) * dir);
  }, [filtered, sort, getValue]);

  const filteredCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(filteredCount / pageSize));
  const safePage = Math.min(page, totalPages);

  // Keep page in range if the dataset shrinks (e.g. after delete).
  useEffect(() => {
    if (page > totalPages) setPageState(totalPages);
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
    setPage: setPageState,
    pageSize,
    rows: pageRows,
    filteredCount,
    totalPages,
    startIndex,
    endIndex,
  };
}

// Pagination limit enforcement — prevents DoS via arbitrary page sizes.
//
// All paginated endpoints use these constants to cap the maximum
// number of results returned in a single request. This prevents memory
// exhaustion from unbounded queries.

export const PAGINATION_LIMITS = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100, // Never exceed 100 rows per request
  MAX_AUDIT_LIMIT: 200, // Audit logs allow slightly higher limit for operational queries
} as const;

/**
 * Parse and validate pagination parameters from request.
 *
 * - Defaults: page=1, limit=20
 * - Max: limit is capped at maxLimit parameter (default 100)
 * - Returns: { page: number, limit: number, offset: number }
 */
export function parsePagination(pageStr?: string, limitStr?: string, maxLimit?: number) {
  const actualMaxLimit = maxLimit ?? PAGINATION_LIMITS.MAX_LIMIT;
  const page = Math.max(1, Number(pageStr) || PAGINATION_LIMITS.DEFAULT_PAGE);
  const limit = Math.min(
    actualMaxLimit,
    Math.max(1, Number(limitStr) || PAGINATION_LIMITS.DEFAULT_LIMIT),
  );
  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

/**
 * Build pagination response envelope.
 *
 * Standard response format for all paginated endpoints:
 * { data: T[], page, limit, total, totalPages }
 */
export function paginationEnvelope<T>(data: T[], page: number, limit: number, total: number) {
  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

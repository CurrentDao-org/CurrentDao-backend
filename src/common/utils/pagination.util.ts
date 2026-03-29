/**
 * Pagination Utility
 *
 * Provides pagination helpers for API responses.
 */

import {
  PaginationMeta,
  PaginationLinks,
  PaginationQuery,
} from '../interfaces/response.interface';

/**
 * Default pagination settings
 */
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 100;

/**
 * Generate pagination metadata
 *
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination metadata
 */
export const getPaginationMeta = (
  page: number,
  limit: number,
  total: number,
): PaginationMeta => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
};

/**
 * Generate pagination links
 *
 * @param baseUrl - Base URL for the endpoint
 * @param page - Current page number
 * @param limit - Items per page
 * @param total - Total number of items
 * @returns Pagination links
 */
export const getPaginationLinks = (
  baseUrl: string,
  page: number,
  limit: number,
  total: number,
): PaginationLinks => {
  const totalPages = Math.ceil(total / limit);

  // Build query string
  const buildUrl = (p: number): string => {
    const url = new URL(baseUrl);
    url.searchParams.set('page', String(p));
    url.searchParams.set('limit', String(limit));
    return url.toString();
  };

  return {
    first: page > 1 ? buildUrl(1) : null,
    prev: page > 1 ? buildUrl(page - 1) : null,
    next: page < totalPages ? buildUrl(page + 1) : null,
    last: page < totalPages ? buildUrl(totalPages) : null,
    self: buildUrl(page),
  };
};

/**
 * Parse pagination query parameters
 *
 * @param query - Pagination query parameters
 * @returns Normalized pagination parameters
 */
export const parsePaginationQuery = (
  query: Partial<PaginationQuery>,
): {
  page: number;
  limit: number;
} => {
  const page = Math.max(1, parseInt(String(query.page || DEFAULT_PAGE), 10));
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, parseInt(String(query.limit || DEFAULT_LIMIT), 10)),
  );

  return { page, limit };
};

/**
 * Calculate pagination skip value for database queries
 *
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Skip value for database query
 */
export const getSkipValue = (page: number, limit: number): number => {
  return (page - 1) * limit;
};

/**
 * Paginate array of items
 *
 * @param items - Array of items to paginate
 * @param page - Current page number
 * @param limit - Items per page
 * @returns Paginated result with metadata
 */
export const paginateArray = <T>(
  items: T[],
  page: number,
  limit: number,
): {
  data: T[];
  pagination: PaginationMeta;
} => {
  const total = items.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  const data = items.slice(startIndex, endIndex);
  const pagination = getPaginationMeta(page, limit, total);

  return { data, pagination };
};

/**
 * Get pagination query string
 *
 * @param page - Page number
 * @param limit - Items per page
 * @returns Query string
 */
export const getPaginationQueryString = (
  page: number,
  limit: number,
): string => {
  return `page=${page}&limit=${limit}`;
};

/**
 * Calculate offset and limit for cursor-based pagination
 *
 * @param cursor - Cursor string (usually base64 encoded)
 * @param limit - Items per page
 * @returns Offset value
 */
export const getCursorOffset = (
  cursor: string | undefined,
  limit: number,
): number => {
  if (!cursor) {
    return 0;
  }

  try {
    const decoded = atob(cursor);
    const parsed = JSON.parse(decoded);
    return parsed.offset || 0;
  } catch {
    return 0;
  }
};

/**
 * Generate cursor for next page
 *
 * @param offset - Current offset
 * @param limit - Items per page
 * @returns Base64 encoded cursor
 */
export const generateCursor = (offset: number, limit: number): string => {
  const cursor = JSON.stringify({ offset: offset + limit, limit });
  return btoa(cursor);
};

/**
 * Sort array of objects
 *
 * @param items - Array of items to sort
 * @param sortField - Field to sort by
 * @param order - Sort order (ASC or DESC)
 * @returns Sorted array
 */
export const sortItems = <T>(
  items: T[],
  sortField: keyof T,
  order: 'ASC' | 'DESC' = 'ASC',
): T[] => {
  return [...items].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];

    if (aVal === bVal) return 0;

    const comparison = aVal < bVal ? -1 : 1;
    return order === 'ASC' ? comparison : -comparison;
  });
};

/**
 * Filter items based on search query
 *
 * @param items - Array of items to filter
 * @param search - Search query
 * @param fields - Fields to search in
 * @returns Filtered array
 */
export const filterItems = <T>(
  items: T[],
  search: string,
  fields: (keyof T)[],
): T[] => {
  if (!search) return items;

  const lowerSearch = search.toLowerCase();
  return items.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(lowerSearch);
      }
      return false;
    }),
  );
};

/**
 * API Response Standardization Interfaces
 * 
 * Provides consistent response structures for all API endpoints.
 * Supports success responses, error responses, pagination, and metadata.
 */

/**
 * Metadata structure for API responses
 */
export interface ApiMeta {
  /** Timestamp of the response */
  timestamp: string;
  /** API version */
  version: string;
  /** Request ID for tracing */
  requestId?: string;
  /** Custom metadata key-value pairs */
  [key: string]: unknown;
}

/**
 * Pagination links structure
 */
export interface PaginationLinks {
  /** URL to the first page */
  first: string | null;
  /** URL to the last page */
  last: string | null;
  /** URL to the previous page */
  prev: string | null;
  /** URL to the next page */
  next: string | null;
  /** Current page URL */
  self: string;
}

/**
 * Pagination metadata structure
 */
export interface PaginationMeta {
  /** Current page number (1-indexed) */
  page: number;
  /** Number of items per page */
  limit: number;
  /** Total number of items */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
  /** Whether there is a previous page */
  hasPrev: boolean;
}

/**
 * Standard success response structure
 * Follows {data, meta, links} format
 */
export interface ApiResponse<T = unknown> {
  /** Response data */
  data: T;
  /** Response metadata */
  meta: ApiMeta;
  /** Pagination links (only for paginated responses) */
  links?: PaginationLinks;
}

/**
 * Paginated response structure
 */
export interface PaginatedApiResponse<T = unknown> {
  /** Array of data items */
  data: T[];
  /** Pagination metadata */
  meta: ApiMeta;
  /** Pagination links */
  links: PaginationLinks;
  /** Pagination details */
  pagination: PaginationMeta;
}

/**
 * Error details structure
 */
export interface ErrorDetails {
  /** Field that caused the error */
  field?: string;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
}

/**
 * Standard error response structure
 * Follows {error, code, details} format
 */
export interface ApiErrorResponse {
  /** Error message */
  error: string;
  /** Error code for client handling */
  code: string;
  /** Detailed error information */
  details?: ErrorDetails[];
  /** Additional context */
  context?: Record<string, unknown>;
  /** Metadata */
  meta: ApiMeta;
}

/**
 * Response wrapper options
 */
export interface ResponseWrapperOptions {
  /** API version */
  version?: string;
  /** Request ID */
  requestId?: string;
  /** Whether to include timestamp */
  includeTimestamp?: boolean;
}

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  /** Page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Sort field */
  sort?: string;
  /** Sort order */
  order?: 'ASC' | 'DESC';
}

/**
 * Filter options for sensitive data
 */
export interface FilterOptions {
  /** Fields to exclude from response */
  exclude?: string[];
  /** Fields to include (overrides exclude) */
  include?: string[];
  /** Custom transform function */
  transform?: (key: string, value: unknown) => unknown;
}

/**
 * Type for filtered response
 */
export interface FilteredResponse<T> {
  data: T;
  filtered: boolean;
}

/**
 * API Version decorator metadata
 */
export interface ApiVersionMetadata {
  /** API version */
  version: string;
  /** Deprecation notice */
  deprecated?: boolean;
  /** Deprecation message */
  deprecationMessage?: string;
}

/**
 * Default API version
 */
export const DEFAULT_API_VERSION = '1.0';

/**
 * Response codes enumeration
 */
export enum ApiResponseCode {
  SUCCESS = 'SUCCESS',
  CREATED = 'CREATED',
  UPDATED = 'UPDATED',
  DELETED = 'DELETED',
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMITED = 'RATE_LIMITED',
}

/**
 * HTTP status codes mapping
 */
export const ResponseCodeToStatus: Record<ApiResponseCode, number> = {
  [ApiResponseCode.SUCCESS]: 200,
  [ApiResponseCode.CREATED]: 201,
  [ApiResponseCode.UPDATED]: 204,
  [ApiResponseCode.DELETED]: 204,
  [ApiResponseCode.BAD_REQUEST]: 400,
  [ApiResponseCode.UNAUTHORIZED]: 401,
  [ApiResponseCode.FORBIDDEN]: 403,
  [ApiResponseCode.NOT_FOUND]: 404,
  [ApiResponseCode.CONFLICT]: 409,
  [ApiResponseCode.INTERNAL_ERROR]: 500,
  [ApiResponseCode.VALIDATION_ERROR]: 422,
  [ApiResponseCode.RATE_LIMITED]: 429,
};

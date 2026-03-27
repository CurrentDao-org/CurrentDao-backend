export interface ApiMeta {
    timestamp: string;
    version: string;
    requestId?: string;
    [key: string]: unknown;
}
export interface PaginationLinks {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
    self: string;
}
export interface PaginationMeta {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
}
export interface ApiResponse<T = unknown> {
    data: T;
    meta: ApiMeta;
    links?: PaginationLinks;
}
export interface PaginatedApiResponse<T = unknown> {
    data: T[];
    meta: ApiMeta;
    links: PaginationLinks;
    pagination: PaginationMeta;
}
export interface ErrorDetails {
    field?: string;
    message: string;
    code?: string;
}
export interface ApiErrorResponse {
    error: string;
    code: string;
    details?: ErrorDetails[];
    context?: Record<string, unknown>;
    meta: ApiMeta;
}
export interface ResponseWrapperOptions {
    version?: string;
    requestId?: string;
    includeTimestamp?: boolean;
}
export interface PaginationQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'ASC' | 'DESC';
}
export interface FilterOptions {
    exclude?: string[];
    include?: string[];
    transform?: (key: string, value: unknown) => unknown;
}
export interface FilteredResponse<T> {
    data: T;
    filtered: boolean;
}
export interface ApiVersionMetadata {
    version: string;
    deprecated?: boolean;
    deprecationMessage?: string;
}
export declare const DEFAULT_API_VERSION = "1.0";
export declare enum ApiResponseCode {
    SUCCESS = "SUCCESS",
    CREATED = "CREATED",
    UPDATED = "UPDATED",
    DELETED = "DELETED",
    BAD_REQUEST = "BAD_REQUEST",
    UNAUTHORIZED = "UNAUTHORIZED",
    FORBIDDEN = "FORBIDDEN",
    NOT_FOUND = "NOT_FOUND",
    CONFLICT = "CONFLICT",
    INTERNAL_ERROR = "INTERNAL_ERROR",
    VALIDATION_ERROR = "VALIDATION_ERROR",
    RATE_LIMITED = "RATE_LIMITED"
}
export declare const ResponseCodeToStatus: Record<ApiResponseCode, number>;

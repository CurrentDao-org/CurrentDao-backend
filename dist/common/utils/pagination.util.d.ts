import { PaginationMeta, PaginationLinks, PaginationQuery } from '../interfaces/response.interface';
export declare const DEFAULT_PAGE = 1;
export declare const DEFAULT_LIMIT = 10;
export declare const MAX_LIMIT = 100;
export declare const getPaginationMeta: (page: number, limit: number, total: number) => PaginationMeta;
export declare const getPaginationLinks: (baseUrl: string, page: number, limit: number, total: number) => PaginationLinks;
export declare const parsePaginationQuery: (query: Partial<PaginationQuery>) => {
    page: number;
    limit: number;
};
export declare const getSkipValue: (page: number, limit: number) => number;
export declare const paginateArray: <T>(items: T[], page: number, limit: number) => {
    data: T[];
    pagination: PaginationMeta;
};
export declare const getPaginationQueryString: (page: number, limit: number) => string;
export declare const getCursorOffset: (cursor: string | undefined, limit: number) => number;
export declare const generateCursor: (offset: number, limit: number) => string;
export declare const sortItems: <T>(items: T[], sortField: keyof T, order?: "ASC" | "DESC") => T[];
export declare const filterItems: <T>(items: T[], search: string, fields: (keyof T)[]) => T[];

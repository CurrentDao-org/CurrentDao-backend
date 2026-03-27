"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filterItems = exports.sortItems = exports.generateCursor = exports.getCursorOffset = exports.getPaginationQueryString = exports.paginateArray = exports.getSkipValue = exports.parsePaginationQuery = exports.getPaginationLinks = exports.getPaginationMeta = exports.MAX_LIMIT = exports.DEFAULT_LIMIT = exports.DEFAULT_PAGE = void 0;
exports.DEFAULT_PAGE = 1;
exports.DEFAULT_LIMIT = 10;
exports.MAX_LIMIT = 100;
const getPaginationMeta = (page, limit, total) => {
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
exports.getPaginationMeta = getPaginationMeta;
const getPaginationLinks = (baseUrl, page, limit, total) => {
    const totalPages = Math.ceil(total / limit);
    const buildUrl = (p) => {
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
exports.getPaginationLinks = getPaginationLinks;
const parsePaginationQuery = (query) => {
    const page = Math.max(1, parseInt(String(query.page || exports.DEFAULT_PAGE), 10));
    const limit = Math.min(exports.MAX_LIMIT, Math.max(1, parseInt(String(query.limit || exports.DEFAULT_LIMIT), 10)));
    return { page, limit };
};
exports.parsePaginationQuery = parsePaginationQuery;
const getSkipValue = (page, limit) => {
    return (page - 1) * limit;
};
exports.getSkipValue = getSkipValue;
const paginateArray = (items, page, limit) => {
    const total = items.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = items.slice(startIndex, endIndex);
    const pagination = (0, exports.getPaginationMeta)(page, limit, total);
    return { data, pagination };
};
exports.paginateArray = paginateArray;
const getPaginationQueryString = (page, limit) => {
    return `page=${page}&limit=${limit}`;
};
exports.getPaginationQueryString = getPaginationQueryString;
const getCursorOffset = (cursor, limit) => {
    if (!cursor) {
        return 0;
    }
    try {
        const decoded = atob(cursor);
        const parsed = JSON.parse(decoded);
        return parsed.offset || 0;
    }
    catch {
        return 0;
    }
};
exports.getCursorOffset = getCursorOffset;
const generateCursor = (offset, limit) => {
    const cursor = JSON.stringify({ offset: offset + limit, limit });
    return btoa(cursor);
};
exports.generateCursor = generateCursor;
const sortItems = (items, sortField, order = 'ASC') => {
    return [...items].sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        if (aVal === bVal)
            return 0;
        const comparison = aVal < bVal ? -1 : 1;
        return order === 'ASC' ? comparison : -comparison;
    });
};
exports.sortItems = sortItems;
const filterItems = (items, search, fields) => {
    if (!search)
        return items;
    const lowerSearch = search.toLowerCase();
    return items.filter(item => fields.some(field => {
        const value = item[field];
        if (typeof value === 'string') {
            return value.toLowerCase().includes(lowerSearch);
        }
        return false;
    }));
};
exports.filterItems = filterItems;
//# sourceMappingURL=pagination.util.js.map
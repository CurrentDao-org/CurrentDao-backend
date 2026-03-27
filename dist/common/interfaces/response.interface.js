"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponseCodeToStatus = exports.ApiResponseCode = exports.DEFAULT_API_VERSION = void 0;
exports.DEFAULT_API_VERSION = '1.0';
var ApiResponseCode;
(function (ApiResponseCode) {
    ApiResponseCode["SUCCESS"] = "SUCCESS";
    ApiResponseCode["CREATED"] = "CREATED";
    ApiResponseCode["UPDATED"] = "UPDATED";
    ApiResponseCode["DELETED"] = "DELETED";
    ApiResponseCode["BAD_REQUEST"] = "BAD_REQUEST";
    ApiResponseCode["UNAUTHORIZED"] = "UNAUTHORIZED";
    ApiResponseCode["FORBIDDEN"] = "FORBIDDEN";
    ApiResponseCode["NOT_FOUND"] = "NOT_FOUND";
    ApiResponseCode["CONFLICT"] = "CONFLICT";
    ApiResponseCode["INTERNAL_ERROR"] = "INTERNAL_ERROR";
    ApiResponseCode["VALIDATION_ERROR"] = "VALIDATION_ERROR";
    ApiResponseCode["RATE_LIMITED"] = "RATE_LIMITED";
})(ApiResponseCode || (exports.ApiResponseCode = ApiResponseCode = {}));
exports.ResponseCodeToStatus = {
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
//# sourceMappingURL=response.interface.js.map
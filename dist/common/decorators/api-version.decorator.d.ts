export declare const API_VERSION_KEY = "api_version";
export interface ApiVersionOptions {
    version: string;
    deprecated?: boolean;
    deprecationMessage?: string;
}
export declare const ApiVersion: (options: ApiVersionOptions) => any;
export declare const Deprecated: (options?: {
    deprecationMessage?: string;
}) => any;
export declare const getApiVersion: (target: any) => string;
export declare const isDeprecated: (target: any) => boolean;
export declare const getDeprecationMessage: (target: any) => string | undefined;

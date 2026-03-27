export declare function setupSwagger(app: any): any;
export declare const swaggerConfig: {
    title: string;
    description: string;
    version: string;
    termsOfService: string;
    contact: {
        name: string;
        url: string;
        email: string;
    };
    license: {
        name: string;
        url: string;
    };
    servers: {
        url: string;
        description: string;
    }[];
    components: {
        securitySchemes: {
            bearerAuth: {
                type: string;
                scheme: string;
                bearerFormat: string;
            };
            apiKeyAuth: {
                type: string;
                in: string;
                name: string;
            };
        };
        schemas: {
            ErrorResponse: {
                type: string;
                properties: {
                    statusCode: {
                        type: string;
                        example: number;
                    };
                    message: {
                        type: string;
                        example: string;
                    };
                    error: {
                        type: string;
                        example: string;
                    };
                    details: {
                        type: string;
                        items: {
                            type: string;
                            properties: {
                                field: {
                                    type: string;
                                    example: string;
                                };
                                message: {
                                    type: string;
                                    example: string;
                                };
                            };
                        };
                    };
                    timestamp: {
                        type: string;
                        format: string;
                        example: string;
                    };
                    path: {
                        type: string;
                        example: string;
                    };
                };
            };
            PaginatedResponse: {
                type: string;
                properties: {
                    data: {
                        type: string;
                        items: {
                            type: string;
                        };
                    };
                    total: {
                        type: string;
                        example: number;
                    };
                    page: {
                        type: string;
                        example: number;
                    };
                    limit: {
                        type: string;
                        example: number;
                    };
                    totalPages: {
                        type: string;
                        example: number;
                    };
                    hasNext: {
                        type: string;
                        example: boolean;
                    };
                    hasPrev: {
                        type: string;
                        example: boolean;
                    };
                };
            };
        };
    };
    tags: {
        name: string;
        description: string;
    }[];
    paths: {
        '/api/energy/listings': {
            get: {
                tags: string[];
                summary: string;
                description: string;
                operationId: string;
                parameters: ({
                    name: string;
                    in: string;
                    description: string;
                    schema: {
                        type: string;
                        enum: string[];
                        minimum?: undefined;
                        default?: undefined;
                        maximum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    description: string;
                    schema: {
                        type: string;
                        minimum: number;
                        default: number;
                        enum?: undefined;
                        maximum?: undefined;
                    };
                } | {
                    name: string;
                    in: string;
                    description: string;
                    schema: {
                        type: string;
                        minimum: number;
                        maximum: number;
                        default: number;
                        enum?: undefined;
                    };
                })[];
                responses: {
                    200: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
                security: ({
                    bearerAuth: any[];
                    apiKeyAuth?: undefined;
                } | {
                    apiKeyAuth: any[];
                    bearerAuth?: undefined;
                })[];
            };
            post: {
                tags: string[];
                summary: string;
                description: string;
                operationId: string;
                requestBody: {
                    required: boolean;
                    content: {
                        'application/json': {
                            schema: {
                                $ref: string;
                            };
                        };
                    };
                };
                responses: {
                    201: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    400: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                    401: {
                        description: string;
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: string;
                                };
                            };
                        };
                    };
                };
                security: ({
                    bearerAuth: any[];
                    apiKeyAuth?: undefined;
                } | {
                    apiKeyAuth: any[];
                    bearerAuth?: undefined;
                })[];
            };
        };
    };
};

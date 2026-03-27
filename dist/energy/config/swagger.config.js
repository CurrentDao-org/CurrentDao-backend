"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerConfig = void 0;
exports.setupSwagger = setupSwagger;
const swagger_1 = require("@nestjs/swagger");
function setupSwagger(app) {
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Energy Trading API')
        .setDescription('Comprehensive RESTful API for energy trading operations including listings, bids, and trade management')
        .setVersion('1.0.0')
        .addTag('energy', 'Energy trading operations')
        .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
    }, 'JWT-auth')
        .addApiKey({
        type: 'apiKey',
        name: 'X-API-KEY',
        in: 'header',
        description: 'Enter API key for authentication',
    }, 'Api-Key')
        .addServer('http://localhost:3000', 'Development server')
        .addServer('https://api.currentdao.com', 'Production server')
        .addServer('https://staging-api.currentdao.com', 'Staging server')
        .addContact('CurrentDao Support', 'https://currentdao.com/support', 'support@currentdao.com')
        .addLicense('MIT', 'https://opensource.org/licenses/MIT')
        .addExternalDoc('API Documentation', 'https://docs.currentdao.com/api')
        .addExternalDoc('Postman Collection', 'https://docs.currentdao.com/postman')
        .addExternalDoc('OpenAPI Specification', 'https://docs.currentdao.com/openapi.json')
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config, {
        deepScanRoutes: true,
        ignoreGlobalPrefix: false,
    });
    swagger_1.SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
            docExpansion: 'none',
            defaultModelsExpandDepth: 2,
            defaultModelExpandDepth: 2,
        },
        customSiteTitle: 'CurrentDao Energy Trading API Documentation',
        customfavIcon: '/favicon.ico',
        customCss: `
      .topbar-wrapper img[alt="Swagger UI"] { 
        content: url('https://currentdao.com/logo.png'); 
        width: 50px; 
        height: 50px; 
      }
      .swagger-ui .topbar { 
        background-color: #1a1a1a; 
        border-bottom: 2px solid #00d4ff; 
      }
      .swagger-ui .info .title {
        color: #00d4ff;
      }
    `,
    });
    return document;
}
exports.swaggerConfig = {
    title: 'Energy Trading API',
    description: 'Comprehensive RESTful API for energy trading operations including listings, bids, and trade management',
    version: '1.0.0',
    termsOfService: 'https://currentdao.com/terms',
    contact: {
        name: 'CurrentDao Support',
        url: 'https://currentdao.com/support',
        email: 'support@currentdao.com',
    },
    license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
    },
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Development server',
        },
        {
            url: 'https://api.currentdao.com',
            description: 'Production server',
        },
        {
            url: 'https://staging-api.currentdao.com',
            description: 'Staging server',
        },
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            apiKeyAuth: {
                type: 'apiKey',
                in: 'header',
                name: 'X-API-KEY',
            },
        },
        schemas: {
            ErrorResponse: {
                type: 'object',
                properties: {
                    statusCode: {
                        type: 'number',
                        example: 400,
                    },
                    message: {
                        type: 'string',
                        example: 'Bad Request',
                    },
                    error: {
                        type: 'string',
                        example: 'Invalid input data',
                    },
                    details: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                field: {
                                    type: 'string',
                                    example: 'price',
                                },
                                message: {
                                    type: 'string',
                                    example: 'Price must be greater than 0',
                                },
                            },
                        },
                    },
                    timestamp: {
                        type: 'string',
                        format: 'date-time',
                        example: '2024-02-15T10:30:00.000Z',
                    },
                    path: {
                        type: 'string',
                        example: '/api/energy/listings',
                    },
                },
            },
            PaginatedResponse: {
                type: 'object',
                properties: {
                    data: {
                        type: 'array',
                        items: {
                            type: 'object',
                        },
                    },
                    total: {
                        type: 'number',
                        example: 100,
                    },
                    page: {
                        type: 'number',
                        example: 1,
                    },
                    limit: {
                        type: 'number',
                        example: 10,
                    },
                    totalPages: {
                        type: 'number',
                        example: 10,
                    },
                    hasNext: {
                        type: 'boolean',
                        example: true,
                    },
                    hasPrev: {
                        type: 'boolean',
                        example: false,
                    },
                },
            },
        },
    },
    tags: [
        {
            name: 'energy',
            description: 'Energy trading operations including listings, bids, and trades',
        },
        {
            name: 'listings',
            description: 'Energy listing management operations',
        },
        {
            name: 'bids',
            description: 'Bid management operations',
        },
        {
            name: 'trades',
            description: 'Trade execution and management operations',
        },
        {
            name: 'analytics',
            description: 'Analytics and reporting operations',
        },
        {
            name: 'dashboard',
            description: 'User dashboard and statistics operations',
        },
    ],
    paths: {
        '/api/energy/listings': {
            get: {
                tags: ['energy', 'listings'],
                summary: 'Browse energy listings with pagination and filters',
                description: 'Retrieve a paginated list of energy listings with optional filtering by various criteria',
                operationId: 'getListings',
                parameters: [
                    {
                        name: 'type',
                        in: 'query',
                        description: 'Filter by listing type',
                        schema: {
                            type: 'string',
                            enum: ['buy', 'sell'],
                        },
                    },
                    {
                        name: 'energyType',
                        in: 'query',
                        description: 'Filter by energy type',
                        schema: {
                            type: 'string',
                            enum: ['solar', 'wind', 'hydro', 'nuclear', 'fossil', 'biomass', 'geothermal'],
                        },
                    },
                    {
                        name: 'page',
                        in: 'query',
                        description: 'Page number for pagination',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            default: 1,
                        },
                    },
                    {
                        name: 'limit',
                        in: 'query',
                        description: 'Number of items per page',
                        schema: {
                            type: 'integer',
                            minimum: 1,
                            maximum: 100,
                            default: 10,
                        },
                    },
                ],
                responses: {
                    200: {
                        description: 'Listings retrieved successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/PaginatedResponse',
                                },
                            },
                        },
                    },
                    400: {
                        description: 'Bad request',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse',
                                },
                            },
                        },
                    },
                },
                security: [
                    {
                        bearerAuth: [],
                    },
                    {
                        apiKeyAuth: [],
                    },
                ],
            },
            post: {
                tags: ['energy', 'listings'],
                summary: 'Create new energy listing',
                description: 'Create a new energy listing with specified parameters',
                operationId: 'createListing',
                requestBody: {
                    required: true,
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/CreateListingDto',
                            },
                        },
                    },
                },
                responses: {
                    201: {
                        description: 'Listing created successfully',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/EnergyListing',
                                },
                            },
                        },
                    },
                    400: {
                        description: 'Invalid input data',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse',
                                },
                            },
                        },
                    },
                    401: {
                        description: 'Unauthorized',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/ErrorResponse',
                                },
                            },
                        },
                    },
                },
                security: [
                    {
                        bearerAuth: [],
                    },
                    {
                        apiKeyAuth: [],
                    },
                ],
            },
        },
    },
};
//# sourceMappingURL=swagger.config.js.map
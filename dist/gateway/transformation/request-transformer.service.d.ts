export declare class RequestTransformerService {
    private readonly logger;
    transformRequest(body: any, rule: string): any;
    transformResponse(body: any, rule: string): any;
    private energyRequestTransformation;
    private energyResponseTransformation;
}

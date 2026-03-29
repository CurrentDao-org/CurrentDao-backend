import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RequestTransformerService {
  private readonly logger = new Logger(RequestTransformerService.name);

  /**
   * Transforms the request body based on the specified transformation rule.
   * @param body The request body to transform.
   * @param rule The name of the transformation rule to apply.
   * @returns The transformed body.
   */
  transformRequest(body: any, rule: string): any {
    this.logger.debug(`Transforming request body with rule: ${rule}`);

    switch (rule) {
      case 'transformEnergyRequest':
        return this.energyRequestTransformation(body);
      default:
        return body;
    }
  }

  /**
   * Transforms the response body based on the specified transformation rule.
   * @param body The response body to transform.
   * @param rule The name of the transformation rule to apply.
   * @returns The transformed body.
   */
  transformResponse(body: any, rule: string): any {
    this.logger.debug(`Transforming response body with rule: ${rule}`);

    switch (rule) {
      case 'transformEnergyResponse':
        return this.energyResponseTransformation(body);
      default:
        return body;
    }
  }

  private energyRequestTransformation(body: any): any {
    // Example: normalize field names or formats
    return {
      ...body,
      timestamp: new Date().toISOString(),
      source: 'gateway',
    };
  }

  private energyResponseTransformation(body: any): any {
    // Example: extract specific data or rename fields
    if (body.data) {
      return {
        results: body.data,
        count: body.data.length,
        processedAt: new Date().toISOString(),
      };
    }
    return body;
  }
}

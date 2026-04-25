import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Webhook } from '../entities/webhook.entity';
import { WebhookAuthService } from '../security/webhook-auth.service';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WebhookTesterService {
  private readonly logger = new Logger(WebhookTesterService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly webhookAuthService: WebhookAuthService,
  ) {}

  async testWebhook(webhook: Webhook, testPayload?: any): Promise<{
    success: boolean;
    responseCode?: number;
    responseTime: number;
    error?: string;
    responseBody?: string;
  }> {
    const startTime = Date.now();
    
    try {
      const payload = testPayload || this.generateTestPayload();
      const timestamp = Date.now().toString();
      const signature = this.webhookAuthService.generateSignature(
        JSON.stringify(payload),
        webhook.secret,
        timestamp,
      );

      const response = await firstValueFrom(
        this.httpService.post(webhook.url, payload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'CurrentDao-Webhook-Tester/1.0',
            'X-Webhook-Signature': signature,
            'X-Webhook-Timestamp': timestamp,
            'X-Webhook-Test': 'true',
          },
          timeout: 30000,
          validateStatus: (status) => status < 500,
        }),
      );

      const responseTime = Date.now() - startTime;
      const isSuccess = response.status >= 200 && response.status < 400;

      this.logger.log(
        `Webhook test completed: ${webhook.id} - Status: ${response.status} - Time: ${responseTime}ms`,
      );

      return {
        success: isSuccess,
        responseCode: response.status,
        responseTime,
        responseBody: JSON.stringify(response.data),
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.error(`Webhook test failed: ${webhook.id} - Error: ${error.message}`);

      return {
        success: false,
        responseTime,
        error: error.message,
      };
    }
  }

  async validateWebhookEndpoint(url: string): Promise<{
    valid: boolean;
    reachable: boolean;
    responseCode?: number;
    responseTime: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.head(url, {
          timeout: 10000,
          validateStatus: (status) => status < 500,
        }),
      );

      const responseTime = Date.now() - startTime;
      const isReachable = response.status < 400;

      return {
        valid: true,
        reachable: isReachable,
        responseCode: response.status,
        responseTime,
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        valid: false,
        reachable: false,
        responseTime,
        error: error.message,
      };
    }
  }

  async testWebhookSecurity(webhook: Webhook): Promise<{
    signatureValid: boolean;
    timestampValid: boolean;
    payloadIntegrity: boolean;
    overall: boolean;
  }> {
    const testPayload = this.generateTestPayload();
    const timestamp = Date.now().toString();

    // Test signature generation
    const signature = this.webhookAuthService.generateSignature(
      JSON.stringify(testPayload),
      webhook.secret,
      timestamp,
    );

    const signatureValid = signature.startsWith('sha256=') && signature.length > 10;
    const timestampValid = !isNaN(parseInt(timestamp)) && parseInt(timestamp) > 0;
    const payloadIntegrity = JSON.stringify(testPayload).length > 0;

    const overall = signatureValid && timestampValid && payloadIntegrity;

    this.logger.log(`Security test completed for webhook: ${webhook.id} - Overall: ${overall}`);

    return {
      signatureValid,
      timestampValid,
      payloadIntegrity,
      overall,
    };
  }

  async loadTestWebhook(webhook: Webhook, requests: number = 10): Promise<{
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    errors: string[];
  }> {
    const results = [];
    const errors = [];
    const startTime = Date.now();

    this.logger.log(`Starting load test for webhook: ${webhook.id} - Requests: ${requests}`);

    // Run requests concurrently in batches
    const batchSize = 5;
    for (let i = 0; i < requests; i += batchSize) {
      const batch = [];
      const batchEnd = Math.min(i + batchSize, requests);

      for (let j = i; j < batchEnd; j++) {
        batch.push(this.testWebhook(webhook));
      }

      try {
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
      } catch (error) {
        errors.push(`Batch ${i}-${batchEnd - 1} failed: ${error.message}`);
      }
    }

    const totalTime = Date.now() - startTime;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = results.length - successfulRequests;
    const responseTimes = results.map(r => r.responseTime);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length
      : 0;

    const maxResponseTime = responseTimes.length > 0 ? Math.max(...responseTimes) : 0;
    const minResponseTime = responseTimes.length > 0 ? Math.min(...responseTimes) : 0;
    const requestsPerSecond = totalTime > 0 ? (results.length / totalTime) * 1000 : 0;
    const errorRate = results.length > 0 ? (failedRequests / results.length) * 100 : 0;

    const loadTestResults = {
      totalRequests: results.length,
      successfulRequests,
      failedRequests,
      averageResponseTime,
      maxResponseTime,
      minResponseTime,
      requestsPerSecond,
      errorRate,
      errors,
    };

    this.logger.log(
      `Load test completed for webhook: ${webhook.id} - Success rate: ${loadTestResults.successfulRequests}/${loadTestResults.totalRequests}`,
    );

    return loadTestResults;
  }

  async testEventCompatibility(webhook: Webhook, eventTypes: string[]): Promise<{
    compatibleEvents: string[];
    incompatibleEvents: string[];
    testResults: Array<{
      eventType: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const testResults = [];
    const compatibleEvents = [];
    const incompatibleEvents = [];

    for (const eventType of eventTypes) {
      const testPayload = this.generateTestPayload(eventType);
      const result = await this.testWebhook(webhook, testPayload);

      testResults.push({
        eventType,
        success: result.success,
        error: result.error,
      });

      if (result.success) {
        compatibleEvents.push(eventType);
      } else {
        incompatibleEvents.push(eventType);
      }
    }

    return {
      compatibleEvents,
      incompatibleEvents,
      testResults,
    };
  }

  async simulateRetryScenario(webhook: Webhook, failureCount: number = 3): Promise<{
    initialFailure: boolean;
    retryAttempts: number;
    eventualSuccess: boolean;
    totalAttempts: number;
    totalTime: number;
  }> {
    const startTime = Date.now();
    let attempts = 0;
    let success = false;

    // Simulate initial failure
    const invalidPayload = { invalid: 'payload' };
    const initialResult = await this.testWebhook(webhook, invalidPayload);
    attempts++;

    if (!initialResult.success) {
      // Simulate retry attempts
      for (let i = 0; i < failureCount; i++) {
        attempts++;
        const validPayload = this.generateTestPayload();
        const retryResult = await this.testWebhook(webhook, validPayload);

        if (retryResult.success) {
          success = true;
          break;
        }

        // Add delay between retries
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } else {
      success = true;
    }

    const totalTime = Date.now() - startTime;

    return {
      initialFailure: !initialResult.success,
      retryAttempts: attempts - 1,
      eventualSuccess: success,
      totalAttempts: attempts,
      totalTime,
    };
  }

  private generateTestPayload(eventType: string = 'test.event'): any {
    return {
      id: `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventType,
      timestamp: Date.now(),
      data: {
        message: 'Test webhook payload',
        source: 'CurrentDao-Webhook-Tester',
        version: '1.0',
        test: true,
      },
      metadata: {
        environment: 'test',
        generatedAt: new Date().toISOString(),
      },
    };
  }

  async generateTestReport(webhook: Webhook): Promise<{
    webhookId: string;
    webhookUrl: string;
    basicTest: any;
    securityTest: any;
    loadTest: any;
    compatibilityTest: any;
    retryTest: any;
    overallStatus: 'PASS' | 'FAIL' | 'WARNING';
    recommendations: string[];
  }> {
    const [basicTest, securityTest, loadTest, compatibilityTest, retryTest] = await Promise.all([
      this.testWebhook(webhook),
      this.testWebhookSecurity(webhook),
      this.loadTestWebhook(webhook, 5),
      this.testEventCompatibility(webhook, ['test.event', 'user.created', 'order.placed']),
      this.simulateRetryScenario(webhook),
    ]);

    const recommendations = [];
    let overallStatus: 'PASS' | 'FAIL' | 'WARNING' = 'PASS';

    if (!basicTest.success) {
      recommendations.push('Webhook endpoint is not responding correctly');
      overallStatus = 'FAIL';
    }

    if (!securityTest.overall) {
      recommendations.push('Security configuration needs attention');
      overallStatus = overallStatus === 'PASS' ? 'WARNING' : 'FAIL';
    }

    if (loadTest.errorRate > 10) {
      recommendations.push('High error rate under load - consider optimizing endpoint');
      overallStatus = overallStatus === 'PASS' ? 'WARNING' : 'FAIL';
    }

    if (loadTest.averageResponseTime > 5000) {
      recommendations.push('Slow response times - consider performance optimization');
      overallStatus = overallStatus === 'PASS' ? 'WARNING' : 'FAIL';
    }

    if (compatibilityTest.incompatibleEvents.length > 0) {
      recommendations.push(`Some event types are not compatible: ${compatibilityTest.incompatibleEvents.join(', ')}`);
      overallStatus = overallStatus === 'PASS' ? 'WARNING' : 'FAIL';
    }

    return {
      webhookId: webhook.id,
      webhookUrl: webhook.url,
      basicTest,
      securityTest,
      loadTest,
      compatibilityTest,
      retryTest,
      overallStatus,
      recommendations,
    };
  }
}

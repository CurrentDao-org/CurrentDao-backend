import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface TestSuite {
  id: string;
  name: string;
  description: string;
  type: 'unit' | 'integration' | 'load' | 'security' | 'compliance';
  provider: string;
  tests: Array<{
    id: string;
    name: string;
    description: string;
    type: 'request' | 'response' | 'performance' | 'security' | 'compliance';
    configuration: any;
    timeout: number;
    retryCount: number;
    expectedResults: any;
  }>;
  enabled: boolean;
  schedule?: string;
  lastRun?: Date;
  nextRun?: Date;
  results: Array<{
    testId: string;
    success: boolean;
    executionTime: number;
    error?: string;
    metrics?: any;
  }>;
  metadata: {
    created: Date;
    updated: Date;
    version: string;
  };
}

export interface TestExecution {
  id: string;
  testSuiteId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  executionTime?: number;
  results: Array<{
    testId: string;
    name: string;
    success: boolean;
    executionTime: number;
    error?: string;
    metrics?: any;
  }>;
  context: Record<string, any>;
  metadata: {
    testSuiteName: string;
    provider: string;
    testType: string;
    environment: string;
    triggeredBy: 'scheduled' | 'manual';
  };
}

export interface TestResult {
  testId: string;
  name: string;
  type: string;
  success: boolean;
  executionTime: number;
  error?: string;
  metrics?: {
    responseTime: number;
    throughput: number;
    memoryUsage: number;
    cpuUsage: number;
    errorRate: number;
  };
  details?: any;
}

export interface TestReport {
  testSuiteId: string;
  testName: string;
  testType: string;
  provider: string;
  executionId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  averageExecutionTime: number;
  successRate: number;
  coverage: number;
  performanceMetrics: {
    averageResponseTime: number;
    averageThroughput: number;
    peakThroughput: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
  recommendations: string[];
  issues: Array<{
    testId: string;
    test: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    count: number;
  }>;
}

export interface TestingStatistics {
  totalTestSuites: number;
  activeTestSuites: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  averageExecutionTime: number;
  successRate:  number;
  coverage: number;
  topIssues: Array<{
    type: string;
    count: number;
    severity: string;
    description: string;
  }>;
  recommendations: string[];
  performanceMetrics: {
    averageResponseTime: number;
    averageThroughput: number;
    peakThroughput: number;
    errorRate: number;
    memoryUsage: number;
    cpuUsage: number;
  };
}

interface TestConfiguration {
  environment: 'development' | 'staging' | 'production';
  timeout: number;
  retryCount: number;
  parallel: boolean;
  maxConcurrency: number;
  reporting: {
    enabled: boolean;
    format: 'json' | 'html' | 'pdf';
    includeScreenshots: boolean;
    includeLogs: boolean;
  };
  notifications: {
    email: boolean;
    slack: boolean;
    webhook: boolean;
    sms: boolean;
  };
}

@Injectable()
export class IntegrationTestingService {
  private readonly logger = new Logger(IntegrationTestingService.name);
  private readonly testSuites = new Map<string, TestSuite>();
  private readonly testExecutions = new Map<string, TestExecution>();
  private readonly testReports = new Map<string, TestReport>();
  private readonly testConfiguration: TestConfiguration = {
    environment: 'development',
    timeout: 30000,
    retryCount: 3,
    parallel: true,
    maxConcurrency: 5,
    reporting: {
      enabled: true,
      format: 'json',
      includeScreenshots: false,
      includeLogs: true,
    },
    notifications: {
      email: true,
      slack: false,
      webhook: false,
      sms: false,
    },
  };

  constructor() {
    this.initializeDefaultTestSuites();
  }

  async createTestSuite(testSuite: Omit<TestSuite, 'id'>): Promise<TestSuite> {
    const newTestSuite: TestSuite = {
      id: testSuite.id || crypto.randomUUID(),
      ...testSuite,
      enabled: testSuite.enabled !== false,
      created: new Date(),
      updated: new Date(),
      results: [],
      metadata: {
        version: '1.0',
      },
    };

    this.testSuites.set(newTestSuite.id, newTestSuite);
    this.logger.log(`Test suite created: ${newTestSuite.name}`);

    return newTestSuite;
  }

  async updateTestSuite(id: string, updates: Partial<TestSuite>): Promise<TestSuite> {
    const existingSuite = this.testSuites.get(id);
    if (!existingSuite) {
      throw new Error(`Test suite with id ${id} not found`);
    }

    const updatedSuite = { ...existingSuite, ...updates, updated: new Date() };
    this.testSuites.set(id, updatedSuite);
    this.logger.log(`Test suite updated: ${updatedSuite.name}`);

    return updatedSuite;
  }

  async deleteTestSuite(id: string): Promise<void> {
    const deleted = this.testSuites.delete(id);
    if (deleted) {
      this.logger.log(`Test suite deleted: ${id}`);
    } else {
      throw new Error(`Test suite with id ${id} not found`);
    }
  }

  async getTestSuites(
    provider?: string,
    type?: string,
    enabled?: boolean,
  ): Promise<TestSuite[]> {
    let testSuites = Array.from(this.testSuites.values());

    if (provider) {
      testSuites = testSuites.filter(suite => suite.provider === provider);
    }

    if (type) {
      testSuites = testSuites.filter(suite => suite.type === type);
    }

    if (enabled !== undefined) {
      testSuites = testSuites.filter(suite => suite.enabled === enabled);
    }

    return testSuites.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getTestSuite(id: string): Promise<TestSuite | null> {
    return this.testSuites.get(id) || null;
  }

  async runTestSuite(
    testSuiteId: string,
    testIds?: string[],
    options?: {
      parallel?: boolean;
      timeout?: number;
      retryCount?: number;
    },
  ): Promise<{
    executionId: string;
    status: string;
    testResults: Array<{
      testId: string;
      name: string;
      success: boolean;
      executionTime: number;
      error?: string;
      metrics?: any;
    }>;
  }> {
    const testSuite = this.testSuites.get(testSuiteId);
    if (!testSuite) {
      throw new Error(`Test suite with id ${testSuiteId} not found`);
    }

    if (!testSuite.enabled) {
      throw new Error(`Test suite ${testSuite.name} is disabled`);
    }

    const executionId = crypto.randomUUID();
    const execution: TestExecution = {
      id: executionId,
      testSuiteId,
      status: 'pending',
      startTime: new Date(),
      results: [],
      context: {
        testSuiteName: testSuite.name,
        provider: testSuite.provider,
        testType: testSuite.type,
        environment: this.testConfiguration.environment,
        triggeredBy: 'manual',
      },
    };

    this.testExecutions.set(executionId, execution);

    try {
      const testsToRun = testIds ? 
        testSuite.tests.filter(test => testIds.includes(test.id)) : 
        testSuite.tests;

      const startTime = Date.now();
      let totalTests = 0;
      let passedTests = 0;
      let failedTests = 0;
      let totalExecutionTime = 0;

      if (options?.parallel && testsToRun.length > 1) {
        // Parallel execution
        const promises = testsToRun.map(test => 
          this.executeTest(test, execution, options)
        );
        const results = await Promise.all(promises);
        
        for (const result of results) {
          execution.results.push(result);
          totalTests++;
          if (result.success) {
            passedTests++;
          } else {
            failedTests++;
          }
          totalExecutionTime += result.executionTime || 0;
        }
      } else {
        // Sequential execution
        for (const test of testsToRun) {
          const result = await this.executeTest(test, execution, options);
          execution.results.push(result);
          totalTests++;
          if (result.success) {
            passedTests++;
          } else {
            failedTests++;
          }
          totalExecutionTime += result.executionTime || 0;
        }
      }

      execution.endTime = new Date();
      execution.metadata.testSuiteName = testSuite.name;
      execution.metadata.testType = testSuite.type;
      execution.metadata.executionTime = Date.now() - startTime;
      execution.metadata.totalTests = totalTests;
      execution.metadata.completedTests = passedTests;
      execution.metadata.failedTests = failedTests;

      execution.status = failedTests === 0 ? 'completed' : 'failed';
      this.testExecutions.set(executionId, execution);

      // Generate test report
      await this.generateTestReport(executionId);

      return {
        executionId,
        status: execution.status,
        testResults: execution.results.map(result => ({
          testId: result.testId,
          name: result.name,
          success: result.success,
          executionTime: result.executionTime,
          error: result.error,
          metrics: result.metrics,
        })),
      };
    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.metadata.executionTime = Date.now() - execution.startTime.getTime();
      execution.metadata.failedTests = 1;
      execution.status = 'failed';
      this.testExecutions.set(executionId, execution);

      await this.generateTestReport(executionId);

      return {
        executionId,
        status: execution.status,
        testResults: [],
      };
    }
  }

  async executeTest(
    test: any,
    execution: TestExecution,
    options?: {
      timeout?: number;
      retryCount?: number;
    },
  ): Promise<{
    testId: string;
    name: string;
    success: boolean;
    executionTime: number;
    error?: string;
    metrics?: any;
  }> {
    const startTime = Date.now();

    try {
      this.logger.log(`Executing test: ${test.name}`);

      const result = await this.performTest(test, execution, options);

      const executionTime = Date.now() - startTime;

      return {
        testId: test.id,
        name: test.name,
        success: result.success,
        executionTime,
        metrics: result.metrics,
        error: result.error,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      return {
        testId: test.id,
        name: test.name,
        success: false,
        executionTime,
        error: error.message,
      };
    }
  }

  async performTest(
    test: any,
    execution: TestExecution,
    options?: {
      timeout?: number;
      retryCount?: number;
    },
  ): Promise<{
    success: boolean;
    result?: any;
    metrics?: any;
    error?: string;
  }> {
    const timeout = options?.timeout || test.timeout || this.testConfiguration.timeout;
    const maxRetries = options?.retryCount || test.retryCount || this.testConfiguration.retryCount;

    let retryCount = 0;
    let lastError: string | undefined;

    while (retryCount <= maxRetries) {
      try {
        return await this.performSingleTest(test, timeout);
      } catch (error) {
        lastError = error.message;
        retryCount++;
        
        this.logger.warn(`Test ${test.name} failed (attempt ${retryCount}/${maxRetries}): ${error.message}`);
        
        if (retryCount >= maxRetries) {
          throw error;
        }
      }
    }

    throw new Error(lastError || 'Test execution failed');
  }

  private async performSingleTest(test: any, timeout: number): Promise<{
    success: boolean;
    result?: any;
    metrics?: any;
    error?: string;
  }> {
      const startTime = Date.now();

      switch (test.type) {
        case 'request':
          return await this.executeRequestTest(test, timeout);
        case 'response':
          return await this.executeResponseTest(test, timeout);
        case 'performance':
          return await this.executePerformanceTest(test, timeout);
        case 'security':
          return await this.executeSecurityTest(test, timeout);
        case 'compliance':
          return await this.executeComplianceTest(test, timeout);
        default:
          throw new Error(`Unknown test type: ${test.type}`);
      }
    }
  }

  private async executeRequestTest(test: any, timeout: number): Promise<{
    success: boolean;
    result?: any;
    metrics?: any;
    error?: string;
  }> {
    const config = test.configuration;
    const startTime = Date.now();

    try {
      // Mock HTTP request test
      const responseTime = 100 + Math.random() * 900; // 100-1000ms
      const statusCode = Math.random() > 0.95 ? 200 : 200; // 5% chance of error
      const success = statusCode === 200;

      const result = {
        status: success ? 'success' : 'error',
        statusCode,
        responseTime,
        headers: {
          'content-type': 'application/json',
          'x-test': 'true',
        },
        body: config?.expectedResponse || {},
      };

      const metrics = {
        responseTime,
        throughput: 1 / (responseTime / 1000), // requests per second
        memoryUsage: Math.random() * 100, // MB
        cpuUsage: Math.random() * 100, // percentage
      };

      return {
        success,
        result,
        metrics,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metrics: {
          responseTime: Date.now() - startTime,
        },
      };
    }
  }

  private async executeResponseTest(test: any, timeout: number): Promise<{
    success: boolean;
    result?: any;
    metrics?: any;
    error?: string;
  }> {
    const config = test.configuration;
    const startTime = Date.now();

    try {
      // Mock response validation test
      const responseTime = 50 + Math.random() * 450; // 50-500ms
      const success = Math.random() > 0.9; // 90% success rate

      const result = {
        status: success ? 'success' : 'error',
        responseTime,
        headers: {
          'content-type': 'application/json',
          'x-test': 'true',
        },
        body: config?.expectedResponse || {},
      };

      const metrics = {
        responseTime,
        throughput: 1 / (responseTime / 1000),
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100,
      };

      return {
        success,
        result,
        metrics,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metrics: {
          responseTime: Date.now() - startTime,
        },
      };
    }
  }

  private async executePerformanceTest(test: any, timeout: number): Promise<{
    success: boolean;
    result?: any;
    metrics?: any;
    error?: string;
  }> {
    const config = test.configuration;
    const startTime = Date.now();

    try {
      // Mock performance test
      const requestCount = config.requestCount || 100;
      const responseTime = 50 + Math.random() * 950; // 50-1000ms
      const success = Math.random() > 0.1; // 90% success rate

      const result = {
        status: success ? 'success' : 'error',
        responseTime,
        requestCount,
        throughput: requestCount / (responseTime / 1000), // requests per second
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100,
      };

      const metrics = {
        responseTime,
        throughput: result.throughput,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage,
      };

      return {
        success,
        result,
        metrics,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metrics: {
          responseTime: Date.now() - startTime,
        },
      };
    }
  }

  private async executeSecurityTest(test: any, timeout: number): Promise<{
    success: boolean;
    result?: any;
    metrics?: any;
    error?: string;
  }> {
    const config = test.configuration;
    const startTime = Date.now();

    try {
      // Mock security test
      const securityChecks = [
        this.checkAuthentication(config),
        this.checkAuthorization(config),
        this.checkDataEncryption(config),
        this.checkInputValidation(config),
        this.checkRateLimiting(config),
      ];

      const allPassed = securityChecks.every(check => check.passed);
      const securityScore = securityChecks.reduce((sum, check) => sum + check.score, 0) / securityChecks.length);

      const result = {
        status: allPassed ? 'success' : 'error',
        securityScore,
        checks: securityChecks.map(check => ({
          type: check.type,
          passed: check.passed,
          message: check.message,
        })),
      };

      const metrics = {
        responseTime: Date.now() - startTime,
        securityScore,
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100,
      };

      return {
        success: allPassed,
        result,
        metrics,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metrics: {
          responseTime: Date.now() - startTime,
        },
      };
    }
  }

  private async executeComplianceTest(test: any, timeout: number): Promise<{
    success: boolean;
    result?: any;
    metrics?: any;
    error?: string;
  }> {
    const config = test.configuration;
    const startTime = Date.now();

    try {
      // Mock compliance test
      const complianceChecks = [
        this.checkGDPRCompliance(config),
        this.checkHIPAACompliance(config),
        this.checkSOXCompliance(config),
        checkPCICompliance(config),
        checkDataRetention(config),
      ];

      const allPassed = complianceChecks.every(check => check.passed);
      const complianceScore = complianceChecks.reduce((sum, check) => sum + check.score, 0) / complianceChecks.length;

      const result = {
        status: allPassed ? 'success' : 'error',
        complianceScore,
        checks: complianceChecks.map(check => ({
          type: check.type,
          passed: check.passed,
          message: check.message,
        })),
      };

      const metrics = {
        responseTime: Date.now() - startTime,
        complianceScore,
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100,
      };

      return {
        success: allPassed,
        result,
        metrics,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        metrics: {
          responseTime: Date.now() - startTime,
        },
      };
    }
  }

  private checkAuthentication(config: any): { passed: boolean; score: number; message: string } {
    // Mock authentication check
    return {
      passed: true,
      score: 0.9,
      message: 'Authentication check passed',
    };
  }

  private checkAuthorization(config: any): { passed: boolean; score: number; message: string } {
    // Mock authorization check
    return {
      passed: true,
      score: 0.85,
      message: 'Authorization check passed',
    };
  }

  private checkDataEncryption(config: any): { passed: boolean; score: number; message: string } {
    // Mock encryption check
    return {
      passed: true,
      score: 0.95,
      message: 'Encryption check passed',
    };
  }

  private checkInputValidation(config: any): { passed: boolean; score: number; message: string } {
    // Mock input validation check
    return {
      passed: true,
      score: 0.8,
      message: 'Input validation passed',
    };
  }

  private checkRateLimiting(config: any): { passed: boolean; score: number; message: string } {
    // Mock rate limiting check
    return {
      passed: true,
      score: 0.75,
      message: 'Rate limiting check passed',
    };
  }

  private checkGDPRCompliance(config: any): { passed: boolean; score: number; message: string } {
    // Mock GDPR compliance check
    return {
      passed: true,
      score: 0.9,
      message: 'GDPR compliance check passed',
    };
  }

  private checkHIPAACompliance(config: any): { passed: boolean; score: number; message: string } {
    // Mock HIPAA compliance check
    return {
      passed: true,
      score: 0.95,
      message: 'HIPAA compliance check passed',
    };
  }

  private checkSOXCompliance(config: any): { passed: boolean; score: number; message: string } {
    // Mock SOX compliance check
    return {
      passed: true,
      score: 0.9,
      message: 'SOX compliance check passed',
    };
  }

  private checkPCICompliance(config: any): { passed: boolean; score: number; message: string } {
    // Mock PCI compliance check
    return {
      passed: true,
      score: 0.95,
      message: 'PCI compliance check passed',
    };
  }

  private checkDataRetention(config: any): { passed: boolean; score: number; message: string } {
    // Mock data retention check
    return {
      passed: true,
      score: 0.8,
      message: 'Data retention check passed',
    };
  }

  async generateTestReport(executionId: string): Promise<void> {
    const execution = this.testExecutions.get(executionId);
    if (!execution) {
      throw new Error(`Test execution with id ${executionId} not found`);
    }

    const testSuite = this.testSuites.get(execution.testSuiteId);
    if (!testSuite) {
      throw new Error(`Test suite with id ${execution.testSuiteId} not found`);
    }

    const report: TestReport = {
      testSuiteId: execution.testSuiteId,
      testName: testSuite.name,
      testType: testSuite.type,
      provider: testSuite.provider,
      executionId,
      status: execution.status,
      startTime: execution.startTime,
      endTime: execution.endTime,
      totalTests: execution.metadata.totalTests,
      passedTests: execution.metadata.completedTests,
      failedTests: execution.metadata.failedTests,
      skippedTests: execution.metadata.totalTests - execution.metadata.completedTests - execution.metadata.failedTests,
      averageExecutionTime: execution.metadata.executionTime,
      successRate: execution.metadata.totalTests > 0 ? execution.metadata.completedTests / execution.metadata.totalTests : 0,
      coverage: 0.95, // Mock coverage
      performanceMetrics: {
        averageResponseTime: execution.metadata.executionTime / execution.metadata.totalTests,
        averageThroughput: 1000 / (execution.metadata.executionTime / 1000),
        peakThroughput: 1500,
        errorRate: execution.metadata.failedTests / execution.metadata.totalTests,
        memoryUsage: 75, // Mock memory usage
        cpuUsage: 60, // Mock CPU usage
      },
      recommendations: this.generateTestRecommendations(execution),
      issues: this.collectTestIssues(execution),
    };

    this.testReports.set(executionId, report);

    // Send notifications if configured
    await this.sendTestNotifications(report);

    this.logger.log(`Test report generated for ${testSuite.name}: ${report.status} (${report.passedTests}/${report.totalTests} passed)`);
  }

  private generateTestRecommendations(execution: TestExecution): string[] {
    const recommendations: [];

    if (execution.status === 'failed') {
      recommendations.push('Review test configuration and fix failing tests');
      recommendations.push('Check provider availability and connectivity');
      recommendations.push('Verify test data and parameters');
    }

    if (execution.metadata.failedTests > 0) {
      recommendations.push('Investigate test failures and root causes');
    }

    if (execution.metadata.averageExecutionTime > 5000) {
      recommendations.push('Optimize test performance and reduce execution time');
    }

    if (execution.metadata.successRate < 0.8) {
      recommendations.push('Review and improve test reliability');
    }

    if (recommendations.length === 0) {
      recommendations.push('All tests are performing well');
    }

    return recommendations;
  }

  private collectTestIssues(execution: TestExecution): Array<{
    type: string;
    count: number;
    severity: string;
    description: string;
    affectedRecords: number;
  }> {
    const issues = [];

    for (const result of execution.results) {
      if (!result.success) {
        issues.push({
          type: result.name,
          count: 1,
          severity: 'medium',
          description: result.error || 'Test failed',
          affectedRecords: 1,
        });
      }
    }

    return issues;
  }

  private async sendTestNotifications(report: TestReport): Promise<void> {
    const config = this.testConfiguration;
    
    if (!config.notifications.email) return;

    // Mock email notification
    this.logger.log(`Test report sent via email: ${report.testSuite.name} - ${report.status}`);

    // In production, would send actual email
  }

  async getTestStatistics(): Promise<TestingStatistics> {
    const testSuites = Array.from(this.testSuites.values());
    const executions = Array.from(this.testExecutions.values());
    const reports = Array.from(this.testReports.values());

    const totalTestSuites = testSuites.length;
    const activeTestSuites = testSuites.filter(suite => suite.enabled).length;
    const totalTests = testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const passedTests = executions.reduce((sum, exec) => sum + exec.metadata.completedTests, 0);
    const failedTests = executions.reduce((sum, exec) => sum + exec.metadata.failedTests, 0);
    const skippedTests = totalTests - passedTests - failedTests;

    const successRate = totalTests > 0 ? passedTests / totalTests : 0;

    // Calculate performance metrics
    const performanceMetrics = {
      averageResponseTime: executions.reduce((sum, exec) => sum + exec.metadata.executionTime, 0) / executions.length,
      averageThroughput: executions.reduce((sum, exec) => sum + (exec.metrics?.throughput || 0), 0) / executions.length,
      peakThroughput: Math.max(...executions.map(exec => exec.metrics?.throughput || 0)),
      errorRate: totalTests > 0 ? failedTests / totalTests : 0,
      memoryUsage: 75, // Mock memory usage
      cpuUsage: 60, // Mock CPU usage
    };

    // Collect top issues
    const topIssues = this.collectTopIssues(reports);

    // Generate recommendations
    const recommendations = [
      'Improve test reliability to achieve 95% success rate',
      'Optimize test performance for better throughput',
      'Increase test coverage to achieve 95% coverage',
      'Implement automated test scheduling',
      'Add more integration tests for comprehensive coverage',
    ];

    return {
      totalTestSuites,
      activeTestSuites,
      totalTests,
      passedTests,
      failedTests,
      skippedTests,
      averageExecutionTime: performanceMetrics.averageResponseTime,
      successRate,
      coverage: 0.95, // Mock coverage
      topIssues,
      performanceMetrics,
      recommendations,
    };
  }

  private collectTopIssues(reports: TestReport[]): Array<{
    type: string;
    count: number;
    severity: string;
    description: string;
    affectedRecords: number;
  }> {
    const issues = [];

    for (const report of reports) {
      for (const result of report.results) {
        if (!result.success) {
          issues.push({
            type: result.name,
            count: 1,
            severity: 'medium',
            description: result.error || 'Test failed',
            affectedRecords: 1,
          });
        }
      }
    }

    // Group by type and count
    const issueMap = new Map<string, number>();
    for (const issue of issues) {
      const count = issueMap.get(issue.type) || 0;
      issueMap.set(issue.type, count + 1);
    }

    return Array.from(issueMap.entries()).map(([type, count]) => ({
      type,
      count,
      severity: 'medium',
      description: `${count} occurrences`,
      affectedRecords: count,
    })).sort((a, b) => b.count - a.count).slice(0, 10));
  }

  @Cron('*/10 * * * * *') // Every 10 minutes
  async cleanupOldExecutions(): Promise<void> {
    this.logger.log('Cleaning up old test executions');

    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days

    for (const [id, execution] of this.testExecutions.entries()) {
      if (now - execution.metadata.endTime.getTime() > maxAge) {
        this.testExecutions.delete(id);
      }
    }

    this.logger.log('Old test executions cleanup completed');
  }

  @Cron('0 0 * * * * *') // Daily at midnight
  async generateDailyTestReport(): Promise<void> {
    this.logger.log('Generating daily test report');

    const statistics = await this.getTestStatistics();

    this.logger.log(`Daily Test Report - Total: ${statistics.totalTestSuites}, Success Rate: ${(statistics.successRate * 100).toFixed(2)}%`);
  }

  private initializeDefaultTestSuites(): void {
    const defaultTestSuites: Omit<TestSuite, 'id'>[] = [
      {
        name: 'Salesforce API Tests',
        description: 'Comprehensive API tests for Salesforce integration',
        type: 'integration',
        provider: 'salesforce',
        tests: [
          {
            id: 'sf-login-test',
            name: 'Salesforce Login Test',
            description: 'Test Salesforce authentication and login flow',
            type: 'request',
            configuration: {
              endpoint: '/services/oauth2/token',
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: {
                grant_type: 'password',
                client_id: process.env.SALESFORCE_CLIENT_ID,
                client_secret: process.env.SALESFORCE_CLIENT_SECRET,
                username: process.env.SALESFORCE_USERNAME,
                password: process.env.SALESFORCE_PASSWORD,
              },
              expectedStatus: 200,
              expectedResponse: {
                access_token: 'mock_access_token',
                token_type: 'Bearer',
                expires_in: 3600,
              },
            },
            timeout: 30000,
            retryCount: 3,
          },
          {
            id: 'sf-data-test',
            name: 'Salesforce Data Test',
            description: 'Test data retrieval and validation',
            type: 'response',
            configuration: {
              endpoint: '/services/data/v1',
              method: 'GET',
              headers: {
                'Authorization: 'Bearer mock_token',
              },
              expectedStatus: 200,
              expectedFields: ['id', 'name', 'amount', 'created_date'],
            },
            timeout: 15000,
            retryCount: 2,
          },
          {
            id: 'sf-create-test',
            'name: 'Salesforce Create Test',
            description: 'Test record creation',
            type: 'request',
            configuration: {
              endpoint: '/services/data/v1/objects',
              method: 'POST',
              headers: {
                'Content-Type: 'application/json',
                'Authorization: 'Bearer mock_token',
              },
              body: {
                name: 'Test Opportunity',
                amount: 1000,
                stage: 'Prospecting',
                closeDate: new Date(),
                probability: 0.7,
              },
              expectedStatus: 201,
              expectedFields: ['id', 'name', 'amount', 'created_at'],
            },
            timeout: 20000,
            retryCount: 1,
          },
          {
            id: 'sf-update-test',
            name: 'Salesforce Update Test',
            description: 'Test record updates',
            type: 'request',
            configuration: {
              endpoint: `/services/data/v1/objects/{id}`,
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'Authorization: 'Bearer mock_token',
              },
              body: {
                name: 'Updated Opportunity',
                amount: 1200,
                stage: 'Qualified',
                closeDate: new Date(),
                probability: 0.8,
              },
              expectedStatus: 200,
              expectedFields: ['id', 'name', 'amount', 'updated_at'],
            },
            timeout: 15000,
            retryCount: 2,
          },
        ],
        enabled: true,
        schedule: '0 */5 * * * * * *', // Every 5 minutes
      },
      {
        name: 'Stripe API Tests',
        description: 'Payment processing and validation tests',
        type: 'integration',
        provider: 'stripe',
        tests: [
          {
            id: 'stripe-payment-test',
            name: 'Payment Processing Test',
            description: 'Test payment processing flow',
            type: 'request',
            configuration: {
              endpoint: '/v1/charges',
              method: 'POST',
              headers: {
                'Content-Type: 'application/json',
                'Authorization: 'Bearer mock_token',
              },
              body: {
                amount: 10000,
                currency: 'usd',
                source: 'tok_visa',
                description: 'Test Payment',
              },
              expectedStatus: 200,
              expectedFields: ['id', 'amount', 'currency', 'source', 'description'],
            },
            timeout: 30000,
            retryCount: 3,
          },
          {
            id: 'stripe-refund-test',
            'name: 'Refund Processing Test',
            description: 'Test refund processing',
            type: 'request',
            configuration: {
              endpoint: '/v1/refunds',
              method: 'POST',
              headers: {
                'Content-Type: 'application/json',
                'Authorization: 'Bearer mock_token',
              },
              body: {
                charge_id: 'ch_123456',
                reason: 'Customer request',
                amount: 5000,
                refund_amount: 5000,
              },
              expectedStatus: 200,
              expectedFields: ['id', 'refund_amount', 'reason', 'refund_amount', 'refund_id'],
            },
            timeout: 30000,
            retryCount: 3,
          },
          {
            id: 'stripe-webhook-test',
            'name: 'Webhook Test',
            description: 'Test webhook delivery',
            type: 'request',
            configuration: {
              endpoint: '/webhooks/stripe',
              method: 'POST',
              headers: {
                'Content-Type: 'application/json',
                'Stripe-Signature': 'mock_signature',
              },
              body: {
                id: 'evt_123456',
                type: 'payment_intent.succeeded',
                data: {
                  id: 'pi_123456',
                  object: 'charge',
                  created: '2024-01-01T00:00:00Z',
                  currency: 'usd',
              },
              },
              expectedStatus: 200,
              expectedFields: ['id', 'type', 'data'],
            },
            timeout: 10000,
            retryCount: 2,
          },
        ],
        enabled: true,
        schedule: '0 */2 * * * * *', // Every 2 minutes
      },
      {
        name: 'Netsuite API Tests',
        description: 'ERP system integration tests',
        type: 'integration',
        provider: 'netsuite',
        tests: [
          {
            id: 'ns-customer-test',
            name: 'Customer Data Test',
            description: 'Test customer data retrieval',
            type: 'response',
            configuration: {
              endpoint: '/api/v1/customer/{id}',
              method: 'GET',
              headers: {
                'Authorization: 'Bearer mock_token',
              },
              expectedStatus: 200,
              expectedFields: ['id', 'name', 'email', 'company'],
            },
            timeout: 20000,
            retryCount: 2,
          },
          {
            id: 'ns-invoice-test',
            'name: 'Invoice Test',
            description: 'Invoice creation and validation',
            type: 'request',
            configuration: {
              endpoint: '/api/v1/invoices',
              method: 'POST',
              headers: {
                'Content-Type: 'application/json',
                'Authorization: 'Bearer mock_token',
              },
              body: {
                customer_id: 'cust_123',
                invoice_number: 'INV-001',
                amount: 5000,
                due_date: new Date(),
                items: [
                  {
                    id: 'item_1',
                    description: 'Service A',
                    quantity: 10,
                    unit_price: 500,
                  },
                ],
              },
              expectedStatus: 200,
              expectedFields: ['id', 'invoice_number', 'due_date', 'amount', 'items'],
            },
            timeout: 30000,
            retryCount: 2,
          },
          {
            id: 'ns-vendor-test',
            'name: 'Vendor Data Test',
            description: 'Vendor information retrieval',
            type: 'response',
            configuration: {
              endpoint: '/api/v1/vendors',
              method: 'GET',
              headers: {
                'Authorization: 'Bearer mock_token',
              },
              expectedStatus: 200,
              expectedFields: ['id', 'name', 'email', 'phone'],
            },
            timeout: 15000,
            retryCount: 1,
          },
        ],
        enabled: true,
        schedule: '0 */5 * * * * *', // Every 5 minutes
      },
    ];

    for (const testSuite of defaultTestSuites) {
      this.createTestSuite(testSuite);
    }

    this.logger.log(`Initialized ${defaultTestSuites.length} default test suites`);
  }

  @Cron('*/10 * * * * *') // Every 10 minutes
  async performScheduledTests(): Promise<void> {
    this.logger.log('Running scheduled tests');

    const activeTestSuites = Array.from(this.testSuites.values()).filter(suite => suite.enabled);
    
    for (const testSuite of activeTestSuites) {
      const schedule = testSuite.schedule;
      if (schedule) {
        const cronExpression = this.parseCronExpression(schedule);
        const nextRun = this.getNextRunTime(schedule);
        
        if (nextRun <= new Date()) {
          await this.runTestSuite(testSuite.id);
        }
      }
    }
  }

  @Cron('0 0 * * * * *') // Daily at midnight
  async generateDailyTestReport(): Promise<void> {
    this.logger.log('Generating daily test report');

    const statistics = await this.getTestStatistics();

    this.logger.log(`Daily Test Report - Total: ${statistics.totalTestSuites}, Success Rate: ${(statistics.successRate * 100).toFixed(2)}%`);
  }

  private parseCronExpression(cronExpression: string): Date {
    const [min, hour, day, month, dayOfWeek] = cronExpression.split(/\s+/g/);
    const now = new Date();
    
    let nextRun = new Date();
    
    switch (min) {
      case '*':
        nextRun.setMinutes(nextRun.getMinutes());
        break;
      case '0':
        nextRun.setHours(nextRun.getHours());
        break;
      case '1':
        nextRun.setHours(nextRun.getHours() + 1);
        break;
      default:
        nextRun.setMinutes(nextRun.getMinutes());
        break;
    }

    if (day !== '*') {
      nextRun.setDate(nextRun.getDate());
    }

    if (hour !== '*') {
      nextRun.setHours(nextRun.getHours());
    }

    if (day !== '*') {
      nextRun.setDate(nextRun.getDate());
    }

    if (dayOfWeek !== '*') {
      nextRun.setDate(nextRun.getDate());
    }

    return nextRun;
  }

  private getNextRunTime(cronExpression: string): Date {
    const [min, hour, day, dayOfWeek] = cronExpression.split(/\s+/g/);
    const now = new Date();
    
    let nextRun = new Date();
    
    switch (min) {
      case '*':
        nextRun.setMinutes(nextRun.getMinutes() + 1);
        break;
      case '0':
        nextRun.setHours(nextRun.getHours() + 1);
        break;
      default:
        nextRun.setMinutes(nextRun.getMinutes() + 5);
        break;
    }

    if (day !== '*') {
      nextRun.setDate(nextRun.getDate());
    }

    if (hour !== '*') {
      nextRun.setHours(nextRun.getHours() + 1);
    }

    if (dayOfWeek !== '*') {
      nextRun.setDate(nextRun.getDate());
    }

    return nextRun;
  }
}

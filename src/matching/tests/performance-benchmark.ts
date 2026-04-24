import { performance } from 'perf_hooks';

export interface BenchmarkResult {
  testName: string;
  iterations: number;
  totalTime: number;
  averageTime: number;
  minTime: number;
  maxTime: number;
  p50: number;
  p95: number;
  p99: number;
  throughput: number;
  successRate: number;
  errors: string[];
}

export interface LoadTestConfig {
  orderCount: number;
  concurrentUsers: number;
  duration: number; // seconds
  algorithm: string;
  enableLiquidityOptimization: boolean;
  enableAntiManipulation: boolean;
}

export class PerformanceBenchmark {
  private results: BenchmarkResult[] = [];

  async runMatchingBenchmark(
    matchingService: any,
    config: LoadTestConfig
  ): Promise<BenchmarkResult> {
    const iterations = config.orderCount;
    const times: number[] = [];
    let successCount = 0;
    const errors: string[] = [];

    console.log(`Starting matching benchmark: ${iterations} orders, ${config.algorithm} algorithm`);

    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterationStart = performance.now();

      try {
        // Create test order
        const order = {
          id: `bench_order_${i}`,
          userId: `bench_user_${i % config.concurrentUsers}`,
          symbol: 'BENCH',
          type: i % 2 === 0 ? 'BUY' : 'SELL',
          quantity: 100 + Math.random() * 900,
          price: 100 + (Math.random() - 0.5) * 20,
          priority: 'MEDIUM',
          timestamp: Date.now(),
          status: 'PENDING',
          filledQuantity: 0,
          remainingQuantity: 0
        };

        await matchingService.addOrderToQueue(order);

        // Execute matching every 100 orders
        if (i % 100 === 0) {
          const matchingResult = await matchingService.processMatchingRequest({
            symbol: 'BENCH',
            algorithm: config.algorithm,
            maxOrdersPerMatch: 1000,
            timeoutMs: 100,
            enableLiquidityOptimization: config.enableLiquidityOptimization,
            enableAntiManipulation: config.enableAntiManipulation
          });

          if (matchingResult.success) {
            successCount++;
          }
        }

        const iterationEnd = performance.now();
        times.push(iterationEnd - iterationStart);

      } catch (error) {
        errors.push(`Iteration ${i}: ${error.message}`);
      }

      // Progress reporting
      if (i % 1000 === 0 && i > 0) {
        console.log(`Progress: ${i}/${iterations} (${((i / iterations) * 100).toFixed(1)}%)`);
      }
    }

    // Final matching
    try {
      const finalResult = await matchingService.processMatchingRequest({
        symbol: 'BENCH',
        algorithm: config.algorithm,
        maxOrdersPerMatch: 10000,
        timeoutMs: 1000,
        enableLiquidityOptimization: config.enableLiquidityOptimization,
        enableAntiManipulation: config.enableAntiManipulation
      });

      if (finalResult.success) {
        successCount++;
      }
    } catch (error) {
      errors.push(`Final matching: ${error.message}`);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const result = this.calculateBenchmarkResult(
      'Matching Benchmark',
      times,
      totalTime,
      successCount,
      iterations,
      errors
    );

    this.results.push(result);
    return result;
  }

  async runLatencyBenchmark(matchingService: any): Promise<BenchmarkResult> {
    const iterations = 10000;
    const times: number[] = [];
    let successCount = 0;
    const errors: string[] = [];

    console.log(`Starting latency benchmark: ${iterations} iterations`);

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        // Simple matching operation
        await matchingService.processMatchingRequest({
          symbol: 'LATENCY',
          algorithm: 'FIFO',
          maxOrdersPerMatch: 10,
          timeoutMs: 100,
          enableLiquidityOptimization: false,
          enableAntiManipulation: false
        });

        const end = performance.now();
        times.push(end - start);
        successCount++;

      } catch (error) {
        errors.push(`Iteration ${i}: ${error.message}`);
      }
    }

    const totalTime = times.reduce((sum, time) => sum + time, 0);

    const result = this.calculateBenchmarkResult(
      'Latency Benchmark',
      times,
      totalTime,
      successCount,
      iterations,
      errors
    );

    this.results.push(result);
    return result;
  }

  async runThroughputBenchmark(matchingService: any): Promise<BenchmarkResult> {
    const duration = 30; // 30 seconds
    const times: number[] = [];
    let successCount = 0;
    let totalOrders = 0;
    const errors: string[] = [];

    console.log(`Starting throughput benchmark: ${duration} seconds`);

    const startTime = performance.now();
    const endTime = startTime + (duration * 1000);

    let i = 0;
    while (performance.now() < endTime) {
      const iterationStart = performance.now();

      try {
        // Add order and match
        const order = {
          id: `throughput_${i}`,
          userId: 'throughput_user',
          symbol: 'THROUGHPUT',
          type: i % 2 === 0 ? 'BUY' : 'SELL',
          quantity: 100,
          price: 100 + (Math.random() - 0.5) * 10,
          priority: 'MEDIUM',
          timestamp: Date.now(),
          status: 'PENDING',
          filledQuantity: 0,
          remainingQuantity: 100
        };

        await matchingService.addOrderToQueue(order);
        totalOrders++;

        // Match every 50 orders
        if (i % 50 === 0) {
          const result = await matchingService.processMatchingRequest({
            symbol: 'THROUGHPUT',
            algorithm: 'FIFO',
            maxOrdersPerMatch: 100,
            timeoutMs: 100,
            enableLiquidityOptimization: true,
            enableAntiManipulation: true
          });

          if (result.success) {
            successCount++;
          }
        }

        const iterationEnd = performance.now();
        times.push(iterationEnd - iterationStart);

      } catch (error) {
        errors.push(`Iteration ${i}: ${error.message}`);
      }

      i++;
    }

    const actualDuration = performance.now() - startTime;
    const throughput = totalOrders / (actualDuration / 1000); // orders per second

    const result = this.calculateBenchmarkResult(
      'Throughput Benchmark',
      times,
      actualDuration,
      successCount,
      totalOrders,
      errors
    );

    result.throughput = throughput;
    this.results.push(result);
    return result;
  }

  async runConcurrencyBenchmark(matchingService: any): Promise<BenchmarkResult> {
    const concurrentUsers = 100;
    const ordersPerUser = 100;
    const times: number[] = [];
    let successCount = 0;
    const errors: string[] = [];

    console.log(`Starting concurrency benchmark: ${concurrentUsers} users, ${ordersPerUser} orders each`);

    const startTime = performance.now();

    // Create concurrent operations
    const promises = Array.from({ length: concurrentUsers }, async (_, userIndex) => {
      const userTimes: number[] = [];
      
      for (let i = 0; i < ordersPerUser; i++) {
        const iterationStart = performance.now();

        try {
          const order = {
            id: `concurrent_${userIndex}_${i}`,
            userId: `user_${userIndex}`,
            symbol: 'CONCURRENT',
            type: i % 2 === 0 ? 'BUY' : 'SELL',
            quantity: 100,
            price: 100 + (Math.random() - 0.5) * 10,
            priority: 'MEDIUM',
            timestamp: Date.now(),
            status: 'PENDING',
            filledQuantity: 0,
            remainingQuantity: 100
          };

          await matchingService.addOrderToQueue(order);

          const iterationEnd = performance.now();
          userTimes.push(iterationEnd - iterationStart);

        } catch (error) {
          errors.push(`User ${userIndex}, Order ${i}: ${error.message}`);
        }
      }

      return userTimes;
    });

    const allTimes = await Promise.all(promises);
    allTimes.forEach(userTimes => times.push(...userTimes));

    // Execute final matching
    try {
      const result = await matchingService.processMatchingRequest({
        symbol: 'CONCURRENT',
        algorithm: 'FIFO',
        maxOrdersPerMatch: 10000,
        timeoutMs: 1000,
        enableLiquidityOptimization: true,
        enableAntiManipulation: true
      });

      if (result.success) {
        successCount++;
      }
    } catch (error) {
      errors.push(`Final matching: ${error.message}`);
    }

    const endTime = performance.now();
    const totalTime = endTime - startTime;

    const result = this.calculateBenchmarkResult(
      'Concurrency Benchmark',
      times,
      totalTime,
      successCount,
      concurrentUsers * ordersPerUser,
      errors
    );

    this.results.push(result);
    return result;
  }

  async runLiquidityOptimizationBenchmark(matchingService: any): Promise<BenchmarkResult> {
    const iterations = 1000;
    const withoutOptimizationTimes: number[] = [];
    const withOptimizationTimes: number[] = [];
    const errors: string[] = [];

    console.log(`Starting liquidity optimization benchmark: ${iterations} iterations`);

    // Benchmark without optimization
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        await matchingService.processMatchingRequest({
          symbol: 'LIQ_OFF',
          algorithm: 'FIFO',
          maxOrdersPerMatch: 100,
          timeoutMs: 100,
          enableLiquidityOptimization: false,
          enableAntiManipulation: false
        });

        withoutOptimizationTimes.push(performance.now() - start);

      } catch (error) {
        errors.push(`Without opt iteration ${i}: ${error.message}`);
      }
    }

    // Benchmark with optimization
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();

      try {
        await matchingService.processMatchingRequest({
          symbol: 'LIQ_ON',
          algorithm: 'FIFO',
          maxOrdersPerMatch: 100,
          timeoutMs: 100,
          enableLiquidityOptimization: true,
          enableAntiManipulation: false
        });

        withOptimizationTimes.push(performance.now() - start);

      } catch (error) {
        errors.push(`With opt iteration ${i}: ${error.message}`);
      }
    }

    const withoutOptResult = this.calculateBenchmarkResult(
      'Without Liquidity Optimization',
      withoutOptimizationTimes,
      withoutOptimizationTimes.reduce((sum, time) => sum + time, 0),
      withoutOptimizationTimes.length,
      iterations,
      []
    );

    const withOptResult = this.calculateBenchmarkResult(
      'With Liquidity Optimization',
      withOptimizationTimes,
      withOptimizationTimes.reduce((sum, time) => sum + time, 0),
      withOptimizationTimes.length,
      iterations,
      []
    );

    // Compare results
    const improvement = ((withoutOptResult.averageTime - withOptResult.averageTime) / withoutOptResult.averageTime) * 100;

    console.log(`Liquidity optimization performance impact: ${improvement.toFixed(2)}% ${improvement > 0 ? 'improvement' : 'overhead'}`);

    this.results.push(withoutOptResult, withOptResult);
    return withOptResult;
  }

  private calculateBenchmarkResult(
    testName: string,
    times: number[],
    totalTime: number,
    successCount: number,
    iterations: number,
    errors: string[]
  ): BenchmarkResult {
    if (times.length === 0) {
      return {
        testName,
        iterations: 0,
        totalTime: 0,
        averageTime: 0,
        minTime: 0,
        maxTime: 0,
        p50: 0,
        p95: 0,
        p99: 0,
        throughput: 0,
        successRate: 0,
        errors
      };
    }

    times.sort((a, b) => a - b);

    return {
      testName,
      iterations,
      totalTime,
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: times[0],
      maxTime: times[times.length - 1],
      p50: this.getPercentile(times, 50),
      p95: this.getPercentile(times, 95),
      p99: this.getPercentile(times, 99),
      throughput: iterations / (totalTime / 1000), // operations per second
      successRate: (successCount / iterations) * 100,
      errors
    };
  }

  private getPercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  generateReport(): string {
    let report = '# Performance Benchmark Report\n\n';
    
    report += `Generated: ${new Date().toISOString()}\n\n`;

    for (const result of this.results) {
      report += `## ${result.testName}\n\n`;
      report += `- **Iterations**: ${result.iterations.toLocaleString()}\n`;
      report += `- **Total Time**: ${result.totalTime.toFixed(2)}ms\n`;
      report += `- **Average Time**: ${result.averageTime.toFixed(4)}ms\n`;
      report += `- **Min Time**: ${result.minTime.toFixed(4)}ms\n`;
      report += `- **Max Time**: ${result.maxTime.toFixed(4)}ms\n`;
      report += `- **P50**: ${result.p50.toFixed(4)}ms\n`;
      report += `- **P95**: ${result.p95.toFixed(4)}ms\n`;
      report += `- **P99**: ${result.p99.toFixed(4)}ms\n`;
      report += `- **Throughput**: ${result.throughput.toFixed(2)} ops/sec\n`;
      report += `- **Success Rate**: ${result.successRate.toFixed(2)}%\n`;
      
      if (result.errors.length > 0) {
        report += `- **Errors**: ${result.errors.length}\n`;
        report += `  - First few errors: ${result.errors.slice(0, 3).join(', ')}\n`;
      }
      
      report += '\n';
    }

    // Performance analysis
    report += '## Performance Analysis\n\n';
    
    const latencyResult = this.results.find(r => r.testName.includes('Latency'));
    if (latencyResult) {
      report += `### Latency Performance\n`;
      report += `- P95 Latency: ${latencyResult.p95.toFixed(4)}ms (Target: <0.1ms)\n`;
      report += `- P99 Latency: ${latencyResult.p99.toFixed(4)}ms\n`;
      report += `- Status: ${latencyResult.p95 < 0.1 ? '✅ PASS' : '❌ FAIL'}\n\n`;
    }

    const throughputResult = this.results.find(r => r.testName.includes('Throughput'));
    if (throughputResult) {
      report += `### Throughput Performance\n`;
      report += `- Peak Throughput: ${throughputResult.throughput.toFixed(2)} ops/sec (Target: >100,000 ops/sec)\n`;
      report += `- Status: ${throughputResult.throughput > 100000 ? '✅ PASS' : '❌ FAIL'}\n\n`;
    }

    const matchingResult = this.results.find(r => r.testName.includes('Matching'));
    if (matchingResult) {
      report += `### Matching Performance\n`;
      report += `- Average Processing Time: ${matchingResult.averageTime.toFixed(4)}ms\n`;
      report += `- Success Rate: ${matchingResult.successRate.toFixed(2)}%\n`;
      report += `- Status: ${matchingResult.successRate > 95 ? '✅ PASS' : '❌ FAIL'}\n\n`;
    }

    // Recommendations
    report += '## Recommendations\n\n';
    
    if (latencyResult && latencyResult.p95 > 0.1) {
      report += `- **Latency Optimization**: P95 latency exceeds 100 microseconds target. Consider optimizing algorithms and reducing computational overhead.\n`;
    }

    if (throughputResult && throughputResult.throughput < 100000) {
      report += `- **Throughput Enhancement**: Current throughput below 100k ops/sec target. Consider implementing more efficient data structures and parallel processing.\n`;
    }

    const avgSuccessRate = this.results.reduce((sum, r) => sum + r.successRate, 0) / this.results.length;
    if (avgSuccessRate < 99) {
      report += `- **Reliability Improvement**: Success rate below 99%. Review error handling and system stability.\n`;
    }

    report += `- **Monitoring**: Implement continuous performance monitoring to track these metrics in production.\n`;
    report += `- **Load Testing**: Regularly run these benchmarks to ensure performance doesn't degrade over time.\n`;

    return report;
  }

  getResults(): BenchmarkResult[] {
    return [...this.results];
  }

  clearResults(): void {
    this.results = [];
  }
}

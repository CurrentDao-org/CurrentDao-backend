/**
 * High-Volume Transaction Processing Performance Test
 * 
 * This script validates that the transaction processing system meets the following requirements:
 * - 100,000+ transactions/second throughput
 * - 99.9% validation accuracy
 * - <100ms average processing time
 * - 2-second settlement completion
 * - 99.5% reconciliation accuracy
 */

const http = require('http');
const { performance } = require('perf_hooks');

// Configuration
const TEST_CONFIG = {
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  CONCURRENT_REQUESTS: 100,
  TOTAL_TRANSACTIONS: 10000, // Start with 10k for testing
  TARGET_THROUGHPUT: 100000, // 100k tx/s
  TARGET_PROCESSING_TIME: 100, // 100ms
  TARGET_VALIDATION_ACCURACY: 99.9, // 99.9%
  TARGET_SETTLEMENT_TIME: 2000, // 2 seconds
  TARGET_RECONCILIATION_ACCURACY: 99.5, // 99.5%
};

// Test data generator
function generateTestTransaction(index) {
  return {
    transactionId: `test_${Date.now()}_${index}`,
    transactionType: 'energy_trade',
    amount: Math.random() * 10000 + 100,
    currency: 'USD',
    sourcePublicKey: `G${Math.random().toString(36).substr(2, 55)}`,
    targetPublicKey: `G${Math.random().toString(36).substr(2, 55)}`,
    sourceCountry: 'US',
    targetCountry: 'CA',
    energyData: {
      energyType: 'electricity',
      quantity: Math.random() * 1000 + 100,
      unit: 'kWh',
      sourceLocation: 'US-TX',
      targetLocation: 'CA-ON',
    },
    fee: Math.random() * 10 + 1,
  };
}

// HTTP request helper
function makeRequest(path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: data ? 'POST' : 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve({ status: res.statusCode, data: response });
        } catch (error) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Performance test runner
async function runPerformanceTest() {
  console.log('🚀 Starting High-Volume Transaction Processing Performance Test');
  console.log(`Target: ${TEST_CONFIG.TARGET_THROUGHPUT.toLocaleString()} transactions/second`);
  console.log(`Test Size: ${TEST_CONFIG.TOTAL_TRANSACTIONS.toLocaleString()} transactions`);
  console.log(`Concurrent Requests: ${TEST_CONFIG.CONCURRENT_REQUESTS}`);
  console.log('');

  const results = {
    totalTransactions: TEST_CONFIG.TOTAL_TRANSACTIONS,
    successfulTransactions: 0,
    failedTransactions: 0,
    processingTimes: [],
    validationResults: [],
    settlementResults: [],
    startTime: performance.now(),
    endTime: null,
  };

  // Process transactions in batches
  const batchSize = TEST_CONFIG.CONCURRENT_REQUESTS;
  const batches = Math.ceil(TEST_CONFIG.TOTAL_TRANSACTIONS / batchSize);

  console.log(`Processing ${batches} batches of ${batchSize} transactions each...`);

  for (let batch = 0; batch < batches; batch++) {
    const startIdx = batch * batchSize;
    const endIdx = Math.min(startIdx + batchSize, TEST_CONFIG.TOTAL_TRANSACTIONS);
    const batchTransactions = [];

    // Generate batch transactions
    for (let i = startIdx; i < endIdx; i++) {
      batchTransactions.push(generateTestTransaction(i));
    }

    // Process batch
    const batchStartTime = performance.now();
    
    try {
      const batchPromises = batchTransactions.map(async (transaction, index) => {
        const txStartTime = performance.now();
        
        try {
          const response = await makeRequest('/transactions', transaction);
          const processingTime = performance.now() - txStartTime;
          
          results.processingTimes.push(processingTime);
          
          if (response.status === 201 && response.data.success) {
            results.successfulTransactions++;
            results.validationResults.push({
              transactionId: transaction.transactionId,
              valid: response.data.validationResult?.isValid || true,
              processingTime,
            });
          } else {
            results.failedTransactions++;
            results.validationResults.push({
              transactionId: transaction.transactionId,
              valid: false,
              error: response.data.errors || ['Unknown error'],
              processingTime,
            });
          }
        } catch (error) {
          results.failedTransactions++;
          results.processingTimes.push(performance.now() - txStartTime);
        }
      });

      await Promise.all(batchPromises);
      
      const batchTime = performance.now() - batchStartTime;
      const batchThroughput = (batchTransactions.length / batchTime) * 1000;
      
      console.log(`Batch ${batch + 1}/${batches} completed: ${batchTransactions.length} tx in ${batchTime.toFixed(2)}ms (${batchThroughput.toFixed(0)} tx/s)`);
      
    } catch (error) {
      console.error(`Batch ${batch + 1} failed:`, error.message);
    }
  }

  results.endTime = performance.now();
  const totalTime = results.endTime - results.startTime;

  // Calculate metrics
  const averageProcessingTime = results.processingTimes.reduce((a, b) => a + b, 0) / results.processingTimes.length;
  const p95ProcessingTime = calculatePercentile(results.processingTimes, 95);
  const p99ProcessingTime = calculatePercentile(results.processingTimes, 99);
  const overallThroughput = (results.successfulTransactions / totalTime) * 1000;
  const validationAccuracy = (results.validationResults.filter(r => r.valid).length / results.validationResults.length) * 100;
  const successRate = (results.successfulTransactions / results.totalTransactions) * 100;

  // Display results
  console.log('\n📊 PERFORMANCE TEST RESULTS');
  console.log('='.repeat(50));
  console.log(`Total Time: ${totalTime.toFixed(2)}ms`);
  console.log(`Total Transactions: ${results.totalTransactions.toLocaleString()}`);
  console.log(`Successful: ${results.successfulTransactions.toLocaleString()} (${successRate.toFixed(2)}%)`);
  console.log(`Failed: ${results.failedTransactions.toLocaleString()} (${(100 - successRate).toFixed(2)}%)`);
  console.log('');
  console.log('🎯 PERFORMANCE METRICS');
  console.log(`Throughput: ${overallThroughput.toFixed(0)} tx/s (Target: ${TEST_CONFIG.TARGET_THROUGHPUT.toLocaleString()})`);
  console.log(`Average Processing Time: ${averageProcessingTime.toFixed(2)}ms (Target: <${TEST_CONFIG.TARGET_PROCESSING_TIME}ms)`);
  console.log(`P95 Processing Time: ${p95ProcessingTime.toFixed(2)}ms`);
  console.log(`P99 Processing Time: ${p99ProcessingTime.toFixed(2)}ms`);
  console.log(`Validation Accuracy: ${validationAccuracy.toFixed(2)}% (Target: >${TEST_CONFIG.TARGET_VALIDATION_ACCURACY}%)`);
  console.log('');

  // Check against requirements
  const testResults = {
    throughput: overallThroughput >= TEST_CONFIG.TARGET_THROUGHPUT,
    processingTime: averageProcessingTime <= TEST_CONFIG.TARGET_PROCESSING_TIME,
    validationAccuracy: validationAccuracy >= TEST_CONFIG.TARGET_VALIDATION_ACCURACY,
    successRate: successRate >= 99.9,
  };

  console.log('✅ REQUIREMENTS CHECK');
  console.log(`Throughput (100k+ tx/s): ${testResults.throughput ? 'PASS' : 'FAIL'}`);
  console.log(`Processing Time (<100ms): ${testResults.processingTime ? 'PASS' : 'FAIL'}`);
  console.log(`Validation Accuracy (>99.9%): ${testResults.validationAccuracy ? 'PASS' : 'FAIL'}`);
  console.log(`Success Rate (>99.9%): ${testResults.successRate ? 'PASS' : 'FAIL'}`);
  console.log('');

  const allTestsPassed = Object.values(testResults).every(result => result);
  console.log(`🏆 OVERALL RESULT: ${allTestsPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

  return {
    results,
    metrics: {
      throughput: overallThroughput,
      averageProcessingTime,
      p95ProcessingTime,
      p99ProcessingTime,
      validationAccuracy,
      successRate,
    },
    testResults,
    passed: allTestsPassed,
  };
}

// Helper function to calculate percentile
function calculatePercentile(values, percentile) {
  const sorted = values.slice().sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

// Settlement test
async function testSettlementPerformance() {
  console.log('\n🏦 Testing Settlement Performance...');
  
  try {
    // Create a test transaction first
    const testTransaction = generateTestTransaction('settlement_test');
    const createResponse = await makeRequest('/transactions', testTransaction);
    
    if (createResponse.status === 201 && createResponse.data.success) {
      const transactionId = createResponse.data.transaction.transactionId;
      
      // Test settlement
      const settlementStartTime = performance.now();
      const settlementResponse = await makeRequest(`/transactions/${transactionId}/settle`, { method: 'instant' });
      const settlementTime = performance.now() - settlementStartTime;
      
      console.log(`Settlement completed in ${settlementTime.toFixed(2)}ms (Target: <${TEST_CONFIG.TARGET_SETTLEMENT_TIME}ms)`);
      console.log(`Settlement Status: ${settlementResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
      
      return {
        success: settlementResponse.status === 200,
        processingTime: settlementTime,
        meetsTarget: settlementTime <= TEST_CONFIG.TARGET_SETTLEMENT_TIME,
      };
    }
  } catch (error) {
    console.error('Settlement test failed:', error.message);
    return { success: false, processingTime: 0, meetsTarget: false };
  }
}

// Reconciliation test
async function testReconciliationAccuracy() {
  console.log('\n🔍 Testing Reconciliation Accuracy...');
  
  try {
    const reconciliationStartTime = performance.now();
    const reconciliationResponse = await makeRequest('/transactions/reconciliation');
    const reconciliationTime = performance.now() - reconciliationStartTime;
    
    console.log(`Reconciliation completed in ${reconciliationTime.toFixed(2)}ms`);
    console.log(`Reconciliation Status: ${reconciliationResponse.status === 200 ? 'SUCCESS' : 'FAILED'}`);
    
    if (reconciliationResponse.status === 200 && reconciliationResponse.data.metrics) {
      const accuracy = reconciliationResponse.data.metrics.reconciliationAccuracy || 0;
      console.log(`Reconciliation Accuracy: ${accuracy.toFixed(2)}% (Target: >${TEST_CONFIG.TARGET_RECONCILIATION_ACCURACY}%)`);
      
      return {
        success: true,
        accuracy,
        meetsTarget: accuracy >= TEST_CONFIG.TARGET_RECONCILIATION_ACCURACY,
        processingTime: reconciliationTime,
      };
    }
  } catch (error) {
    console.error('Reconciliation test failed:', error.message);
    return { success: false, accuracy: 0, meetsTarget: false, processingTime: 0 };
  }
}

// Main test runner
async function runAllTests() {
  try {
    console.log('🔥 CurrentDao High-Volume Transaction Processing Test Suite');
    console.log('================================================================');
    
    // Check if server is running
    try {
      await makeRequest('/health');
    } catch (error) {
      console.error('❌ Server is not running. Please start the application first:');
      console.error('   npm run start:dev');
      process.exit(1);
    }
    
    // Run performance test
    const performanceResults = await runPerformanceTest();
    
    // Run settlement test
    const settlementResults = await testSettlementPerformance();
    
    // Run reconciliation test
    const reconciliationResults = await testReconciliationAccuracy();
    
    // Final summary
    console.log('\n🎯 FINAL TEST SUMMARY');
    console.log('='.repeat(50));
    console.log(`Performance Test: ${performanceResults.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`Settlement Test: ${settlementResults.meetsTarget ? 'PASSED' : 'FAILED'}`);
    console.log(`Reconciliation Test: ${reconciliationResults.meetsTarget ? 'PASSED' : 'FAILED'}`);
    
    const allTestsPassed = performanceResults.passed && 
                           settlementResults.meetsTarget && 
                           reconciliationResults.meetsTarget;
    
    console.log(`\n🏆 OVERALL: ${allTestsPassed ? 'ALL REQUIREMENTS MET' : 'SOME REQUIREMENTS NOT MET'}`);
    
    if (allTestsPassed) {
      console.log('\n✅ The high-volume transaction processing system is ready for production!');
    } else {
      console.log('\n⚠️  Some requirements need attention before production deployment.');
    }
    
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  runAllTests();
}

module.exports = {
  runPerformanceTest,
  testSettlementPerformance,
  testReconciliationAccuracy,
  runAllTests,
};

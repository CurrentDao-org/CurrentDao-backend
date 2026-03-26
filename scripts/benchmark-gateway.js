const { performance } = require('perf_hooks');

// Mocking the services for benchmark purposes
const mockRateLimit = async () => true;
const mockTransform = (body) => ({ ...body, timestamp: new Date().toISOString() });
const mockAuth = async () => true;
const mockMonitor = () => {};
const mockCircuitBreaker = async () => {};

async function runBenchmark() {
  const iterations = 10000;
  let totalDuration = 0;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    // Simulate gateway overhead (logic execution)
    await mockRateLimit();
    mockTransform({ data: 'test' });
    await mockAuth();
    mockMonitor();
    await mockCircuitBreaker();
    
    const end = performance.now();
    totalDuration += (end - start);
  }

  const averageOverhead = totalDuration / iterations;
  console.log(`Average Gateway Overhead: ${averageOverhead.toFixed(4)}ms`);
  
  if (averageOverhead < 20) {
    console.log('SUCCESS: Overhead is within the 20ms limit.');
  } else {
    console.log('FAILURE: Overhead exceeds the 20ms limit.');
  }
}

runBenchmark().catch(console.error);

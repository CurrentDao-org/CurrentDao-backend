const fs = require('fs');
const path = require('path');

const stressTestServicePath = path.join(
  __dirname,
  '..',
  'src',
  'risk',
  'testing',
  'stress-test.service.ts',
);

const source = fs.readFileSync(stressTestServicePath, 'utf8');
const supportedScenarios = Array.from(
  source.matchAll(/case '([^']+)'/g),
  (match) => match[1],
);

const requiredScenarios = [
  'market_crash',
  'interest_rate_shock',
  'currency_crisis',
  'commodity_price_shock',
  'credit_crisis',
  'liquidity_crisis',
  'operational_failure',
  'regulatory_change',
  'geopolitical_crisis',
  'pandemic',
];

const missingScenarios = requiredScenarios.filter(
  (scenario) => !supportedScenarios.includes(scenario),
);

console.log('Supported stress scenarios:', supportedScenarios.length);

if (missingScenarios.length > 0) {
  console.error('Missing required stress scenarios:', missingScenarios.join(', '));
  process.exit(1);
}

if (supportedScenarios.length < requiredScenarios.length) {
  console.error(
    `Insufficient stress test scenarios. Required: ${requiredScenarios.length}, Found: ${supportedScenarios.length}`,
  );
  process.exit(1);
}

console.log('Stress test scenarios validated successfully');
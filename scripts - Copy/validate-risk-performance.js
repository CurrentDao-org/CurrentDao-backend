require('reflect-metadata');
require('ts-node/register/transpile-only');

const {
  VarCalculatorService,
} = require('../src/risk/calculations/var-calculator.service');

const mockRiskRepository = {
  findOne: async () => null,
  update: async () => undefined,
};

async function main() {
  const service = new VarCalculatorService(mockRiskRepository);
  const startedAt = Date.now();

  const result = await service.calculateVar({
    portfolioId: 'performance-check',
    method: 'parametric',
    confidence: 0.95,
    timeHorizon: 1,
  });

  const elapsedMs = Date.now() - startedAt;
  console.log(
    `VaR performance check completed in ${elapsedMs}ms with value ${result.varValue}`,
  );

  if (elapsedMs > 200) {
    console.error(
      `VaR performance threshold exceeded: expected <= 200ms, got ${elapsedMs}ms`,
    );
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Performance validation failed', error);
  process.exit(1);
});
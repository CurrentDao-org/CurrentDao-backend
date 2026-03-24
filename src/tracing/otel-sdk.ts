import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { NestInstrumentation } from '@opentelemetry/instrumentation-nestjs-core';
import { TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import * as process from 'process';

/**
 * Configure OpenTelemetry SDK
 */
const otlpUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
const serviceName = process.env.SERVICE_NAME || 'currentdao-backend';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
const samplingRatio = parseFloat(process.env.OTEL_TRACING_SAMPLING_RATIO || '1.0');

const traceExporter = new OTLPTraceExporter({
  url: otlpUrl,
});

const prometheusExporter = new PrometheusExporter({
  port: 9464, // Default port for prometheus exporter
});

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: serviceName,
    [ATTR_SERVICE_VERSION]: serviceVersion,
  }),
  traceExporter,
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter({
      url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT || 'http://localhost:4318/v1/metrics',
    }),
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new NestInstrumentation(),
  ],
  sampler: new TraceIdRatioBasedSampler(samplingRatio), // Sampling strategy
});

// Since NodeSDK doesn't easily support multiple metric readers yet, 
// let's manually start Prometheus if needed.
prometheusExporter.startServer().then(() => {
  console.log('Prometheus metrics server started on port 9464');
});

/**
 * Graceful shutdown
 */
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch((error) => console.log('Error terminating tracing', error))
    .finally(() => process.exit(0));
});

export default sdk;
export { prometheusExporter };

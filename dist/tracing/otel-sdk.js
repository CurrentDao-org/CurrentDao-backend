"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prometheusExporter = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_trace_otlp_http_1 = require("@opentelemetry/exporter-trace-otlp-http");
const exporter_metrics_otlp_http_1 = require("@opentelemetry/exporter-metrics-otlp-http");
const sdk_metrics_1 = require("@opentelemetry/sdk-metrics");
const instrumentation_http_1 = require("@opentelemetry/instrumentation-http");
const instrumentation_express_1 = require("@opentelemetry/instrumentation-express");
const instrumentation_nestjs_core_1 = require("@opentelemetry/instrumentation-nestjs-core");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const otlpUrl = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';
const serviceName = process.env.SERVICE_NAME || 'currentdao-backend';
const serviceVersion = process.env.SERVICE_VERSION || '1.0.0';
const samplingRatio = parseFloat(process.env.OTEL_TRACING_SAMPLING_RATIO || '1.0');
const isTestEnvironment = process.env.NODE_ENV === 'test';
const traceExporter = new exporter_trace_otlp_http_1.OTLPTraceExporter({
    url: otlpUrl,
});
const prometheusExporter = new exporter_prometheus_1.PrometheusExporter({
    port: 9464,
});
exports.prometheusExporter = prometheusExporter;
const sdk = new sdk_node_1.NodeSDK({
    resource: new resources_1.Resource({
        [semantic_conventions_1.ATTR_SERVICE_NAME]: serviceName,
        [semantic_conventions_1.ATTR_SERVICE_VERSION]: serviceVersion,
    }),
    traceExporter,
    metricReader: new sdk_metrics_1.PeriodicExportingMetricReader({
        exporter: new exporter_metrics_otlp_http_1.OTLPMetricExporter({
            url: process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
                'http://localhost:4318/v1/metrics',
        }),
    }),
    instrumentations: [
        new instrumentation_http_1.HttpInstrumentation(),
        new instrumentation_express_1.ExpressInstrumentation(),
        new instrumentation_nestjs_core_1.NestInstrumentation(),
    ],
    sampler: new sdk_trace_base_1.TraceIdRatioBasedSampler(samplingRatio),
});
if (!isTestEnvironment) {
    void prometheusExporter.startServer().then(() => {
        console.log('Prometheus metrics server started on port 9464');
    });
}
if (!isTestEnvironment && typeof process.on === 'function') {
    process.on('SIGTERM', () => {
        sdk
            .shutdown()
            .then(() => console.log('Tracing terminated'))
            .catch((error) => console.log('Error terminating tracing', error))
            .finally(() => process.exit(0));
    });
}
exports.default = sdk;
//# sourceMappingURL=otel-sdk.js.map
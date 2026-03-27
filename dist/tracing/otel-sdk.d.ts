import { NodeSDK } from '@opentelemetry/sdk-node';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
declare const prometheusExporter: PrometheusExporter;
declare const sdk: NodeSDK;
export default sdk;
export { prometheusExporter };

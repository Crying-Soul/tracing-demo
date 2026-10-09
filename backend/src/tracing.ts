// загружается через node --import, до кода приложения
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { FastifyOtelInstrumentation } from '@fastify/otel';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';
import { KafkaJsInstrumentation } from '@opentelemetry/instrumentation-kafkajs';
import { RuntimeNodeInstrumentation } from '@opentelemetry/instrumentation-runtime-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';

export const otelSDK = new NodeSDK({
  spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter())],
  metricReader: new PeriodicExportingMetricReader({
    exporter: new OTLPMetricExporter(),
    exportIntervalMillis: 15_000,
  }),
  instrumentations: [
    new HttpInstrumentation(),
    new FastifyOtelInstrumentation({ registerOnInitialization: true }),
    new PgInstrumentation(),
    new KafkaJsInstrumentation(),
    new RuntimeNodeInstrumentation(),
  ],
});

otelSDK.start();

export async function shutdownTelemetry(): Promise<void> {
  try {
    await otelSDK.shutdown();
  } catch (err) {
    console.error('Error shutting down OpenTelemetry SDK', err);
  }
}

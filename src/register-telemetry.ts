import { context, propagation, trace } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { BatchSpanProcessor, TracerProvider } from '@opentelemetry/sdk-trace';
import { buildTelemetryResource } from './build-telemetry-resource';
import { createTraceExporter } from './create-trace-exporter';
import { createTraceSampler } from './create-trace-sampler';
import { OutgoingOnlyPropagator } from './outgoing-only-propagator';
import { readTraceSampleRate } from './read-trace-sample-rate';
import { resolveTelemetryProvider } from './resolve-telemetry-provider';
import type { RegisterTelemetryOptions, TelemetryHandle } from './types';

/**
 * Sets up tracing for the process, once, before the app handles requests:
 * the tracer provider (resource, sampler, the cloud's exporter), the async
 * context and the W3C traceparent propagator, registered globally so
 * NestJS, Next.js and our clients all see the same trace.
 *
 * Next.js: call it from instrumentation.ts (Node.js runtime only), with
 * continueIncomingTraces: false.
 */
export function registerTelemetry(
  options: RegisterTelemetryOptions = {},
): TelemetryHandle {
  const provider = resolveTelemetryProvider(options.provider);
  const serviceName =
    options.serviceName ||
    process.env.WORKER_NAME ||
    process.env.SERVICE_NAME ||
    'unknown-service';

  const exporter = createTraceExporter({
    provider,
    endpoint: options.endpoint,
    onExportError:
      options.onExportError ?? ((message) => console.warn(message)),
  });

  const tracerProvider = new TracerProvider({
    resource: buildTelemetryResource({
      serviceName,
      serviceVersion: options.serviceVersion || '1.0.0',
      provider,
    }),
    sampler: createTraceSampler(readTraceSampleRate()),
    spanProcessors: exporter ? [new BatchSpanProcessor({ exporter })] : [],
  });

  // What NodeTracerProvider.register() did before SDK 3
  trace.setGlobalTracerProvider(tracerProvider);
  context.setGlobalContextManager(
    new AsyncLocalStorageContextManager().enable(),
  );
  propagation.setGlobalPropagator(
    options.continueIncomingTraces === false
      ? new OutgoingOnlyPropagator()
      : new W3CTraceContextPropagator(),
  );

  return {
    forceFlush: () => tracerProvider.forceFlush(),
    shutdown: () => tracerProvider.shutdown(),
  };
}

import { describe, it, expect, rs, beforeEach, afterEach } from '@rstest/core';
import { ROOT_CONTEXT, context, propagation, trace } from '@opentelemetry/api';
import { InMemorySpanExporter } from '@opentelemetry/sdk-trace';

const { mockCreateTraceExporter } = rs.hoisted(() => ({
  mockCreateTraceExporter: rs.fn(),
}));

rs.mock('./create-trace-exporter', () => ({
  createTraceExporter: mockCreateTraceExporter,
}));

import { registerTelemetry } from './register-telemetry';

describe('registerTelemetry', () => {
  let exporter: InMemorySpanExporter;
  const saved = {
    SERVICE_NAME: process.env.SERVICE_NAME,
    WORKER_NAME: process.env.WORKER_NAME,
    TELEMETRY_PROVIDER: process.env.TELEMETRY_PROVIDER,
  };

  beforeEach(() => {
    rs.clearAllMocks();
    exporter = new InMemorySpanExporter();
    mockCreateTraceExporter.mockReturnValue(exporter);
    delete process.env.WORKER_NAME;
    delete process.env.TELEMETRY_PROVIDER;
    process.env.SERVICE_NAME = 'auth-service';
  });

  afterEach(() => {
    trace.disable();
    context.disable();
    propagation.disable();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  describe('Standard use cases', () => {
    it('should record spans for the service and send them', async () => {
      const telemetry = registerTelemetry({ serviceVersion: '2.0.0' });

      trace.getTracer('test').startSpan('GET /x').end();
      await telemetry.forceFlush();

      const [span] = exporter.getFinishedSpans();
      expect(span.name).toBe('GET /x');
      expect(span.resource.attributes['service.name']).toBe('auth-service');
      expect(span.resource.attributes['service.version']).toBe('2.0.0');
      await telemetry.shutdown();
    });

    it('should carry the trace in a W3C traceparent, without baggage', async () => {
      const telemetry = registerTelemetry();
      const span = trace.getTracer('test').startSpan('GET /x');
      const headers: Record<string, string> = {};

      context.with(trace.setSpan(context.active(), span), () =>
        propagation.inject(context.active(), headers),
      );
      span.end();

      expect(Object.keys(headers)).toEqual(['traceparent']);
      expect(headers.traceparent).toBe(
        `00-${span.spanContext().traceId}-${span.spanContext().spanId}-01`,
      );
      await telemetry.shutdown();
    });
  });

  describe('Edge cases', () => {
    it("should name a worker's spans after the worker and pick the cloud", async () => {
      process.env.WORKER_NAME = 'auth-worker';
      process.env.TELEMETRY_PROVIDER = 'gcp';
      const onExportError = rs.fn();

      const telemetry = registerTelemetry({ onExportError });
      trace.getTracer('test').startSpan('job').end();
      await telemetry.forceFlush();

      expect(
        exporter.getFinishedSpans()[0].resource.attributes['service.name'],
      ).toBe('auth-worker');
      expect(mockCreateTraceExporter).toHaveBeenCalledWith({
        provider: 'gcp',
        endpoint: undefined,
        onExportError,
      });
      await telemetry.shutdown();
    });

    it("should ignore a client's traceparent when told not to continue incoming traces", async () => {
      const telemetry = registerTelemetry({ continueIncomingTraces: false });
      const incoming = propagation.extract(ROOT_CONTEXT, {
        traceparent: '00-5759e988bd862e3fe1be46a994272793-53995c3f42cd8ad8-01',
      });

      const span = trace.getTracer('test').startSpan('GET /', {}, incoming);
      const headers: Record<string, string> = {};
      context.with(trace.setSpan(ROOT_CONTEXT, span), () =>
        propagation.inject(context.active(), headers),
      );
      span.end();

      // A trace of its own, still passed on to the calls it makes
      expect(span.spanContext().traceId).not.toBe(
        '5759e988bd862e3fe1be46a994272793',
      );
      expect(headers.traceparent).toBe(
        `00-${span.spanContext().traceId}-${span.spanContext().spanId}-01`,
      );
      await telemetry.shutdown();
    });

    it('should still continue a trace when there is nowhere to send spans', async () => {
      mockCreateTraceExporter.mockReturnValue(undefined);
      const telemetry = registerTelemetry({ provider: 'azure' });
      const parent = propagation.extract(ROOT_CONTEXT, {
        traceparent: '00-5759e988bd862e3fe1be46a994272793-53995c3f42cd8ad8-01',
      });

      const span = trace.getTracer('test').startSpan('GET /x', {}, parent);

      expect(span.spanContext().traceId).toBe(
        '5759e988bd862e3fe1be46a994272793',
      );
      span.end();
      await telemetry.shutdown();
    });
  });
});
